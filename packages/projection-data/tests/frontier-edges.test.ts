import { describe, expect, test } from "bun:test";
import {
  frontierProjectionManifestBlock,
  projectFrontierEdges,
} from "../scripts/projection-builder.mjs";
import { canonicalJson, sha256 } from "../src/canonical";
import type { ProblemResolutionConfig } from "../src/problem-resolution";
import {
  assembleProblemFrontierTimeline,
  deriveProblemFrontierGaps,
  parseFrontierEdgeRecord,
  type FrontierEdgeRecord,
} from "../src/read-contracts";

const root = (digit: string): `sha256:${string}` => `sha256:${digit.repeat(64)}`;
const repositoryId = "123e4567-e89b-42d3-a456-426614174000";
const entityId = "problem:erdos:94";

/* A reviewed-resolver fixture shaped like one parsed problem-resolution
   entity: an Erdős catalog anchor, one Formal Conjectures statement, and one
   attributed-activity occurrence. */
const resolutionConfig: ProblemResolutionConfig = {
  schema: "vela.problem-resolution.v1",
  semantics: {
    authority_effect: "none",
    entity_effect: "navigation_group_only",
    candidate_effect: "shared_namespace_and_source_number_only",
    statement_identity: "not_established",
    equivalence: "not_established",
  },
  candidate_sources: [],
  entities: [{
    entity_id: entityId,
    resolution_namespace: "erdos-problems",
    label: "Erdős problem 94",
    problem_number: 94,
    canonical_occurrence: {
      source_id: "source:erdos-problems",
      native_id: "erdos:94",
      native_kind: "problem",
      content_root: root("a"),
    },
    reviewed_occurrences: [
      {
        source_id: "source:formal-conjectures",
        native_id: "Erdos94.erdos_94",
        native_kind: "formal_conjecture",
        content_root: root("b"),
        relation_kind: "formal_statement_reference",
      },
      {
        source_id: "source:vibemathed",
        native_id: "vibemathed:94",
        native_kind: "attributed_activity",
        content_root: root("c"),
        relation_kind: "attributed_activity_reference",
      },
    ],
  }],
};

const nativeRecords = [
  {
    source_id: "source:erdos-problems", native_id: "erdos:94",
    native_kind: "problem", content_root: root("a"), row_root: root("1"),
  },
  {
    source_id: "source:formal-conjectures", native_id: "Erdos94.erdos_94",
    native_kind: "formal_conjecture", content_root: root("b"), row_root: root("2"),
  },
  {
    source_id: "source:vibemathed", native_id: "vibemathed:94",
    native_kind: "attributed_activity", content_root: root("c"), row_root: root("3"),
  },
];

const sourceDeclarations = [
  { source_id: "source:erdos-problems", declaration_root: root("d") },
];

const acceptedClaim = {
  repository_id: repositoryId,
  claim_id: "vcl_successor",
  claim_root: root("4"),
  standing: "accepted",
  record: {
    evidence: [{ artifact_id: "a".repeat(64), artifact_root: root("a") }],
    relations: [{ kind: "corrects", target_claim_id: "vcl_predecessor" }],
  },
};
const retiredClaim = {
  repository_id: repositoryId,
  claim_id: "vcl_predecessor",
  claim_root: root("5"),
  standing: "corrected",
  record: { evidence: [], relations: [] },
};
const pendingClaim = {
  repository_id: repositoryId,
  claim_id: "vcl_pending",
  claim_root: root("6"),
  standing: "unassessed",
  record: {
    evidence: [{ artifact_id: "b".repeat(64), artifact_root: root("b") }],
    relations: [],
  },
};

const reviews = [
  {
    repository_id: repositoryId,
    proposal_id: "vpr_successor",
    status: "accepted",
    target: "vcl_successor",
    content_root: root("4"),
    decision_provenance: "signed_record",
    decision_event_id: "vev_decision",
    applied_event_id: "vev_applied",
    reviewed_by: "human:will",
    decision_actor_class: "human",
    claim_retirement: null,
    retired_by_claim_id: null,
  },
  {
    repository_id: repositoryId,
    proposal_id: "vpr_predecessor",
    status: "accepted",
    target: "vcl_predecessor",
    content_root: root("5"),
    decision_provenance: "signed_record",
    decision_event_id: "vev_earlier",
    applied_event_id: "vev_earlier_applied",
    reviewed_by: "human:will",
    decision_actor_class: "human",
    claim_retirement: "corrected",
    retired_by_claim_id: "vcl_successor",
  },
  {
    repository_id: repositoryId,
    proposal_id: "vpr_pending",
    status: "pending_review",
    target: "vcl_pending",
    content_root: root("6"),
    decision_provenance: "pending",
    decision_event_id: null,
    applied_event_id: null,
    reviewed_by: null,
    decision_actor_class: null,
    claim_retirement: null,
    retired_by_claim_id: null,
  },
];

const verifications = [{
  repository_id: repositoryId,
  verification_record_id: "vvr_check",
  verification_root: root("7"),
  submission_id: "vsb_package",
  submission_root: root("8"),
  proposal_id: "vpr_successor",
  claim_id: "vcl_successor",
  outcome: "pass",
  property: "statement_fidelity",
  does_not_establish: ["Standing", "semantic equivalence"],
}];

const transitions = [
  {
    repository_id: repositoryId,
    commit_sha: "1".repeat(40),
    comparison_state: "verified",
    accepted_added: ["vcl_predecessor"],
    accepted_removed: [],
    repository_root_before: root("e"),
    repository_root_after: root("f"),
    before_revision_root: root("9"),
    after_revision_root: root("0"),
    semantic_delta_root: root("1"),
    semantic_delta: { schema: "vela.projection-semantic-delta.v1" },
  },
  {
    repository_id: repositoryId,
    commit_sha: "2".repeat(40),
    comparison_state: "verified",
    accepted_added: ["vcl_successor"],
    accepted_removed: ["vcl_predecessor"],
    repository_root_before: root("f"),
    repository_root_after: root("a"),
    before_revision_root: root("0"),
    after_revision_root: root("2"),
    semantic_delta_root: root("3"),
    semantic_delta: { schema: "vela.projection-semantic-delta.v1" },
  },
  {
    repository_id: repositoryId,
    commit_sha: "3".repeat(40),
    comparison_state: "unavailable",
    accepted_added: ["vcl_ghost"],
    accepted_removed: [],
    repository_root_before: null,
    repository_root_after: root("b"),
    before_revision_root: null,
    after_revision_root: null,
    semantic_delta_root: null,
    semantic_delta: null,
  },
];

const claimProblemBindings = new Map([
  ["vcl_successor", {
    claim_root: root("4"),
    entity_id: entityId,
    packet_root: root("c"),
    occurrences: [{
      source_id: "source:vibemathed",
      native_id: "vibemathed:94",
      native_kind: "attributed_activity",
      content_root: root("c"),
    }],
  }],
  ["vcl_predecessor", {
    claim_root: root("5"),
    entity_id: entityId,
    packet_root: root("c"),
    occurrences: [],
  }],
]);

function buildFixtureEdges() {
  return projectFrontierEdges({
    claims: [acceptedClaim, retiredClaim, pendingClaim],
    reviews,
    verifications,
    transitions,
    nativeRecords,
    sourceDeclarations,
    resolutionConfig,
    claimProblemBindings,
    classifySourceId: (claim: { claim_id: string }) => (
      claim.claim_id === "vcl_successor" ? "source:erdos-problems" : null
    ),
  }) as Array<Omit<FrontierEdgeRecord, "row_root">>;
}

const edge = (
  edges: ReturnType<typeof buildFixtureEdges>,
  relation: string,
  sourceRef: string,
  targetRef: string,
) => {
  const matches = edges.filter((candidate) => (
    candidate.relation === relation
    && candidate.source_ref === sourceRef
    && candidate.target_ref === targetRef
  ));
  expect(matches).toHaveLength(1);
  return matches[0];
};

describe("frontier edge projection", () => {
  test("assigns the exact basis class per record class", () => {
    const edges = buildFixtureEdges();

    expect(edge(edges, "occurrence_of", "source:erdos-problems/erdos:94", entityId)).toMatchObject({
      basis: "source_asserted",
      problem_entity_id: entityId,
      source_root: root("1"),
      basis_ref: { kind: "native_record", native_id: "erdos:94" },
    });
    expect(edge(edges, "formalizes", "source:formal-conjectures/Erdos94.erdos_94", entityId)).toMatchObject({
      basis: "source_asserted",
      basis_ref: { kind: "native_record", native_id: "Erdos94.erdos_94" },
    });
    /* Resolver grouping alone is advisory; the packet-bound occurrence is a
       Decision and names the retained packet bytes. */
    expect(edge(edges, "grouped_with", "source:formal-conjectures/Erdos94.erdos_94", entityId)).toMatchObject({
      basis: "heuristic_advisory",
      nonclaims: ["semantic equivalence not established"],
      basis_ref: { kind: "reviewed_resolver_entity", entity_id: entityId },
    });
    expect(edge(edges, "grouped_with", "source:vibemathed/vibemathed:94", entityId)).toMatchObject({
      basis: "authority_decided",
      nonclaims: [],
      basis_ref: {
        kind: "claim_occurrence_packet",
        claim_id: "vcl_successor",
        packet_root: root("c"),
      },
    });

    expect(edge(edges, "evidence_for", "a".repeat(64), "vcl_successor")).toMatchObject({
      basis: "authority_decided",
      problem_entity_id: entityId,
      basis_ref: { kind: "decision_event", proposal_id: "vpr_successor", decision_event_id: "vev_decision" },
    });
    expect(edge(edges, "evidence_for", "b".repeat(64), "vcl_pending")).toMatchObject({
      basis: "source_asserted",
      problem_entity_id: null,
      basis_ref: { kind: "claim_record", claim_id: "vcl_pending", standing: "unassessed" },
    });

    expect(edge(edges, "corrects", "vcl_successor", "vcl_predecessor")).toMatchObject({
      basis: "authority_decided",
      target_root: root("5"),
      basis_ref: { kind: "decision_event", proposal_id: "vpr_predecessor", claim_retirement: "corrected" },
    });

    expect(edge(edges, "external_dependency", "vcl_successor", "source:erdos-problems")).toMatchObject({
      basis: "source_asserted",
      target_kind: "external_reference",
      target_root: root("d"),
      basis_ref: { kind: "source_declaration", declaration_root: root("d") },
    });

    expect(edge(edges, "proposed_by", "vcl_successor", "vpr_successor")).toMatchObject({
      basis: "authority_decided",
      basis_ref: { kind: "decision_event", decision_event_id: "vev_decision" },
    });
    expect(edge(edges, "decided_by", "vpr_successor", "vcl_successor")).toMatchObject({
      basis: "authority_decided",
    });
    /* A pending Proposal has no decision provenance to rest an edge on. */
    expect(edges.filter(({ source_ref, target_ref }) => (
      source_ref === "vpr_pending" || target_ref === "vpr_pending"
    ))).toHaveLength(0);

    expect(edge(edges, "verified_by", "vsb_package", "vvr_check")).toMatchObject({
      basis: "mechanically_verified",
      nonclaims: ["Standing", "semantic equivalence"],
      basis_ref: { kind: "verification_record", outcome: "pass", property: "statement_fidelity" },
    });

    expect(edge(edges, "state_change", "2".repeat(40), "vcl_successor")).toMatchObject({
      basis: "exact_derivation",
      problem_entity_id: entityId,
      basis_ref: {
        kind: "semantic_delta",
        change: "accepted_added",
        repository_root_before: root("f"),
        repository_root_after: root("a"),
      },
    });
    expect(edge(edges, "state_change", "2".repeat(40), "vcl_predecessor")).toMatchObject({
      basis_ref: { change: "accepted_removed" },
    });
    /* An unverified comparison has no exact derivation to state. */
    expect(edges.filter(({ source_ref }) => source_ref === "3".repeat(40))).toHaveLength(0);
    expect(edges.filter(({ target_ref }) => target_ref === "vcl_ghost")).toHaveLength(0);
  });

  test("derives deterministic identity from canonical edge fields", () => {
    const first = buildFixtureEdges();
    const second = buildFixtureEdges();
    expect(canonicalJson(second)).toBe(canonicalJson(first));
    for (const row of first) {
      expect(row.edge_id).toMatch(/^edge_[0-9a-f]{32}$/u);
    }
    expect(new Set(first.map(({ edge_id }) => edge_id)).size).toBe(first.length);
  });

  test("carries no Palomar rows, importance scores, or inferred upgrades", () => {
    const edges = buildFixtureEdges();
    const serialized = canonicalJson(edges).toLocaleLowerCase();
    expect(serialized).not.toContain("palomar");
    expect(serialized).not.toContain("importance");
    /* Every heuristic edge says what it does not establish. */
    for (const row of edges.filter(({ basis }) => basis === "heuristic_advisory")) {
      expect(row.nonclaims).toContain("semantic equivalence not established");
    }
  });

  /* Steering: no authority effect on the edge plane. A Claim citing a Palomar
     record reaches the graph only through the generic external-dependency
     emitter — an `external_reference` edge whose basis is `source_asserted`
     and whose basis_ref names the retained declaration. Palomar's registered
     status and mechanical pass upgrade nothing: Vela ran none of the kernels,
     so no Palomar-targeted edge may claim `mechanically_verified`. */
  test("emits a Palomar external_reference edge as source-asserted, never mechanically verified", () => {
    const palomarDeclarationRoot = root("9");
    const edges = projectFrontierEdges({
      claims: [acceptedClaim, retiredClaim, pendingClaim],
      reviews,
      verifications,
      transitions,
      nativeRecords,
      sourceDeclarations: [
        ...sourceDeclarations,
        { source_id: "source:palomar-registry", declaration_root: palomarDeclarationRoot },
      ],
      resolutionConfig,
      claimProblemBindings,
      classifySourceId: (claim: { claim_id: string }) => (
        claim.claim_id === "vcl_pending" ? "source:palomar-registry" : null
      ),
    }) as Array<Omit<FrontierEdgeRecord, "row_root">>;
    expect(edge(edges, "external_dependency", "vcl_pending", "source:palomar-registry")).toMatchObject({
      target_kind: "external_reference",
      basis: "source_asserted",
      target_root: palomarDeclarationRoot,
      basis_ref: {
        kind: "source_declaration",
        source_id: "source:palomar-registry",
        declaration_root: palomarDeclarationRoot,
      },
    });
    for (const row of edges.filter(({ target_ref }) => target_ref === "source:palomar-registry")) {
      expect(row.basis).toBe("source_asserted");
    }
  });

  test("summarizes the manifest block as a partition of the edges", () => {
    const edges = buildFixtureEdges();
    const block = frontierProjectionManifestBlock(edges);
    expect(block.schema).toBe("site.frontier-projection.v1");
    expect(block.edge_count).toBe(edges.length);
    expect(
      Object.values(block.basis_counts).reduce((total, count) => total + count, 0),
    ).toBe(edges.length);
    expect(block.basis_counts.heuristic_advisory).toBe(1);
    expect(block.basis_counts.exact_derivation).toBe(3);
  });
});

const rooted = (row: Omit<FrontierEdgeRecord, "row_root">): FrontierEdgeRecord => (
  { ...row, row_root: sha256(canonicalJson(row)) } as FrontierEdgeRecord
);

describe("problem frontier reads", () => {
  test("parses only exact edge rows", () => {
    const [row] = buildFixtureEdges();
    expect(parseFrontierEdgeRecord(rooted(row)).edge_id).toBe(row.edge_id);
    expect(() => parseFrontierEdgeRecord(rooted({ ...row, basis: "vibes" as never })))
      .toThrow(/unknown value vibes/u);
    expect(() => parseFrontierEdgeRecord(rooted({ ...row, relation: "influences" as never })))
      .toThrow(/unknown value influences/u);
    expect(() => parseFrontierEdgeRecord({ ...rooted(row), nonclaims: "none" }))
      .toThrow(/nonclaims must be an array/u);
  });

  test("derives gaps from the edge window instead of storing them", () => {
    const edges = buildFixtureEdges().map(rooted).map((row) => parseFrontierEdgeRecord(row));
    const gaps = deriveProblemFrontierGaps(edges);
    /* The entity carries an accepted Claim, so no occurrence is orphaned. */
    expect(gaps.filter(({ kind }) => kind === "occurrence_without_accepted_claim")).toHaveLength(0);
    expect(gaps.filter(({ kind }) => kind === "unresolved_equivalence")).toEqual([{
      kind: "unresolved_equivalence",
      problem_entity_id: entityId,
      occurrence_ref: "source:formal-conjectures/Erdos94.erdos_94",
      nonclaims: ["semantic equivalence not established"],
    }]);
    expect(gaps.filter(({ kind }) => kind === "verification_nonclaim")).toEqual([{
      kind: "verification_nonclaim",
      problem_entity_id: entityId,
      verification_ref: "vvr_check",
      nonclaims: ["Standing", "semantic equivalence"],
    }]);

    /* Without any Decision-based edge the occurrences surface as gaps. */
    const undecided = edges.filter(({ basis, relation }) => (
      basis !== "authority_decided" && relation !== "state_change"
    ));
    const orphaned = deriveProblemFrontierGaps(undecided)
      .filter(({ kind }) => kind === "occurrence_without_accepted_claim");
    expect(orphaned.map((gap) => "occurrence_ref" in gap && gap.occurrence_ref).sort()).toEqual([
      "source:erdos-problems/erdos:94",
      "source:formal-conjectures/Erdos94.erdos_94",
    ]);
  });

  test("assembles an Erdős-94-like t0-to-current timeline from projected rows", () => {
    const transitionByCommit = new Map(transitions.map((transition) => [transition.commit_sha, transition]));
    const committedAt = new Map([
      ["1".repeat(40), "2026-07-01T00:00:00Z"],
      ["2".repeat(40), "2026-08-01T00:00:00Z"],
    ]);
    const rows = buildFixtureEdges()
      .filter(({ relation, problem_entity_id }) => relation === "state_change" && problem_entity_id === entityId)
      .map((row) => {
        const transition = transitionByCommit.get(row.source_ref)!;
        return {
          ...rooted(row),
          repository_root_before: transition.repository_root_before,
          repository_root_after: transition.repository_root_after,
          before_revision_root: transition.before_revision_root,
          after_revision_root: transition.after_revision_root,
          semantic_delta: transition.semantic_delta,
          committed_at: committedAt.get(row.source_ref) ?? null,
        };
      });

    const states = assembleProblemFrontierTimeline(rows);
    expect(states).toHaveLength(2);
    expect(states[0]).toMatchObject({
      commit_sha: "1".repeat(40),
      repository_root_before: root("e"),
      repository_root_after: root("f"),
      accepted_added: ["vcl_predecessor"],
      accepted_removed: [],
      semantic_delta: { schema: "vela.projection-semantic-delta.v1" },
    });
    expect(states[1]).toMatchObject({
      commit_sha: "2".repeat(40),
      repository_root_before: root("f"),
      repository_root_after: root("a"),
      accepted_added: ["vcl_successor"],
      accepted_removed: ["vcl_predecessor"],
    });

    const drifted = rows.map((row) => (
      row.relation === "state_change" ? { ...row, basis: "heuristic_advisory" } : row
    ));
    expect(() => assembleProblemFrontierTimeline(drifted))
      .toThrow(/exact state_change edges/u);
  });

  test("keeps the SQL reads root-bound and keyset-paged", async () => {
    const source = await Bun.file(new URL("../src/read-contracts.ts", import.meta.url)).text();
    const start = source.indexOf("export async function problemFrontier");
    const end = source.indexOf("export interface SearchReadQuery", start);
    const implementation = source.slice(start, end);
    expect(implementation).not.toMatch(/\bOFFSET\b/u);
    expect(implementation).toContain("release_root=$1");
    expect(implementation).toContain("edge_id > $3");
    expect(implementation).toContain("ORDER BY edge_id LIMIT $4");
    expect(implementation).toContain("edge.relation='state_change'");
    expect(implementation).toContain("transition.commit_sha = edge.source_ref");
  });
});
