import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { neon } from "@neondatabase/serverless";
import {
  buildProjection,
} from "./projection-builder.mjs";
import {
  acquireProjectionSourceAdapters,
} from "../src/source-adapters/refresh.ts";
import {
  loadProjectionSourceAdapterArtifact,
  projectionSourceAdapterArtifactFilename,
  writeProjectionSourceAdapterArtifact,
} from "../src/source-adapters/artifact.ts";
import { slugForRepositoryId } from "../src/registry.ts";
import {
  activateCandidate,
  confirmCurrentRelease,
  corpusDropOverrideVariable,
  currentStoredRelease,
  insertCandidate,
  releaseFactsEqual,
  storedRelease,
  verifyCandidate,
} from "./projection-store.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoriesRoot = resolve(process.env.VELA_REPOSITORIES_ROOT ?? join(root, "../../.."));
const vela = process.env.VELA_BIN ?? "vela";

if (process.argv.length !== 2) throw new Error("refresh-neon-projection accepts no arguments");
const databaseUrl = process.env.VELA_PROJECTION_WRITER_DATABASE_URL;
if (!databaseUrl) throw new Error("set VELA_PROJECTION_WRITER_DATABASE_URL to refresh the projection");

const adapterStaging = process.env.VELA_SOURCE_ADAPTER_ARTIFACT
  ? null
  : await mkdtemp(join(tmpdir(), "vela-projection-source-adapters-"));
let sourceAdapters;
let candidate;
try {
  let artifactPath = process.env.VELA_SOURCE_ADAPTER_ARTIFACT;
  if (!artifactPath) {
    const acquired = await acquireProjectionSourceAdapters({
        outputDirectory: join(adapterStaging, "set"),
        formalRepository: process.env.VELA_FORMAL_CONJECTURES_REPOSITORY,
        formalRevision: process.env.VELA_FORMAL_CONJECTURES_REVISION,
        formalPublishedDataset: process.env.VELA_FORMAL_CONJECTURES_PUBLISHED_DATA,
        formalExtractedDataset: process.env.VELA_FORMAL_CONJECTURES_EXTRACTED_DATA,
        formalRunExtractor: process.env.VELA_FORMAL_CONJECTURES_RUN_EXTRACTOR === "1",
      });
    artifactPath = join(
      adapterStaging,
      projectionSourceAdapterArtifactFilename(acquired.manifest.set_root),
    );
    await writeProjectionSourceAdapterArtifact(
      join(adapterStaging, "set/source-adapters.json"),
      artifactPath,
    );
  }
  sourceAdapters = await loadProjectionSourceAdapterArtifact(artifactPath);
  const projectionInputs = {
    repositoriesRoot,
    vela,
    sourceAdapterBundles: sourceAdapters.bundles,
    sourceAdapterArtifact: sourceAdapters.reference,
  };
  const candidates = [1, 2].map(() => buildProjection({
    ...projectionInputs,
  }));
  if (!releaseFactsEqual(candidates[0].manifest, candidates[1].manifest)) {
    throw new Error("two current source projections disagree");
  }
  candidate = candidates[0];
} finally {
  if (adapterStaging) {
    await rm(adapterStaging, { recursive: true, force: true });
  }
}
let changed = true;
let releaseRoot = candidate.manifest.release_root;
let retention = { ok: true, refusals: [], overridden: false };
let corpus = null;
let confirmation;
const sql = neon(databaseUrl);
const current = await currentStoredRelease(sql);
const expectedCurrentRoot = current?.release_root ?? null;
if (current && releaseFactsEqual(current, candidate.manifest)) {
  changed = false;
  releaseRoot = current.release_root;
  /* Nothing to activate, and something to record. This branch is the healthy
     steady state — the sources were quiet and the projection re-derived to the
     same root — and it used to write nothing at all, so it was indistinguishable
     from the pipeline having stopped. */
  confirmation = await confirmCurrentRelease(sql, releaseRoot);
} else {
  const stored = await storedRelease(sql, candidate.manifest.release_root);
  if (stored && !releaseFactsEqual(stored, candidate.manifest)) {
    throw new Error(
      `stored candidate ${candidate.manifest.release_root} does not match the rebuilt release facts`,
    );
  }
  if (!stored) await insertCandidate(sql, candidate);
  /* The corpus floor's verdict, kept rather than discarded. `verifyCandidate`
     throws on a refusal, so the interesting case is the one it does not throw
     on: an operator set VELA_PROJECTION_ALLOW_CORPUS_DROP and a release that
     lost most of its corpus activated on purpose. That is the single most
     consequential thing a refresh can do, and it was invisible — the call was
     bare, so the override left no trace in the output anyone reads. */
  const verified = await verifyCandidate(sql, candidate);
  retention = verified.retention ?? retention;
  corpus = verified.corpus ?? corpus;
  confirmation = await activateCandidate(sql, candidate.manifest, { expectedCurrentRoot });
}
if (retention.overridden) {
  console.error(
    `::warning::activated a release that fell below the corpus floor because `
    + `${corpusDropOverrideVariable} was set: ${retention.refusals.join("; ")}`,
  );
}
console.log(JSON.stringify({
  ok: true, changed, activated: changed,
  corpus, corpus_floor_overridden: retention.overridden,
  confirmed_at: new Date(confirmation.confirmed_at).toISOString(),
  corpus_floor_refusals: retention.refusals,
  schema: candidate.manifest.schema, release_root: releaseRoot,
  source_adapter_set_root: sourceAdapters.manifest.set_root,
  source_adapter_artifact_root: sourceAdapters.artifact.artifact_root,
  source_adapters: sourceAdapters.manifest.sources,
  vela: candidate.manifest.vela_version,
  repositories: candidate.manifest.source_repositories.map((repository) => ({
    repository_id: repository.repository_id,
    route_slug: slugForRepositoryId(repository.repository_id),
    commit: repository.commit,
    claims: repository.claim_count,
    accepted_claims: repository.accepted_claim_count,
    pending_claims: repository.pending_claim_count,
    reviews: repository.review_count,
    submissions: repository.submission_count,
    verifications: repository.verification_count,
    graph_nodes: repository.graph_node_count,
    graph_edges: repository.graph_edge_count,
    problems: repository.problem_count,
    graph_source_root: repository.graph_source_root,
    graph_layout_root: repository.graph_layout_root,
    origin_root: repository.origin_root,
    repository_root: repository.repository_root,
    authority_keyset_root: repository.authority_keyset_root,
    authority_policy_root: repository.authority_policy_root,
  })),
}));
