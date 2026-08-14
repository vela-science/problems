import { YAML } from "bun";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
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

export const physlibRelease = Object.freeze({
  repository: "https://github.com/leanprover-community/physlib.git",
  public_repository: "https://github.com/leanprover-community/physlib",
  /* The Web-owned projection adapter pins the exact commit, tree, and eight
     roots. Math owns scientific Standing, not this discovery acquisition. */
  commit: "e882411d1b6bcbdfdd336d4c509c6cc72e96842d",
  tree: "23c105e133d8c28cb5df81a8b6be52f0f25c0247",
  exact_roots: {
    license: "sha256:c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4",
    lean_toolchain: "sha256:cc346fd7850a83fb7af3902dfc378f74d8eb8c59c6d34322488269ebfe7615b1",
    lakefile: "sha256:9b6608c26fa30873fb8d823eadd7f66835992389a80c3e44b62e9803c8c65c01",
    lake_manifest: "sha256:a9531c3978f21e50cb72cc89c2a7644b296bee59a7f2ff92ca2408aac4a67311",
    ai_policy: "sha256:a639a2c51091911123600a376c7556b52d92ffd324b041df2e2a66ec7597ed49",
    agent_guidance: "sha256:487a9754f996304b173dd871326a094f4552d27df7151d60c56d83374e7711ca",
    api_map_guide: "sha256:0663b6828ab7635bd69a1bc5913d75c5f1b81640071f43f3db0e5e10f5d29ad1",
    review_guidelines: "sha256:e28f680f6fc0767840942aaa48da28bd9983cd48db8beec4ab77dafb4dbdab0b",
  },
} as const);

export const physlibAdapter = createSourceAdapterIdentity(
  "problems-data/physlib-api-maps",
  "3.0.0",
);

const requirementSchema = z.object({
  description: z.string().min(1),
  done: z.boolean(),
  location: z.string(),
}).strict().superRefine((value, context) => {
  if (value.done && (value.location.trim() === "" || value.location === "N/A")) {
    context.addIssue({
      code: "custom",
      path: ["location"],
      message: "implemented requirements need a source location",
    });
  }
});

const apiMapSchema = z.object({
  version: z.literal("v0.1"),
  Title: z.string().min(1),
  Overview: z.string().min(1),
  ParentAPIs: z.array(z.string().min(1)).nullable(),
  References: z.array(z.string().min(1)).nullable(),
  Requirements: z.array(requirementSchema).min(1),
}).strict();

type ExactRootKey = keyof typeof physlibRelease.exact_roots;

interface ExactFile {
  acquired: AcquiredBytes;
  root: `sha256:${string}`;
}

export interface PhyslibAcquisitionOptions {
  repository?: string;
  publicRepository?: string;
  revision?: string;
  expectedTree?: string;
  expectedRoots?: Partial<Record<ExactRootKey, string>>;
}

function exactLocator(publicRepository: string, commit: string, path: string): string {
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
      `Physlib ${path} root ${committed.content_root} does not match pinned root ${expectedRoot}`,
    );
  }
  const acquired = await acquireBytes(join(checkoutDirectory, path), {
    inputId,
    role: "published_dataset",
    mediaType,
    manifestLocator: exactLocator(publicRepository, commit, path),
  });
  if (acquired.input.content_root !== committed.content_root) {
    throw new Error(`Physlib ${path} working bytes differ from the exact committed blob`);
  }
  return { acquired, root: committed.content_root };
}

async function apiMapPaths(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name === "API-map.yaml") {
        found.push(relative(root, path).split(sep).join("/"));
      }
    }
  }
  await walk(join(root, "Physlib"));
  return found.sort();
}

function declaredLeanPaths(location: string): string[] {
  const paths = [...location.matchAll(/(?:^|;\s*)([^();]+\.lean)\s*\(/gu)]
    .map((match) => match[1].trim());
  return [...new Set(paths)].sort();
}

/**
 * Projects every native Physlib API-map requirement from one exact Git tree.
 * A source-declared `done` flag remains attributed metadata: this adapter does
 * not run Lean, the API-map linter, or Physlib review and cannot create Vela
 * Verification, Decision, or Standing.
 */
export async function acquirePhyslib(
  options: PhyslibAcquisitionOptions = {},
): Promise<SourceAdapterOutput> {
  const repository = options.repository ?? physlibRelease.repository;
  const publicRepository = options.publicRepository ?? physlibRelease.public_repository;
  const revision = options.revision ?? physlibRelease.commit;
  const expectedTree = options.expectedTree ?? physlibRelease.tree;
  const usesPinnedRelease = repository === physlibRelease.repository
    && revision === physlibRelease.commit
    && expectedTree === physlibRelease.tree;
  /* Fails closed. This used to fall back to `{}` for any revision that was not
     the pinned release, and `exactFile` skips its check when a root is
     undefined — so pointing the adapter at a different commit silently acquired
     eight unverified files. The caller that moves the revision is the caller
     that must say what it expects to find there. */
  const expectedRoots = options.expectedRoots
    ?? (usesPinnedRelease ? physlibRelease.exact_roots : undefined);
  if (expectedRoots === undefined) {
    throw new Error(
      `Physlib acquisition at ${revision} supplies no expected roots and is not the pinned release; pass expectedRoots to acquire an unpinned revision`,
    );
  }
  const checkout = await acquireExactGitCheckout(repository, revision);
  try {
    if (checkout.commit !== revision) {
      throw new Error(`Physlib resolved ${checkout.commit}, expected exact commit ${revision}`);
    }
    if (checkout.tree !== expectedTree) {
      throw new Error(
        `Physlib tree ${checkout.tree} does not match pinned tree ${expectedTree}`,
      );
    }

    const keyFiles = await Promise.all([
      exactFile(checkout.directory, checkout.commit, publicRepository, "LICENSE", "license", "text/plain", expectedRoots.license),
      exactFile(checkout.directory, checkout.commit, publicRepository, "lean-toolchain", "lean-toolchain", "text/plain", expectedRoots.lean_toolchain),
      exactFile(checkout.directory, checkout.commit, publicRepository, "lakefile.toml", "lakefile", "application/toml", expectedRoots.lakefile),
      exactFile(checkout.directory, checkout.commit, publicRepository, "lake-manifest.json", "lake-manifest", "application/json", expectedRoots.lake_manifest),
      exactFile(checkout.directory, checkout.commit, publicRepository, "AI-POLICY.md", "ai-policy", "text/markdown", expectedRoots.ai_policy),
      exactFile(checkout.directory, checkout.commit, publicRepository, "AGENTS.md", "agent-guidance", "text/markdown", expectedRoots.agent_guidance),
      exactFile(checkout.directory, checkout.commit, publicRepository, "docs/API_MAP_GUIDE.md", "api-map-guide", "text/markdown", expectedRoots.api_map_guide),
      exactFile(checkout.directory, checkout.commit, publicRepository, "docs/ReviewGuidelines.md", "review-guidelines", "text/markdown", expectedRoots.review_guidelines),
    ]);
    const [
      license,
      toolchain,
      lakefile,
      lakeManifest,
      aiPolicy,
      agentGuidance,
      apiMapGuide,
      reviewGuidelines,
    ] = keyFiles;
    const leanToolchain = Buffer.from(toolchain.acquired.bytes).toString("utf8").trim();
    const paths = await apiMapPaths(checkout.directory);
    if (paths.length === 0) throw new Error("Physlib exact tree contains no API maps");

    const records: SourceNativeRecord[] = [];
    for (const path of paths) {
      const mapFile = await exactFile(
        checkout.directory,
        checkout.commit,
        publicRepository,
        path,
        `api-map-${sha256(path).slice(7, 23)}`,
        "application/yaml",
      );
      const map = apiMapSchema.parse(
        YAML.parse(Buffer.from(mapFile.acquired.bytes).toString("utf8")),
      );
      for (const [index, requirement] of map.Requirements.entries()) {
        const declaredPaths = requirement.location.trim() === ""
          || requirement.location === "N/A"
          ? []
          : declaredLeanPaths(requirement.location);
        if (requirement.done && declaredPaths.length === 0) {
          throw new Error(`${path} requirement ${index + 1} has no parseable Lean source path`);
        }
        const exactSourceFiles = await Promise.all(declaredPaths.map(async (sourcePath) => {
          const blob = await gitBlobRoot(checkout.directory, checkout.commit, sourcePath);
          return { path: sourcePath, content_root: blob.content_root };
        }));
        const policyState = {
          ai_policy_root: aiPolicy.root,
          agent_guidance_root: agentGuidance.root,
          api_map_guide_root: apiMapGuide.root,
          review_guidelines_root: reviewGuidelines.root,
          license_root: license.root,
        };
        const environment = {
          lean_toolchain: leanToolchain,
          lean_toolchain_root: toolchain.root,
          lakefile_root: lakefile.root,
          lake_manifest_root: lakeManifest.root,
        };
        const ordinal = index + 1;
        records.push(createSourceNativeRecord({
          schema: "vela.source-native-record.v1",
          source_id: "source:physlib",
          native_id: `api-map:${path}#requirement:${ordinal}`,
          native_kind: "api_requirement",
          native_revision: checkout.commit,
          title: requirement.description,
          summary: `${map.Title} · source reports ${requirement.done ? "implemented" : "planned"}`,
          source_path: path,
          locators: [
            exactLocator(publicRepository, checkout.commit, path),
            ...declaredPaths.map((sourcePath) => (
              exactLocator(publicRepository, checkout.commit, sourcePath)
            )),
          ],
          metadata: {
            api_title: map.Title,
            api_overview: map.Overview.trim(),
            api_map_path: path,
            api_map_schema: map.version,
            api_map_root: mapFile.root,
            requirement_ordinal: ordinal,
            source_declared_done: requirement.done,
            source_declared_state: requirement.done
              ? "implemented"
              : declaredPaths.length > 0
                ? "planned_with_partial_location"
                : "planned",
            source_declared_location: requirement.location,
            /* Two aligned lists, not a list of `{path, content_root}` objects.
               `scalar()` in `source-adapters/projection.ts` canonical-JSONs
               every non-primitive, and a list of objects is the one shape
               `jsonArraySql` cannot rescue — it hands back each object's JSON
               as a string, so the obvious query returns rubbish rather than
               failing. Measured on the activated release, that was 232 records.
               Index i of each list is one file, in declaration order; the pairs
               are unchanged in `content_root` below, which still hashes
               `exact_source_files`. Same treatment, and the same reasoning, as
               `flatSubjects` in `formal-conjectures.ts`. */
            declared_source_file_paths: exactSourceFiles.map(({ path: file }) => file),
            declared_source_file_roots: exactSourceFiles.map(({ content_root: root }) => root),
            parent_apis: map.ParentAPIs ?? [],
            references: map.References ?? [],
            native_null_fields: [
              ...(map.ParentAPIs === null ? ["ParentAPIs"] : []),
              ...(map.References === null ? ["References"] : []),
            ],
            /* Spread, not nested. Both are objects this adapter composes, and
               every leaf is already named for what it is — `ai_policy_root`,
               `lean_toolchain_root` — so `<field>_<leaf>` would only produce
               `policy_state_ai_policy_root`. Nesting them cost the same as
               nesting anything else: `metadata -> 'policy_state' ->>
               'license_root'` read NULL on all 232 records.

               The pairs are unchanged where they are evidence rather than an
               index: `content_root` below still hashes both objects whole. */
            ...policyState,
            ...environment,
          },
          content_root: sha256(canonicalJson({
            requirement,
            api_map_path: path,
            api_map_root: mapFile.root,
            exact_source_files: exactSourceFiles,
            policy_state: policyState,
            exact_environment: environment,
          })),
        }));
      }
    }

    return {
      source_id: "source:physlib",
      adapter: physlibAdapter,
      revision: checkout.revision,
      inputs: [checkout.input, ...keyFiles.map(({ acquired }) => acquired.input)],
      records,
      coverage: {
        status: "complete",
        scope: `Every requirement in all ${paths.length} Physlib/API-map.yaml files at the exact pinned commit and tree.`,
        native_record_count: records.length,
        emitted_record_count: records.length,
        omitted_record_count: 0,
      },
      omissions: [
        {
          code: "issues_and_pull_requests_not_observed",
          description: "GitHub issue, pull-request, reviewer-allocation, and merge state remain outside this exact-Git API-map observation.",
        },
        {
          code: "todo_and_generated_site_not_projected",
          description: "The broader TODO index and generated physlib.io API tracker are not projected; the adapter covers only native tracked API-map files.",
        },
        {
          code: "physlib_alpha_not_mapped",
          description: "The observed revision contains no PhyslibAlpha API-map files, so this bundle projects stable Physlib API maps only.",
        },
      ],
      loss: [
        {
          code: "done_is_source_attribution",
          description: "A source-declared done flag reports native API-map state; it is not a Vela Claim, Verification, Decision, or Standing result.",
        },
        {
          code: "declarations_not_independently_checked",
          description: "The adapter confirms referenced Lean files exist but does not run Lean, the Physlib API-map linter, axiom checks, or declaration-name resolution.",
        },
        {
          code: "policy_not_review",
          description: "Binding exact AI and review policy bytes does not establish compliance, human understanding, scientific fidelity, or maintainer acceptance.",
        },
        {
          code: "requirement_ids_are_adapter_scoped",
          description: "Physlib requirements have no native stable IDs; record identities use the exact API-map path and one-based source ordinal at this revision.",
        },
        {
          code: "planned_locations_are_attributed",
          description: "The adapter preserves planned requirements that name partial or empty locations even when the API-map guide prescribes N/A; it does not normalize or infer completion from those fields.",
        },
      ],
    };
  } finally {
    await checkout.close();
  }
}
