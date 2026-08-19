import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { z } from "zod";
import { canonicalJson, sha256 } from "../canonical";
import { mathSourceRegistry } from "../math-sources";
import sourceAcquisitionInput from "../../config/source-acquisition.v1.json";
import {
  verifySourceAdapterBundle,
  writeSourceAdapterBundle,
  type VerifiedSourceAdapterBundle,
} from "./bundle";
import { acquireFormalConjectures } from "./formal-conjectures";
import { acquireOeisA309370 } from "./oeis";
import {
  acquirePalomarRegistry,
  palomarRegistryRelease,
} from "./palomar";
import {
  acquireOpenAiTenProofs,
  openAiTenProofsRelease,
} from "./openai-ten-proofs";
import { acquirePhyslib, physlibRelease } from "./physlib";
import {
  acquireLocalSnapshot,
  type LocalSnapshotAdapterName,
} from "./local-snapshots";
import { acquireErdosProblems } from "./erdos-problems";
import { acquirePinnedProofManifest } from "./proof-manifests";
import { acquireVibemathed } from "./vibemathed";

/**
 * A source requires a verified refresh adapter when it is external to a
 * Repository, has a reproducible acquisition contract, and claims more than a
 * locator-only reference. This is derived from the checked registry so adding
 * a source cannot silently bypass acquisition coverage.
 */
export function requiresProjectionSourceAdapter(
  source: (typeof mathSourceRegistry.sources)[number],
): boolean {
  return (
    source.adapter.mode !== "repository_local"
    && source.snapshot_policy.mode !== "reference_only"
  );
}

export const projectionSourceAdapterIds = Object.freeze(
  mathSourceRegistry.sources
    .filter(requiresProjectionSourceAdapter)
    .map(({ source_id }) => source_id)
    .sort(),
);

export type ProjectionSourceAdapterMap =
  ReadonlyMap<string, VerifiedSourceAdapterBundle>;

const hashRootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);
const revisionSchema = z.string().regex(/^[0-9a-f]{40}$/u);
const acquisitionGitSourceSchema = z.object({
  repository: z.string().min(1),
  revision: revisionSchema,
  path: z.string().min(1),
  root: hashRootSchema,
  locator: z.string().url(),
}).strict();
const acquisitionSnapshotSchema = z.object({
  revision: revisionSchema,
  snapshot_path: z.string().regex(/^[a-z0-9][a-z0-9./-]*\.json$/u),
  snapshot_root: hashRootSchema,
}).strict();
const projectionSourceAcquisitionSchema = z.object({
  schema: z.literal("vela.projection-source-acquisition.v1"),
  authority_effect: z.literal("none"),
  sources: z.object({
    erdos: acquisitionGitSourceSchema,
    openai_ten_proofs: z.object({
      revision: revisionSchema,
      tree: revisionSchema,
    }).strict(),
    plby: acquisitionGitSourceSchema,
    jayyhk: acquisitionGitSourceSchema,
    williamjblair_lean_proofs: acquisitionGitSourceSchema,
    wiki: acquisitionSnapshotSchema,
    gpt_erdos: acquisitionSnapshotSchema,
  }).strict(),
}).strict();

export type ProjectionSourceAcquisition = z.infer<
  typeof projectionSourceAcquisitionSchema
>;

export const projectionSourceAcquisition = Object.freeze(
  projectionSourceAcquisitionSchema.parse(sourceAcquisitionInput),
);
const projectionSourceAdapterIdSchema = z.string()
  .regex(/^source:[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  .refine(
    (sourceId) => projectionSourceAdapterIds.includes(sourceId),
    "source does not require a projection adapter under the checked registry",
  );
const sourceAdapterSetEntrySchema = z.object({
  source_id: projectionSourceAdapterIdSchema,
  directory: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  bundle_root: hashRootSchema,
  records_root: hashRootSchema,
  record_count: z.number().int().nonnegative(),
}).strict();

const sourceAdapterSetBodySchema = z.object({
  schema: z.literal("vela.projection-source-adapter-set.v1"),
  sources: z.array(sourceAdapterSetEntrySchema),
}).strict();

const sourceAdapterSetSchema = sourceAdapterSetBodySchema.extend({
  set_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  const { set_root: _root, ...body } = value;
  if (value.set_root !== sha256(canonicalJson(body))) {
    context.addIssue({
      code: "custom",
      path: ["set_root"],
      message: "source-adapter set root does not match its canonical bytes",
    });
  }
});

export type ProjectionSourceAdapterSet = z.infer<
  typeof sourceAdapterSetSchema
>;

export interface PreparedProjectionSourceAdapters {
  manifest: ProjectionSourceAdapterSet;
  bundles: ProjectionSourceAdapterMap;
}

function assertCompleteAdapterSet(
  bundles: ProjectionSourceAdapterMap,
): void {
  const expected = new Set<string>(projectionSourceAdapterIds);
  for (const sourceId of bundles.keys()) {
    if (!expected.delete(sourceId)) {
      throw new Error(`unsupported or duplicate projection source adapter ${sourceId}`);
    }
  }
  if (expected.size > 0) {
    throw new Error(
      `projection source-adapter set is incomplete: missing ${[...expected].sort().join(", ")}`,
    );
  }
}

function createSet(
  entries: ProjectionSourceAdapterSet["sources"],
): ProjectionSourceAdapterSet {
  const body = sourceAdapterSetBodySchema.parse({
    schema: "vela.projection-source-adapter-set.v1",
    sources: [...entries].sort((left, right) => (
      left.source_id.localeCompare(right.source_id)
    )),
  });
  return sourceAdapterSetSchema.parse({
    ...body,
    set_root: sha256(canonicalJson(body)),
  });
}

function withinDirectory(directory: string, relativePath: string): string {
  const root = resolve(directory);
  const candidate = resolve(root, relativePath);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    throw new Error(`source-adapter set path escapes its directory: ${relativePath}`);
  }
  return candidate;
}

export async function loadProjectionSourceAdapterSet(
  manifestPath: string,
): Promise<PreparedProjectionSourceAdapters> {
  const absoluteManifest = resolve(manifestPath);
  const manifestBytes = await readFile(absoluteManifest, "utf8");
  const parsed = JSON.parse(manifestBytes) as unknown;
  if (`${canonicalJson(parsed)}\n` !== manifestBytes) {
    throw new Error("projection source-adapter set is not canonical JSON");
  }
  const manifest = sourceAdapterSetSchema.parse(parsed);
  const parent = dirname(absoluteManifest);
  const bundles = new Map<string, VerifiedSourceAdapterBundle>();
  for (const entry of manifest.sources) {
    if (bundles.has(entry.source_id)) {
      throw new Error(`projection source-adapter set repeats ${entry.source_id}`);
    }
    const verified = await verifySourceAdapterBundle(
      withinDirectory(parent, entry.directory),
    );
    if (
      verified.bundle.source_id !== entry.source_id
      || verified.bundle.bundle_root !== entry.bundle_root
      || verified.bundle.output.records_root !== entry.records_root
      || verified.bundle.output.record_count !== entry.record_count
    ) {
      throw new Error(`${entry.source_id}: source-adapter set does not match its verified bundle`);
    }
    bundles.set(entry.source_id, verified);
  }
  assertCompleteAdapterSet(bundles);
  return { manifest, bundles };
}

async function json(path: string): Promise<Record<string, unknown>> {
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path}: expected a JSON object`);
  }
  return value as Record<string, unknown>;
}

interface LocalAdapterInput {
  adapter: LocalSnapshotAdapterName;
  input: string;
  revision: string;
}

export interface AcquireProjectionSourceAdaptersOptions {
  outputDirectory: string;
  sourceAcquisition?: ProjectionSourceAcquisition;
  sourceSnapshotDirectory?: string;
  formalRepository?: string;
  formalRevision?: string;
  formalPublishedDataset?: string;
  formalExtractedDataset?: string;
  formalRunExtractor?: boolean;
  oeisDataset?: string;
  palomarDataset?: string;
  palomarMechanicalReport?: string;
  palomarReviewReport?: string;
  vibemathedDataset?: string;
  openAiTenProofsRepository?: string;
  openAiTenProofsPublicRepository?: string;
  openAiTenProofsRevision?: string;
  openAiTenProofsTree?: string;
  openAiTenProofsExpectedRoots?: Record<string, string>;
  physlibRepository?: string;
  physlibPublicRepository?: string;
  physlibRevision?: string;
  physlibTree?: string;
  physlibExpectedRoots?: Record<string, string>;
  chunkRecordLimit?: number;
}

async function configuredSnapshot(
  sourceKey: "wiki" | "gpt_erdos",
  snapshotRevisionKey: string,
  acquisition: ProjectionSourceAcquisition,
  snapshotDirectory: string,
): Promise<{ input: string; revision: string }> {
  const source = acquisition.sources[sourceKey];
  const input = withinDirectory(snapshotDirectory, source.snapshot_path);
  const bytes = await readFile(input);
  if (sha256(bytes) !== source.snapshot_root) {
    throw new Error(`${sourceKey}: retained snapshot bytes do not match acquisition root`);
  }
  const snapshot = await json(input);
  const observed = snapshot[snapshotRevisionKey];
  if (observed !== source.revision) {
    throw new Error(
      `${sourceKey}: retained snapshot revision ${String(observed)} does not match acquisition revision ${source.revision}`,
    );
  }
  return { input, revision: source.revision };
}

function githubRepository(value: string): string {
  if (
    value.startsWith("/")
    || value.startsWith("file:")
    || value.startsWith("http:")
    || value.startsWith("https:")
    || value.startsWith("git@")
  ) {
    return value;
  }
  if (!/^[^/\s]+\/[^/\s]+$/u.test(value)) {
    throw new Error(`source acquisition config has invalid GitHub repository ${value}`);
  }
  return `https://github.com/${value}.git`;
}

/**
 * Acquires every externally maintained source in the refresh job, writes
 * immutable bundles, verifies those bundles offline, and returns only the
 * verified inputs accepted by the projection builder.
 */
export async function acquireProjectionSourceAdapters(
  options: AcquireProjectionSourceAdaptersOptions,
): Promise<PreparedProjectionSourceAdapters> {
  const outputDirectory = resolve(options.outputDirectory);
  try {
    const files = await readdir(outputDirectory);
    if (files.length > 0) {
      throw new Error(`projection source-adapter output is not empty: ${outputDirectory}`);
    }
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && (error as Error & { code?: string }).code === "ENOENT"
    ) {
      await mkdir(outputDirectory, { recursive: true });
    } else {
      throw error;
    }
  }

  const acquisition = projectionSourceAcquisitionSchema.parse(
    options.sourceAcquisition ?? projectionSourceAcquisition,
  );
  const snapshotDirectory = resolve(
    options.sourceSnapshotDirectory ?? resolve(import.meta.dir, "../../config"),
  );
  const wikiSnapshot = await configuredSnapshot(
    "wiki",
    "wiki_commit",
    acquisition,
    snapshotDirectory,
  );
  const gptSnapshot = await configuredSnapshot(
    "gpt_erdos",
    "commit",
    acquisition,
    snapshotDirectory,
  );
  const localInputs: LocalAdapterInput[] = [
    {
      adapter: "erdos-ai-wiki",
      ...wikiSnapshot,
    },
    {
      adapter: "gpt-erdos",
      ...gptSnapshot,
    },
  ];
  const { erdos, plby, jayyhk, williamjblair_lean_proofs: william } = acquisition.sources;
  const plbyLock = {
    repository: githubRepository(plby.repository),
    revision: plby.revision,
    manifestPath: plby.path,
    expectedManifestRoot: plby.root,
    logicalManifestLocator: plby.locator,
  };
  const jayyhkLock = {
    repository: githubRepository(jayyhk.repository),
    revision: jayyhk.revision,
    manifestPath: jayyhk.path,
    expectedManifestRoot: jayyhk.root,
    logicalManifestLocator: jayyhk.locator,
  };
  const williamLock = {
    repository: githubRepository(william.repository),
    revision: william.revision,
    manifestPath: william.path,
    expectedManifestRoot: william.root,
    logicalManifestLocator: william.locator,
  };
  const outputs = await Promise.all([
    acquireErdosProblems({
      repository: githubRepository(erdos.repository),
      revision: erdos.revision,
      dataPath: erdos.path,
      expectedDataRoot: erdos.root,
      logicalLocator: erdos.locator,
    }),
    acquireOpenAiTenProofs({
      repository: options.openAiTenProofsRepository
        ?? openAiTenProofsRelease.repository,
      publicRepository: options.openAiTenProofsPublicRepository
        ?? openAiTenProofsRelease.public_repository,
      revision: options.openAiTenProofsRevision
        ?? acquisition.sources.openai_ten_proofs.revision,
      expectedTree: options.openAiTenProofsTree
        ?? acquisition.sources.openai_ten_proofs.tree,
      expectedRoots: options.openAiTenProofsExpectedRoots,
    }),
    acquirePhyslib({
      repository: options.physlibRepository ?? physlibRelease.repository,
      publicRepository: options.physlibPublicRepository
        ?? physlibRelease.public_repository,
      /* Deliberately the constant, not the lock, and they disagree: the lock
         says e882411d and `physlibRelease` says ad1d812c. Taking the lock here
         looks like the more honest read and is the opposite, because
         `physlib.ts` only applies its exact_roots when the revision IS the
         pinned release — so a lock-driven revision would silently acquire with
         no root verification at all. Reconciling the two means recomputing
         every exact root against whichever commit wins, which is a re-pin. */
      revision: options.physlibRevision ?? physlibRelease.commit,
      expectedTree: options.physlibTree ?? physlibRelease.tree,
      expectedRoots: options.physlibExpectedRoots,
    }),
    /* Every default now comes from `formalConjecturesRelease` rather than from
       here. The two that used to sit inline were the defect: `main` as the
       revision, and the live Pages url as the published dataset. Pages lags
       pushes, so those two named different revisions of the same repository on
       any day upstream had merged something, and the lock recorded the pairing
       as though they agreed. */
    acquireFormalConjectures({
      repository: options.formalRepository,
      revision: options.formalRevision,
      publishedDataset: options.formalPublishedDataset,
      extractedDataset: options.formalExtractedDataset,
      runExtractor: options.formalRunExtractor,
    }),
    acquirePinnedProofManifest({
      kind: "plby",
      ...plbyLock,
    }),
    acquirePinnedProofManifest({
      kind: "jayyhk",
      ...jayyhkLock,
    }),
    acquirePinnedProofManifest({
      kind: "williamjblair",
      ...williamLock,
    }),
    acquireOeisA309370({
      dataset: options.oeisDataset ?? "https://oeis.org/A309370?fmt=json",
    }),
    /* The default is the pinned versioned entry URL, and the adapter holds
       whatever it reads to the consumer-computed root in
       `palomarRegistryRelease` — Palomar publishes no digest of its own — so a
       re-rendered entry fails this refresh instead of moving downstream roots.
       Overrides exist for exact local fixture bytes; the evidence-report
       locators default to the live paths the entry itself declares. */
    acquirePalomarRegistry({
      dataset: options.palomarDataset ?? palomarRegistryRelease.entry_locator,
      mechanicalReport: options.palomarMechanicalReport,
      reviewReport: options.palomarReviewReport,
    }),
    /* No lock field is read here, and that is the declaration being honest
       rather than an omission. The lock's `vibemathed` entry records the digest
       of one retrieval, and the endpoint re-renders its envelope on a cache
       cycle, so holding an acquisition to that digest would fail on a response
       whose catalogue is identical. The adapter roots its records on the
       catalogue instead, and the lock stays what it is: a record of what was
       served at a moment, not a pin an acquisition can be checked against. */
    acquireVibemathed({ dataset: options.vibemathedDataset }),
    ...localInputs.map((input) => acquireLocalSnapshot(input)),
  ]);
  const bundleDirectories = await Promise.all(outputs.map(async (output) => {
    const directory = output.source_id.slice("source:".length);
    await writeSourceAdapterBundle(join(outputDirectory, directory), output, {
      chunkRecordLimit: options.chunkRecordLimit,
    });
    return { sourceId: output.source_id, directory };
  }));
  const entries = [];
  for (const { sourceId, directory } of bundleDirectories) {
    const verified = await verifySourceAdapterBundle(
      join(outputDirectory, directory),
    );
    if (verified.bundle.source_id !== sourceId) {
      throw new Error(`${sourceId}: acquired bundle changed source identity`);
    }
    entries.push({
      source_id: sourceId,
      directory,
      bundle_root: verified.bundle.bundle_root,
      records_root: verified.bundle.output.records_root,
      record_count: verified.bundle.output.record_count,
    });
  }
  const manifest = createSet(entries);
  const manifestPath = join(outputDirectory, "source-adapters.json");
  await writeFile(manifestPath, `${canonicalJson(manifest)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return loadProjectionSourceAdapterSet(manifestPath);
}

export function requireProjectionSourceAdapters(
  bundles: ProjectionSourceAdapterMap | undefined,
): ProjectionSourceAdapterMap {
  if (!bundles) {
    throw new Error(
      "verified projection source-adapter bundles are required; acquire and verify them before projection",
    );
  }
  assertCompleteAdapterSet(bundles);
  return bundles;
}
