#!/usr/bin/env bun

import { resolve } from "node:path";
import {
  loadProjectionSourceAdapterArtifact,
  projectionSourceAdapterArtifactFilename,
  writeProjectionSourceAdapterArtifact,
} from "../src/source-adapters/artifact.ts";
import {
  acquireProjectionSourceAdapters,
  loadProjectionSourceAdapterSet,
} from "../src/source-adapters/refresh.ts";

function usage() {
  console.error(`Usage:
  bun scripts/source-adapters.mjs refresh \\
    --output <new-directory> --artifact-directory <directory> \\
    [--formal-repository <url-or-path>] [--formal-revision <git-ref>] \\
    [--formal-published-data <url-or-path>] \\
    [--formal-extracted-data <path> | --run-extractor] \\
    [--oeis-data <url-or-path>] [--palomar-data <url-or-path>] \\
    [--chunk-records <count>]
  bun scripts/source-adapters.mjs verify <artifact.json>`);
}

function argumentsAfter(position) {
  const values = process.argv.slice(position);
  const options = new Map();
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!key.startsWith("--")) throw new Error(`unexpected argument ${key}`);
    if (key === "--run-extractor") {
      if (options.has(key)) throw new Error(`${key} was provided more than once`);
      options.set(key, true);
      continue;
    }
    const value = values[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${key} requires a value`);
    }
    if (options.has(key)) throw new Error(`${key} was provided more than once`);
    options.set(key, value);
    index += 1;
  }
  return options;
}

function required(options, key) {
  const value = options.get(key);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function chunkRecordLimit(options) {
  const raw = options.get("--chunk-records");
  if (raw === undefined) return 1_000;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("--chunk-records must be a positive integer");
  }
  return value;
}

async function refresh(options) {
  const output = resolve(required(options, "--output"));
  const prepared = await acquireProjectionSourceAdapters({
    outputDirectory: output,
    /* The same five knobs `refresh-neon-projection.mjs` reads from the
       environment, because a refresh reaches acquisition through exactly one of
       these two scripts and they disagreed about how to ask for it. CI takes
       this path — the workflow prepares the adapter artifact here and hands
       `VELA_SOURCE_ADAPTER_ARTIFACT` to the other script, whose acquisition
       branch is then skipped. So `VELA_FORMAL_CONJECTURES_RUN_EXTRACTOR` was
       read only by the branch CI never reaches: setting it would have changed
       nothing, which is a worse failure than not having set it. A flag still
       wins over the environment where both are given. */
    formalRepository: options.get("--formal-repository")
      ?? process.env.VELA_FORMAL_CONJECTURES_REPOSITORY,
    formalRevision: options.get("--formal-revision")
      ?? process.env.VELA_FORMAL_CONJECTURES_REVISION,
    formalPublishedDataset: options.get("--formal-published-data")
      ?? process.env.VELA_FORMAL_CONJECTURES_PUBLISHED_DATA,
    formalExtractedDataset: options.get("--formal-extracted-data")
      ?? process.env.VELA_FORMAL_CONJECTURES_EXTRACTED_DATA,
    formalRunExtractor: options.get("--run-extractor") === true
      || process.env.VELA_FORMAL_CONJECTURES_RUN_EXTRACTOR === "1",
    oeisDataset: options.get("--oeis-data"),
    palomarDataset: options.get("--palomar-data"),
    chunkRecordLimit: chunkRecordLimit(options),
  });
  const manifestPath = resolve(output, "source-adapters.json");
  await loadProjectionSourceAdapterSet(manifestPath);

  const artifactName = projectionSourceAdapterArtifactFilename(
    prepared.manifest.set_root,
  );
  const artifactPath = resolve(
    required(options, "--artifact-directory"),
    artifactName,
  );
  const packed = await writeProjectionSourceAdapterArtifact(
    manifestPath,
    artifactPath,
  );
  await loadProjectionSourceAdapterArtifact(artifactPath);

  console.log(JSON.stringify({
    ok: true,
    command: "source-adapters.refresh",
    set_root: prepared.manifest.set_root,
    artifact_root: packed.artifact.artifact_root,
    artifact_name: artifactName,
    artifact_path: artifactPath,
    sources: prepared.manifest.sources,
  }));
}

async function verify(artifactPath) {
  const verified = await loadProjectionSourceAdapterArtifact(
    resolve(artifactPath),
  );
  console.log(JSON.stringify({
    ok: true,
    command: "source-adapters.verify",
    artifact_root: verified.artifact.artifact_root,
    set_root: verified.manifest.set_root,
    retrieval: verified.reference.retrieval,
    sources: verified.manifest.sources,
  }));
}

async function main() {
  const command = process.argv[2];
  if (command === "refresh") {
    await refresh(argumentsAfter(3));
    return;
  }
  if (command === "verify") {
    const artifactPath = process.argv[3];
    if (!artifactPath || process.argv.length !== 4) {
      throw new Error("verify requires exactly one source-adapter artifact");
    }
    await verify(artifactPath);
    return;
  }
  usage();
  process.exitCode = 2;
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    command: "source-adapters",
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
});
