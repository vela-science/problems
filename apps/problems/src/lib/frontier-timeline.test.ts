import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  FrontierEdgeRecord,
  ProblemFrontierGap,
  ProblemFrontierTState,
} from "@vela/projection-data/read-contracts";
import { frontierBasisLabels, mapFrontierTimeline, shortResultTitle } from "./frontier-timeline";

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
    /* Live nonclaims end with their own period; the gap sentence supplies the
       terminal one, which doubled it on the live Erdős 94 History page. */
    nonclaims: ["Standing."],
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
    nonclaims: ["Standing.", "semantic equivalence"],
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
      exact_derivation: "derived from records",
      heuristic_advisory: "heuristic advisory",
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
      evidence: [{ stage: "result standing", label: "Result accepted", basis: "derived from records" }],
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
      { stage: "result standing", label: "Result corrected", basis: "derived from records" },
    ]);
    expect(current.anchors).toMatchObject({
      repository_root_before: root("f"),
      repository_root_after: root("a"),
      semantic_delta_root: root("3"),
      event_ids: ["vev_decision", "vev_applied"],
    });

    /* Gap sentences are first-layer: no raw occurrence or record identifiers,
       which move to `ref`, and no doubled terminal period when a nonclaim
       carries its own. */
    expect(data!.gaps).toEqual([
      {
        id: "unresolved_equivalence:source:formal-conjectures/Erdos94.erdos_94",
        sentence: "A grouped formal statement may state a different theorem; equivalence not established.",
        basis: "heuristic advisory",
        ref: "source:formal-conjectures/Erdos94.erdos_94",
      },
      {
        id: "verification_nonclaim:vvr_check",
        sentence: "This check does not establish: Standing; semantic equivalence.",
        basis: "checked",
        ref: "vvr_check",
      },
    ]);
  });

  it("states an agent decision performer as an AI agent at first layer", () => {
    const agentEdges = edges.map((record) => (record.relation === "decided_by"
      ? { ...record, basis_ref: { ...record.basis_ref, reviewed_by: "agent:submission-v3-migration" } }
      : record));
    const data = mapFrontierTimeline({ states, edges: agentEdges, gaps, claims });
    expect(data!.states[1].evidence).toContainEqual({
      stage: "repository decision",
      label: "Decision applied",
      basis: "repository decision",
      detail: "AI agent submission-v3-migration",
    });
  });

  it("returns null for a Problem with no verified movement", () => {
    expect(mapFrontierTimeline({ states: [], edges, gaps, claims })).toBeNull();
  });

  it("falls back to the identifier when the removed Claim is no longer retained", () => {
    const data = mapFrontierTimeline({ states, edges, gaps, claims: claims.slice(0, 1) });
    expect(data!.states[1].removed).toEqual([{ title: "vcl_predecessor", href: null }]);
  });

  it("titles a Result ref with the Overview's short summary, not the whole assertion", () => {
    /* The live Erdős 94 assertion: 736 characters that repeated as the title
       of every accepted and removed ref on the History page. */
    const assertion = "At lean-proofs commit 423344341fbfdf4f8f684a302c5d05379125e7dc, Erdos94.variants.sum_multiplicity proves that for every finite planar point set P, the sum over its distinct determined distances of the unordered-pair distance multiplicities equals P.card.choose 2, matching Formal Conjectures commit 94a278e06a8bcbc2e4f2935e491c0c115ec832e0. For occurrence resolution only, the exact occurrence Erdos94.erdos_94.variants.sum_multiplicity is associated with problem:erdos:94 under resolver entity root sha256:32f6e98a826da23c12c7cfcb8853e4712de130136c59f0454bd115c3fdb1e6b1. That occurrence is one of four Erdős 94 declarations Formal Conjectures publishes, and this identity does not establish the cubic distance-multiplicity conjecture.";
    const data = mapFrontierTimeline({
      states,
      edges,
      gaps,
      claims: [{ id: "vcl_successor", assertion }, claims[1]!],
      claimHref: (claimId) => `/repositories/erdos-problems/claims/${claimId}`,
    });
    expect(data!.states[1].accepted).toEqual([{
      title: "For every finite planar point set P, the sum over its distinct determined distances of the unordered-pair distance multiplicities equals P.card.choose 2",
      href: "/repositories/erdos-problems/claims/vcl_successor",
    }]);
  });
});

describe("shortResultTitle", () => {
  it("keeps a short single-sentence assertion whole", () => {
    expect(shortResultTitle("The corrected bound holds.")).toBe("The corrected bound holds.");
  });

  it("takes the first sentence when no Overview headline shape matches", () => {
    expect(shortResultTitle("A finite check confirms the identity at n = 146. The search space above that bound remains open."))
      .toBe("A finite check confirms the identity at n = 146.");
  });

  it("truncates a long first sentence near 140 characters with an ellipsis", () => {
    const sentence = `The retained computation enumerates ${"a very long clause ".repeat(10)}without a boundary.`;
    const title = shortResultTitle(sentence);
    expect(title.length).toBeLessThanOrEqual(140);
    expect(title.endsWith("…")).toBe(true);
    expect(sentence.startsWith(title.slice(0, -1))).toBe(true);
  });
});
