import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve, sep } from "node:path";
import { canonicalJson, sha256 } from "../canonical";
import { mathSourceById } from "../math-sources";
import {
  createSourceAdapterBundle,
  sourceAdapterBundleSchema,
  sourceNativeRecordSchema,
  sourceNativeRecordsRoot,
  type SourceAdapterBundle,
  type SourceAdapterCoverage,
  type SourceAdapterDisclosure,
  type SourceAdapterIdentity,
  type SourceAdapterInput,
  type SourceAdapterRevision,
  type SourceNativeRecord,
} from "./contracts";

export interface SourceAdapterOutput {
  source_id: string;
  adapter: SourceAdapterIdentity;
  revision: SourceAdapterRevision;
  inputs: SourceAdapterInput[];
  records: SourceNativeRecord[];
  coverage: SourceAdapterCoverage;
  omissions: SourceAdapterDisclosure[];
  loss: SourceAdapterDisclosure[];
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedRecords(
  records: ReadonlyArray<SourceNativeRecord>,
): SourceNativeRecord[] {
  const sorted = [...records].sort((left, right) => (
    compareText(left.source_id, right.source_id)
    || compareText(left.native_id, right.native_id)
  ));
  const identities = new Set<string>();
  for (const record of sorted) {
    sourceNativeRecordSchema.parse(record);
    const identity = `${record.source_id}\0${record.native_id}`;
    if (identities.has(identity)) {
      throw new Error(`duplicate source-native identity ${record.source_id}/${record.native_id}`);
    }
    identities.add(identity);
  }
  return sorted;
}

function chunkName(index: number): string {
  return `chunks/${String(index).padStart(6, "0")}.ndjson`;
}

function withinDirectory(directory: string, relativePath: string): string {
  const root = resolve(directory);
  const candidate = resolve(root, relativePath);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    throw new Error(`bundle path escapes output directory: ${relativePath}`);
  }
  return candidate;
}

export async function writeSourceAdapterBundle(
  outputDirectory: string,
  output: SourceAdapterOutput,
  options: { chunkRecordLimit?: number } = {},
): Promise<SourceAdapterBundle> {
  const chunkRecordLimit = options.chunkRecordLimit ?? 1_000;
  if (!Number.isSafeInteger(chunkRecordLimit) || chunkRecordLimit <= 0) {
    throw new Error("chunk record limit must be a positive integer");
  }
  try {
    await stat(outputDirectory);
    throw new Error(`source-adapter output already exists: ${outputDirectory}`);
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && (error as Error & { code?: string }).code === "ENOENT"
    ) {
      // Expected: bundle writes are immutable and never replace an existing path.
    } else {
      throw error;
    }
  }

  const records = sortedRecords(output.records);
  const source = mathSourceById(output.source_id);
  if (source.adapter.mode === "repository_local") {
    throw new Error(`${output.source_id}: Repository-local sources do not emit adapter bundles`);
  }
  if (
    source.adapter.adapter_id !== output.adapter.adapter_id
    || source.adapter.version !== output.adapter.version
  ) {
    throw new Error(`${output.source_id}: adapter output does not match its source declaration`);
  }
  if (records.some(({ source_id }) => source_id !== output.source_id)) {
    throw new Error("source-adapter output contains records from another source");
  }
  if (output.coverage.emitted_record_count !== records.length) {
    throw new Error("source-adapter coverage does not match emitted records");
  }

  const parent = dirname(resolve(outputDirectory));
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(join(parent, ".vela-source-adapter-"));
  try {
    await mkdir(join(staging, "chunks"), { recursive: true });
    const chunks = [];
    for (let offset = 0; offset < records.length; offset += chunkRecordLimit) {
      const chunkRecords = records.slice(offset, offset + chunkRecordLimit);
      const bytes = Buffer.from(
        `${chunkRecords.map((record) => canonicalJson(record)).join("\n")}\n`,
        "utf8",
      );
      const path = chunkName(chunks.length);
      await writeFile(withinDirectory(staging, path), bytes, { flag: "wx" });
      chunks.push({
        path,
        record_count: chunkRecords.length,
        byte_length: bytes.byteLength,
        content_root: sha256(bytes),
        first_native_id: chunkRecords[0].native_id,
        last_native_id: chunkRecords.at(-1)!.native_id,
      });
    }
    const bundle = createSourceAdapterBundle({
      schema: "vela.source-adapter-bundle.v2",
      source_id: output.source_id,
      declaration_root: source.declaration_root,
      acquisition_mode: source.adapter.mode,
      adapter: output.adapter,
      revision: output.revision,
      inputs: [...output.inputs].sort((left, right) => (
        compareText(left.input_id, right.input_id)
      )),
      output: {
        format: "application/x-ndjson; schema=vela.source-native-record.v1",
        chunk_record_limit: chunkRecordLimit,
        record_count: records.length,
        records_root: sourceNativeRecordsRoot(records),
        chunks_root: sha256(canonicalJson(chunks)),
        chunks,
      },
      coverage: output.coverage,
      omissions: output.omissions,
      loss: output.loss,
    });
    await writeFile(
      join(staging, "manifest.json"),
      `${canonicalJson(bundle)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    await rename(staging, resolve(outputDirectory));
    return bundle;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export interface VerifiedSourceAdapterBundle {
  bundle: SourceAdapterBundle;
  records: SourceNativeRecord[];
}

export interface StreamVerifiedSourceAdapterBundle {
  bundle: SourceAdapterBundle;
  records: null;
}

export function verifySourceAdapterBundle(
  outputDirectory: string,
): Promise<VerifiedSourceAdapterBundle>;
export function verifySourceAdapterBundle(
  outputDirectory: string,
  options: { collectRecords: false },
): Promise<StreamVerifiedSourceAdapterBundle>;
export async function verifySourceAdapterBundle(
  outputDirectory: string,
  options: { collectRecords?: boolean } = {},
): Promise<VerifiedSourceAdapterBundle | StreamVerifiedSourceAdapterBundle> {
  const manifestPath = join(resolve(outputDirectory), "manifest.json");
  const manifestBytes = await readFile(manifestPath, "utf8");
  const parsedManifest = JSON.parse(manifestBytes) as unknown;
  if (`${canonicalJson(parsedManifest)}\n` !== manifestBytes) {
    throw new Error("source-adapter manifest is not canonical JSON");
  }
  const bundle = sourceAdapterBundleSchema.parse(parsedManifest);
  const records = options.collectRecords === false
    ? null
    : [] as SourceNativeRecord[];
  const recordsRoot = createHash("sha256");
  recordsRoot.update("[");
  let recordCount = 0;
  let previousIdentity: string | null = null;
  const expectedFiles = new Set<string>();
  for (const chunk of bundle.output.chunks) {
    const chunkPath = withinDirectory(outputDirectory, chunk.path);
    expectedFiles.add(chunk.path.split("/").at(-1)!);
    const bytes = await readFile(chunkPath);
    if (bytes.byteLength !== chunk.byte_length) {
      throw new Error(`${chunk.path}: byte length does not match manifest`);
    }
    if (sha256(bytes) !== chunk.content_root) {
      throw new Error(`${chunk.path}: content root does not match manifest`);
    }
    const text = bytes.toString("utf8");
    if (!text.endsWith("\n")) {
      throw new Error(`${chunk.path}: NDJSON chunk lacks its final newline`);
    }
    const lines = text.slice(0, -1).split("\n");
    if (lines.length !== chunk.record_count) {
      throw new Error(`${chunk.path}: record count does not match manifest`);
    }
    const chunkRecords = lines.map((line, index) => {
      const value = JSON.parse(line) as unknown;
      if (canonicalJson(value) !== line) {
        throw new Error(`${chunk.path}:${index + 1}: record is not canonical JSON`);
      }
      return sourceNativeRecordSchema.parse(value);
    });
    if (
      chunkRecords[0]?.native_id !== chunk.first_native_id
      || chunkRecords.at(-1)?.native_id !== chunk.last_native_id
    ) {
      throw new Error(`${chunk.path}: native ID bounds do not match manifest`);
    }
    for (const record of chunkRecords) {
      if (record.source_id !== bundle.source_id) {
        throw new Error(`${chunk.path}: record belongs to another source`);
      }
      const identity = `${record.source_id}\0${record.native_id}`;
      if (previousIdentity !== null && identity <= previousIdentity) {
        throw new Error("source-adapter records are not in canonical identity order");
      }
      previousIdentity = identity;
      recordsRoot.update(recordCount === 0 ? "" : ",");
      recordsRoot.update(JSON.stringify(record.record_root));
      recordCount += 1;
      records?.push(record);
    }
  }
  const actualChunkFiles = new Set(await readdir(join(resolve(outputDirectory), "chunks")));
  if (
    actualChunkFiles.size !== expectedFiles.size
    || [...actualChunkFiles].some((file) => !expectedFiles.has(file))
  ) {
    throw new Error("source-adapter chunk directory contains undeclared files");
  }
  if (recordCount !== bundle.output.record_count) {
    throw new Error("source-adapter output record count does not match manifest");
  }
  recordsRoot.update("]");
  const actualRecordsRoot = `sha256:${recordsRoot.digest("hex")}`;
  if (actualRecordsRoot !== bundle.output.records_root) {
    throw new Error("source-adapter record root does not match manifest");
  }
  return { bundle, records };
}
