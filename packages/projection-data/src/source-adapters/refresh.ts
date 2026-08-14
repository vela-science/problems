import { execFileSync } from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { z } from "zod";
import { repositoryRegistry } from "../registry";
import { canonicalJson, sha256 } from "../canonical";
import { mathSourceRegistry } from "../math-sources";
import {
  verifySourceAdapterBundle,
  writeSourceAdapterBundle,
  type VerifiedSourceAdapterBundle,
} from "./bundle";
import { acquireFormalConjectures } from "./formal-conjectures";
import { acquireOeisA309370 } from "./oeis";
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

export const repositorySourceLockDispositions = Object.freeze({
  alphaproof: {
    kind: "registry_source",
    source_id: "source:alphaproof-nexus-results",
  },
  codetables: {
    kind: "registry_source",
    source_id: "source:codetables-stabilizer",
  },
  erdos: { kind: "registry_source", source_id: "source:erdos-problems" },
  formal_conjectures: {
    kind: "registry_source",
    source_id: "source:formal-conjectures",
  },
  formal_conjectures_pr_audit: {
    kind: "registry_source",
    source_id: "source:formal-conjectures-pr-audit",
  },
  gpt_erdos: { kind: "registry_source", source_id: "source:gpt-erdos" },
  jayyhk: { kind: "registry_source", source_id: "source:jayyhk-erdos-lean" },
  oeis_a309370: {
    kind: "registry_source",
    source_id: "source:oeis-a309370",
  },
  openai_ten_proofs: {
    kind: "registry_source",
    source_id: "source:openai-ten-proofs",
  },
  physlib: { kind: "registry_source", source_id: "source:physlib" },
  plby: { kind: "registry_source", source_id: "source:plby-lean-proofs" },
  vibemathed: { kind: "registry_source", source_id: "source:vibemathed" },
  wiki: {
    kind: "registry_source",
    source_id: "source:erdos-ai-contributions-wiki",
  },
  williamjblair_lean_proofs: {
    kind: "registry_source",
    source_id: "source:williamjblair-lean-proofs",
  },
} as const);

/**
 * The source lock is a repository-owned acquisition inventory. Unknown entries
 * must not become invisible simply because the projection refresh does not yet
 * consume them: every entry must name a checked Math Source Registry
 * declaration.
 *
 * The `fidelity` disposition that used to sit here described a derived cache in
 * the retired Erdős repository, and no declaration ever backed it.
 */
export function assertKnownRepositorySourceLockEntries(lock: unknown): void {
  const parsed = z.object({
    sources: z.record(z.string(), z.unknown()),
  }).passthrough().parse(lock);
  const declarations = new Set(
    mathSourceRegistry.sources.map(({ source_id }) => source_id),
  );
  for (const sourceKey of Object.keys(parsed.sources).sort()) {
    const disposition = repositorySourceLockDispositions[
      sourceKey as keyof typeof repositorySourceLockDispositions
    ];
    if (!disposition) {
      throw new Error(
        `source lock entry ${sourceKey} has no Math Source Registry declaration`,
      );
    }
    if (
      disposition.kind === "registry_source"
      && !declarations.has(disposition.source_id)
    ) {
      throw new Error(
        `source lock entry ${sourceKey} maps to undeclared source ${disposition.source_id}`,
      );
    }
  }
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

function trackedPath(repository: string, relativePath: string): string {
  execFileSync("git", ["ls-files", "--error-unmatch", relativePath], {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return join(repository, relativePath);
}

async function json(path: string): Promise<Record<string, unknown>> {
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path}: expected a JSON object`);
  }
  return value as Record<string, unknown>;
}

function nestedString(
  value: Record<string, unknown>,
  path: string[],
): string {
  let current: unknown = value;
  for (const part of path) {
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      throw new Error(`source lock lacks ${path.join(".")}`);
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current !== "string" || current.trim() === "") {
    throw new Error(`source lock lacks ${path.join(".")}`);
  }
  return current;
}

export function requireLockedSnapshotRevision(
  lock: Record<string, unknown>,
  sourceKey: string,
  snapshot: Record<string, unknown>,
  snapshotRevisionKey: string,
): string {
  const expected = nestedString(lock, ["sources", sourceKey, "commit"]);
  const observed = nestedString(snapshot, [snapshotRevisionKey]);
  if (observed !== expected) {
    throw new Error(
      `${sourceKey}: retained snapshot revision ${observed} does not match source lock ${expected}`,
    );
  }
  return expected;
}

interface LocalAdapterInput {
  adapter: LocalSnapshotAdapterName;
  input: string;
  revision: string;
}

export interface AcquireProjectionSourceAdaptersOptions {
  repositoriesRoot: string;
  outputDirectory: string;
  formalRepository?: string;
  formalRevision?: string;
  formalPublishedDataset?: string;
  formalExtractedDataset?: string;
  formalRunExtractor?: boolean;
  oeisDataset?: string;
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
    throw new Error(`source lock has invalid GitHub repository ${value}`);
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

  const entry = repositoryRegistry.repositories.find(({ slug }) => slug === "math");
  if (!entry) throw new Error("typed repository registry lacks the mathematics repository");
  const repository = resolve(options.repositoriesRoot, entry.directory);
  const lockPath = trackedPath(repository, "sources.lock.json");
  const lock = await json(lockPath);
  assertKnownRepositorySourceLockEntries(lock);
  const wikiSnapshot = trackedPath(repository, "sources/wiki/registry.json");
  const gptSnapshot = trackedPath(repository, "sources/gpt_erdos/registry.json");
  const wiki = await json(wikiSnapshot);
  const gpt = await json(gptSnapshot);
  /* The Erdős problem registry is no longer among these. It is acquired from an
     exact checkout of the commit the lock pins, because its declaration retains
     nothing; the retained JSON it used to read was inherited rather than
     acquired and answered to no pin. */
  const localInputs: LocalAdapterInput[] = [
    {
      adapter: "erdos-ai-wiki",
      input: wikiSnapshot,
      revision: requireLockedSnapshotRevision(
        lock,
        "wiki",
        wiki,
        "wiki_commit",
      ),
    },
    {
      adapter: "gpt-erdos",
      input: gptSnapshot,
      revision: requireLockedSnapshotRevision(
        lock,
        "gpt_erdos",
        gpt,
        "commit",
      ),
    },
  ];
  const plbyLock = {
    repository: githubRepository(nestedString(lock, ["sources", "plby", "repo"])),
    revision: nestedString(lock, ["sources", "plby", "commit"]),
    manifestPath: nestedString(lock, ["sources", "plby", "path"]),
    expectedManifestRoot: nestedString(lock, ["sources", "plby", "sha256"]),
    logicalManifestLocator: nestedString(lock, ["sources", "plby", "url"]),
  };
  const jayyhkLock = {
    repository: githubRepository(nestedString(lock, ["sources", "jayyhk", "repo"])),
    revision: nestedString(lock, ["sources", "jayyhk", "commit"]),
    manifestPath: nestedString(lock, ["sources", "jayyhk", "path"]),
    expectedManifestRoot: nestedString(lock, ["sources", "jayyhk", "sha256"]),
    logicalManifestLocator: nestedString(lock, ["sources", "jayyhk", "url"]),
  };
  const williamLock = {
    repository: githubRepository(
      nestedString(lock, ["sources", "williamjblair_lean_proofs", "repo"]),
    ),
    revision: nestedString(
      lock,
      ["sources", "williamjblair_lean_proofs", "commit"],
    ),
    manifestPath: nestedString(
      lock,
      ["sources", "williamjblair_lean_proofs", "path"],
    ),
    expectedManifestRoot: nestedString(
      lock,
      ["sources", "williamjblair_lean_proofs", "sha256"],
    ),
    logicalManifestLocator: nestedString(
      lock,
      ["sources", "williamjblair_lean_proofs", "url"],
    ),
  };
  const erdosLock = (field: string) => nestedString(lock, ["sources", "erdos", field]);
  const outputs = await Promise.all([
    acquireErdosProblems({
      repository: githubRepository(erdosLock("repo")),
      revision: erdosLock("commit"),
      dataPath: erdosLock("path"),
      expectedDataRoot: erdosLock("sha256"),
      logicalLocator: erdosLock("url"),
    }),
    acquireOpenAiTenProofs({
      repository: options.openAiTenProofsRepository
        ?? openAiTenProofsRelease.repository,
      publicRepository: options.openAiTenProofsPublicRepository
        ?? openAiTenProofsRelease.public_repository,
      /* The lock, not the constant — and unlike Physlib next door the two
         agree, at 94bc0feb / 174289e4. That agreement is what makes this read
         safe rather than lucky: `openai-ten-proofs.ts` applies its five exact
         roots only when the revision IS the pinned release, so a lock that
         moved without the constant would acquire five unverified files. It no
         longer would — the adapter throws instead of falling back — but the
         reason to keep reading the lock is that the lock is what the Repository
         declares, and a disagreement should be reconciled by re-pinning rather
         than by quietly preferring one side. */
      revision: options.openAiTenProofsRevision
        ?? nestedString(lock, ["sources", "openai_ten_proofs", "commit"]),
      expectedTree: options.openAiTenProofsTree
        ?? nestedString(lock, ["sources", "openai_ten_proofs", "tree"]),
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
