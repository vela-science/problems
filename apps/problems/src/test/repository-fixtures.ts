import type { ProjectionManifest } from "@vela/projection-data";
import { velaRelease } from "@vela/projection-data/release";
import { repositoryRegistry } from "@vela/projection-data/registry";

const hash = (character: string) => `sha256:${character.repeat(64)}` as const;
const commit = (character: string) => character.repeat(40);

export function projectionManifestFixture(): ProjectionManifest {
  return {
    schema: "vela.projection-release-manifest",
    generated_at: "2026-07-21T00:00:00Z",
    activation_time: "2026-07-21T00:00:00Z",
    vela_version: `vela ${velaRelease.version}`,
    vela_binary_sha256: velaRelease.generator_binary_sha256 as `sha256:${string}`,
    release_root: hash("b"),
    table_roots: { repositories: hash("1") },
    source_registry: {
      schema: "vela.math-source-registry-release.v1",
      declaration_root: hash("2"),
      observation_bundle_root: hash("3"),
      source_count: 14,
      observation_count: 14,
      native_record_count: 2_833,
      release_source_count: 14,
      repository_binding_count: 2_833,
    },
    /* The registry's own slugs. This used to name four repositories literally,
       and the registry now holds one, so the fixture asserted a shape the
       manifest schema can no longer be handed. Reading the registry keeps it
       from going stale again the next time a repository is added or retired —
       nothing below depends on which repositories those are. */
    source_repositories: repositoryRegistry.repositories.map(({ repository_id }, index) => ({
      repository_id,
      commit: commit(String(index + 1)),
      tree: commit(String(index + 5)),
      origin_id: `vro_${String(index + 1).repeat(16)}`,
      origin_root: hash("c"),
      repository_root: hash("d"),
      authority_keyset_root: hash("e"),
      authority_policy_root: hash("f"),
      claim_count: index === 0 ? 2_770 : 1,
      accepted_claim_count: index === 0 ? 2_770 : 1,
      pending_claim_count: 0,
      review_count: index === 0 ? 13 : 0,
      submission_count: 0,
      verification_count: 0,
      graph_source_root: null,
      graph_layout_root: null,
      graph_node_count: 0,
      graph_edge_count: 0,
      problem_count: 0,
      graph_claim_count: 0,
    })),
  };
}
