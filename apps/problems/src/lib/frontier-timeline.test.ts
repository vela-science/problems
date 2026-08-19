import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  FrontierEdgeRecord,
  ProblemFrontierGap,
  ProblemFrontierTState,
} from "@vela/projection-data/read-contracts";
import { frontierBasisLabels, mapFrontierTimeline } from "./frontier-timeline";

const root = (digit: string): `sha256:${string}` => `sha256:${digit.repeat(64)}`;
const entityId = "problem:erdos:94";

function edge(overrides: Partial<FrontierEdgeRecord>): FrontierEdgeRecord {
  return {
    edge_id: `edge_${"0".repeat(32)}`,
    problem_entity_id: entityId,
    repository_id: "123e4567-e89b-42d3-a456-426614174000",
    source_kind: "claim",
    source_ref: "vcl_successor",
    source_root: null,
    target_kind: "claim",
    target_ref: "vcl_predecessor",
    target_root: null,
    relation: "corrects",
    basis: "authority_decided",
    basis_ref: {},
    nonclaims: [],
    row_root: root("f"),
    ...overrides,
  };
}

/* Mirrors the projection-data timeline fixture: an Erdős-94-like correction
 * chain — t0 accepts the predecessor, t1 removes it and accepts the corrected
 * successor. */
const states: ProblemFrontierTState[] = [
  {
    commit_sha: "1".repeat(40),
    committed_at: "2026-07-01T00:00:00Z",
    repository_root_before: root("e"),
    repository_root_after: root("f"),
    before_revision_root: root("9"),
    after_revision_root: root("0"),
    accepted_added: ["vcl_predecessor"],
    accepted_removed: [],
    semantic_delta: { schema: "vela.projection-semantic-delta.v1" },
  },
  {
    commit_sha: "2".repeat(40),
    committed_at: "2026-08-01T00:00:00Z",
    repository_root_before: root("f"),
    repository_root_after: root("a"),
    before_revision_root: root("0"),
    after_revision_root: root("2"),
    accepted_added: ["vcl_successor"],
    accepted_removed: ["vcl_predecessor"],
    semantic_delta: { schema: "vela.projection-semantic-delta.v1" },
  },
];

const edges: FrontierEdgeRecord[] = [
  edge({
    edge_id: `edge_${"1".repeat(32)}`,
    relation: "proposed_by",
    source_ref: "vcl_successor",
    target_kind: "proposal",
    target_ref: "vpr_successor",
    basis_ref: { kind: "decision_event", proposal_id: "vpr_successor" },
  }),
  edge({
    edge_id: `edge_${"2".repeat(32)}`,
    relation: "decided_by",
    source_kind: "proposal",
    source_ref: "vpr_successor",
    target_ref: "vcl_successor",
    basis_ref: {
      kind: "decision_event",
      reviewed_by: "human:will",
      decision_event_id: "vev_decision",
      applied_event_id: "vev_applied",
    },
  }),
  edge({
    edge_id: `edge_${"3".repeat(32)}`,
    relation: "verified_by",
    source_kind: "submission",
    source_ref: "vsb_package",
    target_kind: "verification",
    target_ref: "vvr_check",
    basis: "mechanically_verified",
    basis_ref: {
      kind: "verification_record",
      proposal_id: "vpr_successor",
      outcome: "pass",
      property: "statement_fidelity",
    },
    nonclaims: ["Standing"],
  }),
  edge({
    edge_id: `edge_${"4".repeat(32)}`,
    relation: "state_change",
    source_kind: "transition",
    source_ref: "2".repeat(40),
    target_ref: "vcl_successor",
    basis: "exact_derivation",
    basis_ref: { kind: "semantic_delta", change: "accepted_added", semantic_delta_root: root("3") },
  }),
];

const gaps: ProblemFrontierGap[] = [
  {
    kind: "unresolved_equivalence",
    problem_entity_id: entityId,
    occurrence_ref: "source:formal-conjectures/Erdos94.erdos_94",
    nonclaims: ["semantic equivalence not established"],
  },
  {
    kind: "verification_nonclaim",
    problem_entity_id: entityId,
    verification_ref: "vvr_check",
    nonclaims: ["Standing", "semantic equivalence"],
  },
];

const claims = [
  { id: "vcl_successor", assertion: "The corrected bound holds." },
  { id: "vcl_predecessor", assertion: "The original bound holds." },
];

describe("frontier timeline mapping", () => {
  it("maps each projection basis onto its fixed first-layer chip label", () => {
    expect(frontierBasisLabels).toEqual({
      source_asserted: "source-asserted",
      mechanically_verified: "checked",
      authority_decided: "repository decision",
      exact_derivation: "exact derivation",
      heuristic_advisory: "advisory",
    });
  });

  it("maps reader t-states and gaps onto the timeline contract", () => {
    const data = mapFrontierTimeline({
      states,
      edges,
      gaps,
      claims,
      claimHref: (claimId) => `/repositories/erdos-problems/claims/${claimId}`,
    });
    expect(data).not.toBeNull();
    expect(data!.states).toHaveLength(2);

    const [t0, current] = data!.states;
    expect(t0).toMatchObject({
      id: "1".repeat(40),
      label: "Result accepted",
      at: "2026-07-01T00:00:00Z",
      accepted: [{
        title: "The original bound holds.",
        href: "/repositories/erdos-problems/claims/vcl_predecessor",
      }],
      removed: [],
      /* No retained Proposal edges for t0, so the only step is the exact
         standing derivation. */
      evidence: [{ stage: "result standing", label: "Result accepted", basis: "exact derivation" }],
    });
    expect(t0.anchors).toMatchObject({
      repository_root_before: root("e"),
      repository_root_after: root("f"),
    });

    expect(current).toMatchObject({
      id: "2".repeat(40),
      label: "Result corrected",
      accepted: [{ title: "The corrected bound holds." }],
      removed: [{ title: "The original bound holds." }],
    });
    expect(current.evidence).toEqual([
      { stage: "submission", label: "Submission received", basis: "source-asserted" },
      { stage: "check", label: "Check passed", basis: "checked", detail: "statement fidelity" },
      { stage: "repository decision", label: "Decision applied", basis: "repository decision", detail: "human:will" },
      { stage: "result standing", label: "Result corrected", basis: "exact derivation" },
    ]);
    expect(current.anchors).toMatchObject({
      repository_root_before: root("f"),
      repository_root_after: root("a"),
      semantic_delta_root: root("3"),
      event_ids: ["vev_decision", "vev_applied"],
    });

    expect(data!.gaps).toEqual([
      {
        id: "unresolved_equivalence:source:formal-conjectures/Erdos94.erdos_94",
        sentence: "source:formal-conjectures/Erdos94.erdos_94 is grouped by the reviewed resolver; semantic equivalence not established.",
        basis: "advisory",
      },
      {
        id: "verification_nonclaim:vvr_check",
        sentence: "A check on vvr_check does not establish: Standing; semantic equivalence.",
        basis: "checked",
      },
    ]);
  });

  it("returns null for a Problem with no verified movement", () => {
    expect(mapFrontierTimeline({ states: [], edges, gaps, claims })).toBeNull();
  });

  it("falls back to the identifier when the removed Claim is no longer retained", () => {
    const data = mapFrontierTimeline({ states, edges, gaps, claims: claims.slice(0, 1) });
    expect(data!.states[1].removed).toEqual([{ title: "vcl_predecessor", href: null }]);
  });
});
