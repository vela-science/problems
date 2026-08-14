import { YAML } from "bun";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { canonicalJson, sha256 } from "../canonical";
import {
  acquireBytes,
  acquireExactGitCheckout,
  gitBlobRoot,
  type AcquiredBytes,
} from "./acquisition";
import type { SourceAdapterOutput } from "./bundle";
import {
  createSourceAdapterIdentity,
  createSourceNativeRecord,
  type SourceNativeRecord,
} from "./contracts";

const hashRootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);

/* Re-pinned 2026-08-05. openai/ten-proofs rewrote its history and the previous
   commit stopped being reachable — `upload-pack: not our ref` — which failed the
   whole projection refresh, because one unreachable source aborts the batch.
   The corpus at this commit still declares twelve Comparator profiles and still
   carries the challenge files the tests name, so coverage is unchanged; the
   bytes behind it are not the bytes the earlier release observed, and no copy
   of those survives upstream. LICENSE and lean-toolchain are byte-identical
   across the rewrite; formalization.yaml, lakefile.toml and lake-manifest.json
   are not, and their roots below were computed from a fresh checkout of the new
   commit rather than copied from the failing run's output. */
export const openAiTenProofsRelease = Object.freeze({
  repository: "https://github.com/openai/ten-proofs.git",
  public_repository: "https://github.com/openai/ten-proofs",
  commit: "94bc0feb6a9ff12c7d31d6de640a725c9d43d2b6",
  tree: "174289e4d4958cb0509874e6e53400e098213de7",
  exact_roots: {
    license: "sha256:c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4",
    formalization_manifest: "sha256:464eb3e11eb02d74eab5b5d87d0cbf8d28056ace00a85a5096850523e7e88ff5",
    lean_toolchain: "sha256:2773c517aa90b66ea8a2c52bddddf84393157797f8341be0df45294fff7fd32e",
    lakefile: "sha256:9d59a0912d88d2997584b4a2dfa3cb077e06b71f91823234778e2030a1b02902",
    lake_manifest: "sha256:d366c97598e820009831d12376d4e41004b1847ac6074ec79b15bf9e1ea09d46",
  },
} as const);

export const openAiTenProofsAdapter = createSourceAdapterIdentity(
  "problems-data/openai-ten-proofs",
  "2.0.0",
);

const comparatorConfigSchema = z.object({
  challenge_module: z.string().min(1),
  solution_module: z.string().min(1),
  theorem_names: z.array(z.string().min(1)).min(1),
  definition_names: z.array(z.string().min(1)).optional(),
  permitted_axioms: z.array(z.string().min(1)),
  enable_nanoda: z.boolean(),
}).strict();

const formalizationSchema = z.object({
  version: z.string().min(1),
  project: z.object({
    name: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    license: z.literal("Apache-2.0"),
  }).passthrough(),
  status: z.object({
    scope: z.string().min(1),
    axioms: z.array(z.string().min(1)),
    /* The rewrite added four per-result fields upstream: the Lean declaration
       the result is proved under, the file holding it, its sorry count, and the
       axioms it depends on. They are declared rather than passed through,
       because a strict object is what makes a fifth field a failure a person
       looks at instead of a field the observation silently drops — and because
       sorry_count and the axiom list are precisely what a reader comparing this
       corpus against a Repository's own Lean evidence would want retained. They
       are optional so the schema still reads a manifest written before the
       rewrite. */
    main_results: z.array(z.object({
      name: z.string().min(1),
      declaration: z.string().min(1).optional(),
      file: z.string().min(1).optional(),
      sorry_count: z.number().int().nonnegative().optional(),
      axioms: z.array(z.string().min(1)).optional(),
      comparator_config: z.string().regex(/^ComparatorChallenges\/[A-Za-z0-9_]+\.json$/u),
    }).strict()).length(12),
  }).passthrough(),
  review: z.object({
    status: z.string().min(1),
  }).passthrough(),
}).passthrough();

const lakeManifestSchema = z.object({
  version: z.string().min(1),
  packages: z.array(z.object({
    name: z.string().min(1),
    url: z.string().url(),
    rev: z.string().min(1),
    inputRev: z.string().min(1),
  }).passthrough()),
}).passthrough();

type ExactRootKey = keyof typeof openAiTenProofsRelease.exact_roots;

interface ExactFile {
  acquired: AcquiredBytes;
  root: `sha256:${string}`;
}

export interface OpenAiTenProofsAcquisitionOptions {
  repository?: string;
  publicRepository?: string;
  revision?: string;
  expectedTree?: string;
  expectedRoots?: Partial<Record<ExactRootKey, string>>;
}

function modulePath(moduleName: string): string {
  return `${moduleName.replaceAll(".", "/")}.lean`;
}

function exactLocator(
  publicRepository: string,
  commit: string,
  path: string,
): string {
  return `${publicRepository}/blob/${commit}/${path}`;
}

async function exactFile(
  checkoutDirectory: string,
  commit: string,
  publicRepository: string,
  path: string,
  inputId: string,
  mediaType: string,
  expectedRoot?: string,
): Promise<ExactFile> {
  const committed = await gitBlobRoot(checkoutDirectory, commit, path);
  if (expectedRoot !== undefined && committed.content_root !== hashRootSchema.parse(expectedRoot)) {
    throw new Error(
      `OpenAI ten-proofs ${path} root ${committed.content_root} does not match pinned root ${expectedRoot}`,
    );
  }
  const acquired = await acquireBytes(join(checkoutDirectory, path), {
    inputId,
    role: "published_dataset",
    mediaType,
    manifestLocator: exactLocator(publicRepository, commit, path),
  });
  if (acquired.input.content_root !== committed.content_root) {
    throw new Error(`OpenAI ten-proofs ${path} working bytes differ from the exact committed blob`);
  }
  return { acquired, root: committed.content_root };
}

function unique(values: ReadonlyArray<string>, label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`OpenAI ten-proofs repeats ${label}`);
  }
}

/**
 * Projects the twelve published Comparator configurations from one detached,
 * exact repository revision. This observes release structure only: it does not
 * run Lean or Comparator and cannot create Verification or Standing.
 */
export async function acquireOpenAiTenProofs(
  options: OpenAiTenProofsAcquisitionOptions = {},
): Promise<SourceAdapterOutput> {
  const repository = options.repository ?? openAiTenProofsRelease.repository;
  const publicRepository = options.publicRepository
    ?? openAiTenProofsRelease.public_repository;
  const revision = options.revision ?? openAiTenProofsRelease.commit;
  const expectedTree = options.expectedTree ?? openAiTenProofsRelease.tree;
  const usesPinnedRelease = repository === openAiTenProofsRelease.repository
    && revision === openAiTenProofsRelease.commit
    && expectedTree === openAiTenProofsRelease.tree;
  /* Fails closed, for the reason recorded beside the same line in
     `physlib.ts`: falling back to `{}` off the pinned release means `exactFile`
     skips its check on every one of these files, so pointing the adapter at
     another commit silently acquires five unverified ones. The caller that
     moves the revision is the caller that must say what it expects there. */
  const expectedRoots = options.expectedRoots
    ?? (usesPinnedRelease ? openAiTenProofsRelease.exact_roots : undefined);
  if (expectedRoots === undefined) {
    throw new Error(
      `OpenAI ten-proofs acquisition at ${revision} supplies no expected roots and is not the pinned release; pass expectedRoots to acquire an unpinned revision`,
    );
  }
  const checkout = await acquireExactGitCheckout(repository, revision);
  try {
    if (checkout.commit !== revision) {
      throw new Error(
        `OpenAI ten-proofs resolved ${checkout.commit}, expected exact commit ${revision}`,
      );
    }
    if (checkout.tree !== expectedTree) {
      throw new Error(
        `OpenAI ten-proofs tree ${checkout.tree} does not match pinned tree ${expectedTree}`,
      );
    }

    const license = await exactFile(
      checkout.directory,
      checkout.commit,
      publicRepository,
      "LICENSE",
      "license",
      "text/plain",
      expectedRoots.license,
    );
    const formalization = await exactFile(
      checkout.directory,
      checkout.commit,
      publicRepository,
      "formalization.yaml",
      "formalization-manifest",
      "application/yaml",
      expectedRoots.formalization_manifest,
    );
    const toolchain = await exactFile(
      checkout.directory,
      checkout.commit,
      publicRepository,
      "lean-toolchain",
      "lean-toolchain",
      "text/plain",
      expectedRoots.lean_toolchain,
    );
    const lakefile = await exactFile(
      checkout.directory,
      checkout.commit,
      publicRepository,
      "lakefile.toml",
      "lakefile",
      "application/toml",
      expectedRoots.lakefile,
    );
    const lakeManifest = await exactFile(
      checkout.directory,
      checkout.commit,
      publicRepository,
      "lake-manifest.json",
      "lake-manifest",
      "application/json",
      expectedRoots.lake_manifest,
    );

    const release = formalizationSchema.parse(
      YAML.parse(Buffer.from(formalization.acquired.bytes).toString("utf8")),
    );
    const dependencies = lakeManifestSchema.parse(
      JSON.parse(Buffer.from(lakeManifest.acquired.bytes).toString("utf8")),
    );
    const leanToolchain = Buffer.from(toolchain.acquired.bytes).toString("utf8").trim();
    if (leanToolchain !== "leanprover/lean4:v4.32.0") {
      throw new Error(`OpenAI ten-proofs has unexpected Lean toolchain ${leanToolchain}`);
    }
    const declaredConfigs = release.status.main_results.map(
      ({ comparator_config }) => comparator_config,
    );
    unique(declaredConfigs, "Comparator config paths");
    const repositoryConfigs = (await readdir(join(checkout.directory, "ComparatorChallenges")))
      .filter((path) => path.endsWith(".json"))
      .map((path) => `ComparatorChallenges/${path}`)
      .sort();
    if (canonicalJson([...declaredConfigs].sort()) !== canonicalJson(repositoryConfigs)) {
      throw new Error("OpenAI ten-proofs formalization manifest and Comparator config inventory disagree");
    }

    const records: SourceNativeRecord[] = [];
    for (const result of release.status.main_results) {
      const config = await exactFile(
        checkout.directory,
        checkout.commit,
        publicRepository,
        result.comparator_config,
        `comparator-${result.comparator_config.split("/").at(-1)?.replace(/\.json$/u, "").toLowerCase()}`,
        "application/json",
      );
      const parsed = comparatorConfigSchema.parse(
        JSON.parse(Buffer.from(config.acquired.bytes).toString("utf8")),
      );
      unique(parsed.permitted_axioms, `${result.comparator_config} permitted axioms`);
      if (
        canonicalJson([...parsed.permitted_axioms].sort())
        !== canonicalJson([...release.status.axioms].sort())
      ) {
        throw new Error(`${result.comparator_config}: permitted axioms differ from formalization manifest`);
      }
      const challengePath = modulePath(parsed.challenge_module);
      const solutionPath = modulePath(parsed.solution_module);
      const challenge = await gitBlobRoot(
        checkout.directory,
        checkout.commit,
        challengePath,
      );
      const solution = await gitBlobRoot(
        checkout.directory,
        checkout.commit,
        solutionPath,
      );
      const nativeId = result.comparator_config
        .slice("ComparatorChallenges/".length, -".json".length);
      const exactEnvironment = {
        lean_toolchain: leanToolchain,
        lean_toolchain_root: toolchain.root,
        lakefile_root: lakefile.root,
        lake_manifest_root: lakeManifest.root,
        formalization_manifest_root: formalization.root,
        license_root: license.root,
        dependencies: dependencies.packages.map((dependency) => ({
          name: dependency.name,
          url: dependency.url,
          input_revision: dependency.inputRev,
          commit: dependency.rev,
        })),
      };
      /* Destructured rather than spread-then-overwritten: setting a key to
         `undefined` beside a spread leaves the key present, and a metadata key
         whose value is undefined is a third thing for a reader to interpret. */
      const { dependencies: lakeDependencies, ...environmentLeaves } = exactEnvironment;
      const exactFiles = {
        comparator_config: {
          path: result.comparator_config,
          content_root: config.root,
        },
        challenge: {
          path: challengePath,
          content_root: challenge.content_root,
        },
        solution: {
          path: solutionPath,
          content_root: solution.content_root,
        },
      };
      records.push(createSourceNativeRecord({
        schema: "vela.source-native-record.v1",
        source_id: "source:openai-ten-proofs",
        native_id: `comparator:${nativeId}`,
        native_kind: "comparator_profile",
        native_revision: checkout.commit,
        title: result.name,
        summary: `${parsed.theorem_names.length} declared theorem${parsed.theorem_names.length === 1 ? "" : "s"} in ${parsed.solution_module}`,
        source_path: result.comparator_config,
        locators: [
          exactLocator(publicRepository, checkout.commit, result.comparator_config),
          exactLocator(publicRepository, checkout.commit, challengePath),
          exactLocator(publicRepository, checkout.commit, solutionPath),
        ],
        metadata: {
          challenge_module: parsed.challenge_module,
          solution_module: parsed.solution_module,
          theorem_names: parsed.theorem_names,
          definition_names: parsed.definition_names ?? [],
          permitted_axioms: parsed.permitted_axioms,
          enable_nanoda: parsed.enable_nanoda,
          source_declared_review_status: release.review.status,
          /* Spread and split, not nested. Both are objects this adapter
             composes, and nesting them cost what nesting always costs here:
             `metadata -> 'exact_environment' ->> 'lean_toolchain'` read NULL on
             all twelve records. The six environment leaves are already named
             for what they are; the three file entries become a path and a root
             each; and `dependencies`, a list of objects, becomes four aligned
             lists in the shape `flatSubjects` uses one adapter over — index i
             of each is one Lake dependency, in manifest order.

             `content_root` below still hashes both objects whole, which is
             where they are the evidence rather than the index. */
          ...environmentLeaves,
          dependency_names: lakeDependencies.map(({ name }) => name),
          dependency_urls: lakeDependencies.map(({ url }) => url),
          dependency_input_revisions: lakeDependencies.map(({ input_revision: revision }) => revision),
          dependency_commits: lakeDependencies.map(({ commit }) => commit),
          comparator_config_path: exactFiles.comparator_config.path,
          comparator_config_root: exactFiles.comparator_config.content_root,
          challenge_path: exactFiles.challenge.path,
          challenge_root: exactFiles.challenge.content_root,
          solution_path: exactFiles.solution.path,
          solution_root: exactFiles.solution.content_root,
        },
        content_root: sha256(canonicalJson({
          result,
          config: parsed,
          exact_files: exactFiles,
          exact_environment: exactEnvironment,
        })),
      }));
    }

    return {
      source_id: "source:openai-ten-proofs",
      adapter: openAiTenProofsAdapter,
      revision: checkout.revision,
      inputs: [
        checkout.input,
        license.acquired.input,
        formalization.acquired.input,
        toolchain.acquired.input,
        lakefile.acquired.input,
        lakeManifest.acquired.input,
      ],
      records,
      coverage: {
        status: "complete",
        scope: "All twelve Comparator profiles declared by formalization.yaml at the exact pinned OpenAI ten-proofs commit and tree.",
        native_record_count: declaredConfigs.length,
        emitted_record_count: records.length,
        omitted_record_count: 0,
      },
      omissions: [
        {
          code: "manuscript_bytes_not_repackaged",
          description: "The announcement, manuscripts, and discovery-note PDFs remain exact external locators; this Git adapter does not copy publication bytes into the Registry bundle.",
        },
        {
          code: "discovery_process_not_observed",
          description: "Prompts, rejected attempts, raw model traces, complete human interventions, selection procedure, and per-result cost are not present in this repository release.",
        },
      ],
      loss: [
        {
          code: "profile_not_reproduction",
          description: "Presence of a Comparator profile and Lean source is not an independent build, Comparator run, or Verification Record.",
        },
        {
          code: "formalization_not_fidelity",
          description: "A checked formal theorem would not by itself establish statement fidelity, novelty, field acceptance, or Vela Standing.",
        },
        {
          code: "publisher_review_is_attributed",
          description: "The source-declared agent-reviewed label remains publisher-attributed metadata and does not create independent review or authority.",
        },
      ],
    };
  } finally {
    await checkout.close();
  }
}
