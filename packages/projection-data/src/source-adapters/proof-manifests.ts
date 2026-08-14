import { YAML } from "bun";
import { join } from "node:path";
import { z } from "zod";
import { canonicalJson, sha256 } from "../canonical";
import {
  acquireBytes,
  acquireExactGitCheckout,
  gitBlobRoot,
} from "./acquisition";
import {
  createSourceAdapterIdentity,
  createSourceNativeRecord,
  type SourceNativeRecord,
} from "./contracts";
import type { SourceAdapterOutput } from "./bundle";

const hashRootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);
const positiveIntegerSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^[1-9][0-9]*$/u).transform(Number),
]);

const jayyhkEntrySchema = z.object({
  number: positiveIntegerSchema,
  proof: z.object({
    path: z.string().min(1),
    theorem: z.string().min(1),
    state: z.string().min(1),
    last_update: z.string().min(1).optional(),
    lean_toolchain: z.string().min(1).optional(),
    mathlib_revision: z.string().min(1).optional(),
    sources: z.array(z.string().url()).optional(),
  }).passthrough(),
}).passthrough();

const jayyhkManifestSchema = z.array(jayyhkEntrySchema);

const stringOrStringsSchema = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
]);

const plbyEntrySchema = z.object({
  key: z.string().regex(/^ErdosProblems\.Erdos[1-9][0-9]*[a-z]?$/u),
  epc: z.string().url(),
  author: z.union([
    z.array(z.json()).min(1),
    z.record(z.string(), z.json()),
  ]),
  arxiv: z.union([
    z.string().url(),
    z.array(z.string().url()).min(1),
  ]).optional(),
  url: z.union([
    z.string().url(),
    z.array(z.string().url()).min(1),
  ]),
  url_ref: z.string().min(1).optional(),
  version: stringOrStringsSchema,
  conditional: stringOrStringsSchema.optional(),
  partial: z.string().min(1).optional(),
  todo: stringOrStringsSchema.optional(),
}).strict();

const plbyManifestSchema = z.array(plbyEntrySchema);

const williamEntrySchema = z.object({
  problem: positiveIntegerSchema,
  file: z.string().min(1),
  theorem: z.string().min(1),
  axioms_clean: z.boolean(),
  source: z.string().min(1).optional(),
  statement: z.string().min(1).optional(),
  depends_on: z.array(z.string().min(1)).optional(),
  fc_target: z.string().min(1).optional(),
  fc_pr: z.string().url().optional(),
}).passthrough();

const williamManifestSchema = z.object({
  repo: z.string().min(1),
  toolchain: z.string().min(1),
  mathlib: z.string().min(1),
  proofs: z.array(williamEntrySchema),
}).passthrough();

export type PinnedProofManifestKind =
  | "jayyhk"
  | "plby"
  | "williamjblair";

export const pinnedProofManifestAdapters = {
  jayyhk: {
    sourceId: "source:jayyhk-erdos-lean",
    adapter: createSourceAdapterIdentity(
      "problems-data/jayyhk-erdos-lean",
      "1.0.0",
    ),
  },
  plby: {
    sourceId: "source:plby-lean-proofs",
    adapter: createSourceAdapterIdentity(
      "problems-data/plby-lean-proofs",
      "1.0.0",
    ),
  },
  williamjblair: {
    sourceId: "source:williamjblair-lean-proofs",
    adapter: createSourceAdapterIdentity(
      "problems-data/williamjblair-lean-proofs",
      "1.0.0",
    ),
  },
} as const;

function exactBlobLocator(
  repository: string,
  commit: string,
  path: string,
): string {
  const match = /(?:https:\/\/github\.com\/|git@github\.com:)?([^/\s]+\/[^/\s]+?)(?:\.git)?$/u
    .exec(repository);
  return match
    ? `https://github.com/${match[1]}/blob/${commit}/${path}`
    : `${repository}#${commit}:${path}`;
}

function parseYaml(bytes: Uint8Array, label: string): unknown {
  try {
    return YAML.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new Error(
      `${label} is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function jayyhkRecords(
  manifest: unknown,
  repository: string,
  commit: string,
  manifestPath: string,
): SourceNativeRecord[] {
  const entries = jayyhkManifestSchema.parse(manifest);
  const seen = new Set<number>();
  return entries.map((entry) => {
    if (!seen.add(entry.number)) {
      throw new Error(`Jayyhk proof manifest repeats Erdős problem ${entry.number}`);
    }
    const locators = [
      exactBlobLocator(repository, commit, manifestPath),
      ...(entry.proof.sources ?? []),
    ];
    return createSourceNativeRecord({
      schema: "vela.source-native-record.v1",
      source_id: pinnedProofManifestAdapters.jayyhk.sourceId,
      native_id: `jayyhk:erdos:${entry.number}`,
      native_kind: "proof_manifest_entry",
      native_revision: commit,
      title: `Jayyhk proof manifest entry for Erdős ${entry.number}`,
      summary: null,
      source_path: entry.proof.path,
      locators,
      metadata: {
        problem_number: entry.number,
        theorem: entry.proof.theorem,
        state: entry.proof.state,
        last_update: entry.proof.last_update ?? null,
        lean_toolchain: entry.proof.lean_toolchain ?? null,
        mathlib_revision: entry.proof.mathlib_revision ?? null,
      },
      content_root: sha256(canonicalJson(entry)),
    });
  });
}

function plbyRecords(
  manifest: unknown,
  repository: string,
  commit: string,
  manifestPath: string,
): SourceNativeRecord[] {
  const entries = plbyManifestSchema.parse(manifest);
  const seen = new Set<string>();
  return entries.map((entry) => {
    if (!seen.add(entry.key)) {
      throw new Error(`plby proof manifest repeats ${entry.key}`);
    }
    const match = /^ErdosProblems\.Erdos([1-9][0-9]*)([a-z]?)$/u.exec(
      entry.key,
    );
    if (!match) {
      throw new Error(`plby proof manifest has invalid key ${entry.key}`);
    }
    const arxiv = entry.arxiv === undefined
      ? []
      : Array.isArray(entry.arxiv)
        ? entry.arxiv
        : [entry.arxiv];
    const urls = Array.isArray(entry.url) ? entry.url : [entry.url];
    const locators = [
      exactBlobLocator(repository, commit, manifestPath),
      entry.epc,
      ...arxiv,
      ...urls,
    ].filter((locator, index, all) => all.indexOf(locator) === index);
    return createSourceNativeRecord({
      schema: "vela.source-native-record.v1",
      source_id: pinnedProofManifestAdapters.plby.sourceId,
      native_id: entry.key,
      native_kind: "proof_manifest_entry",
      native_revision: commit,
      title: entry.key,
      summary: null,
      source_path: manifestPath,
      locators,
      metadata: {
        key: entry.key,
        problem_number: Number(match[1]),
        variant: match[2] === "" ? null : match[2],
        epc: entry.epc,
        author: entry.author,
        arxiv: entry.arxiv ?? null,
        url: entry.url,
        url_reference: entry.url_ref ?? null,
        version: entry.version,
        conditional: entry.conditional ?? null,
        partial: entry.partial ?? null,
        todo: entry.todo ?? null,
      },
      content_root: sha256(canonicalJson(entry)),
    });
  });
}

function williamRecords(
  manifest: unknown,
  repository: string,
  commit: string,
  manifestPath: string,
): SourceNativeRecord[] {
  const parsed = williamManifestSchema.parse(manifest);
  const seen = new Set<string>();
  return parsed.proofs.map((entry) => {
    if (!seen.add(entry.theorem)) {
      throw new Error(`William Blair proof manifest repeats theorem ${entry.theorem}`);
    }
    return createSourceNativeRecord({
      schema: "vela.source-native-record.v1",
      source_id: pinnedProofManifestAdapters.williamjblair.sourceId,
      native_id: `williamjblair:${entry.theorem}`,
      native_kind: "proof_manifest_entry",
      native_revision: commit,
      title: `William Blair proof manifest entry for Erdős ${entry.problem}`,
      summary: null,
      source_path: entry.file,
      locators: [
        exactBlobLocator(repository, commit, manifestPath),
        ...(entry.fc_pr ? [entry.fc_pr] : []),
      ],
      metadata: {
        problem_number: entry.problem,
        theorem: entry.theorem,
        source: entry.source ?? null,
        axioms_clean: entry.axioms_clean,
        toolchain: parsed.toolchain,
        mathlib: parsed.mathlib,
        formal_conjectures_target: entry.fc_target ?? null,
        dependency_count: entry.depends_on?.length ?? 0,
      },
      content_root: sha256(canonicalJson(entry)),
    });
  });
}

export interface PinnedProofManifestAcquisitionOptions {
  kind: PinnedProofManifestKind;
  repository: string;
  revision: string;
  manifestPath: string;
  expectedManifestRoot: string;
  logicalManifestLocator: string;
}

/**
 * Reads a proof manifest from an exact detached Git checkout and verifies the
 * byte root retained by the Problems projection acquisition config before
 * emitting normalized rows.
 */
export async function acquirePinnedProofManifest(
  options: PinnedProofManifestAcquisitionOptions,
): Promise<SourceAdapterOutput> {
  const expectedManifestRoot = hashRootSchema.parse(options.expectedManifestRoot);
  const checkout = await acquireExactGitCheckout(
    options.repository,
    options.revision,
  );
  try {
    if (checkout.commit !== options.revision) {
      throw new Error(
        `${options.kind} proof manifest resolved ${checkout.commit}, expected ${options.revision}`,
      );
    }
    const committedBlob = await gitBlobRoot(
      checkout.directory,
      checkout.commit,
      options.manifestPath,
    );
    if (committedBlob.content_root !== expectedManifestRoot) {
      throw new Error(
        `${options.kind} proof manifest root ${committedBlob.content_root} does not match acquisition root ${expectedManifestRoot}`,
      );
    }
    const manifestFile = join(checkout.directory, options.manifestPath);
    const acquired = await acquireBytes(manifestFile, {
      inputId: "proof-manifest",
      role: "published_dataset",
      mediaType: "application/yaml",
      manifestLocator: options.logicalManifestLocator,
    });
    if (acquired.input.content_root !== committedBlob.content_root) {
      throw new Error(
        `${options.kind} proof manifest working bytes differ from the exact committed blob`,
      );
    }
    const parsed = parseYaml(acquired.bytes, `${options.kind} proof manifest`);
    const records = options.kind === "jayyhk"
      ? jayyhkRecords(
        parsed,
        options.repository,
        checkout.commit,
        options.manifestPath,
      )
      : options.kind === "plby"
        ? plbyRecords(
          parsed,
          options.repository,
          checkout.commit,
          options.manifestPath,
        )
        : williamRecords(
          parsed,
          options.repository,
          checkout.commit,
          options.manifestPath,
        );
    const identity = pinnedProofManifestAdapters[options.kind];
    return {
      source_id: identity.sourceId,
      adapter: identity.adapter,
      revision: checkout.revision,
      inputs: [checkout.input, acquired.input],
      records,
      coverage: {
        status: "complete",
        scope: `Every entry in the exact ${options.kind} proof manifest retained by the Problems projection acquisition config.`,
        native_record_count: records.length,
        emitted_record_count: records.length,
        omitted_record_count: 0,
      },
      omissions: [{
        code: "proof_source_bytes_excluded",
        description: "Proof-source bytes outside the exact manifest are not copied into the Math source projection.",
      }],
      loss: [{
        code: "source_labels_remain_attributed",
        description: options.kind === "plby"
          ? "PLBY author, version, partial, and conditional labels remain attributed source metadata; they are neither Vela Verification nor Standing."
          : "Manifest proof and axiom labels remain attributed source metadata and do not create Vela Verification or Standing.",
      }],
    };
  } finally {
    await checkout.close();
  }
}
