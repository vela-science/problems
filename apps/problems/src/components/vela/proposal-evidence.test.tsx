import { renderToStaticMarkup } from "react-dom/server";
import type { ReviewSummary } from "@vela/projection-data";
import { describe, expect, test } from "vitest";
import { ProposalEvidence } from "./proposal-evidence";

const REQUIREMENT = "Replay Canopus Run run_2e2e8c0d with verifier capsule sha256:ace7a305.";
const SCOPE_ONE = "Replay the exact rooted dependency-free 306-tile checker and bind the canonical candidate root.";
const SCOPE_TWO = "Recompute the chordal counts and the exact alternating-mass contradiction gap.";
const LIMIT_SHARED = "Scientific acceptance or Standing.";
const LIMIT_ONE = "A full 313-tile exclusion or a global solution of Erdős problem 203.";

function review(overrides: Record<string, unknown> = {}): ReviewSummary {
  return {
    proposal_id: "vpr_one",
    status: "accepted",
    kind: "claim.add",
    target: "vcl_one",
    claim: "The pinned 307-tile chordal certificate family cannot cover Z^2.",
    content_root: null,
    receipt_root: null,
    created_at: "2026-08-05T05:49:01Z",
    reviewed_at: "2026-08-05T05:51:16Z",
    reviewed_by: "local:device-sha256:67fbb8e5",
    decision_actor_class: "human",
    decision_session_ref: null,
    decision_authority_principal_id: "local:device-sha256:67fbb8e5",
    decision_event_id: "vev_one",
    decision_plan_root: null,
    decision_provenance: "signed_record",
    applied_event_id: "vev_applied",
    decision_reason: "Accept the exact bounded 307-tile exclusion.",
    producer_package: {
      producer_actor: "agent:codex",
      submitted_at: "2026-08-05T05:48:37Z",
      verification_requirements: [REQUIREMENT],
      artifacts: [],
      caveats: [],
      replayability: "exact",
      requested_change_kind: "add_claim",
    },
    verification_records: [
      {
        verification_record_id: "vvr_one",
        verification_root: `sha256:${"f".repeat(64)}`,
        outcome: "pass",
        verifier_actor: "verifier:source-first-check",
        completed_at: "2026-08-05T05:50:15Z",
        property: SCOPE_ONE,
        does_not_establish: [LIMIT_SHARED, LIMIT_ONE],
        verifier_profile: "erdos-203-chordal-obstruction-v2",
        independent_of: ["agent:codex"],
      },
      {
        verification_record_id: "vvr_two",
        verification_root: `sha256:${"e".repeat(64)}`,
        outcome: "pass",
        verifier_actor: "verifier:second-pass",
        completed_at: "2026-08-05T05:52:15Z",
        property: SCOPE_TWO,
        does_not_establish: [LIMIT_SHARED],
        verifier_profile: "erdos-203-chordal-obstruction-v2",
        independent_of: [],
      },
    ],
    ...overrides,
  } as ReviewSummary;
}

const html = renderToStaticMarkup(<ProposalEvidence review={review()} />);

describe("proposal evidence", () => {
  test("prints the requirements the producer declared, verbatim and numbered", () => {
    expect(html).toContain("<ol");
    expect(html).toContain(REQUIREMENT);
  });

  test("gives each Verification Record its own scope sentence", () => {
    expect(html).toContain(SCOPE_ONE);
    expect(html).toContain(SCOPE_TWO);
    expect(html).toContain("verifier:source-first-check");
    expect(html).toContain("erdos-203-chordal-obstruction-v2");
  });

  test("names the verification axis on the outcome badge", () => {
    expect(html).toContain("verification pass");
  });

  test("states independence per record, including where none was declared", () => {
    expect(html).toContain("Declared independent of agent:codex.");
    expect(html).toContain("No independence declared.");
    expect(html).toContain("Produced by agent:codex.");
  });

  test("lists the union of what the verifiers refuse to establish, once each", () => {
    expect(html).toContain(LIMIT_ONE);
    expect(html.match(/Scientific acceptance or Standing\./gu)).toHaveLength(1);
  });

  test("a limit is prose, never a badge and never coloured", () => {
    const limits = html.slice(html.indexOf("Not established"));
    expect(limits).not.toContain("data-slot=\"badge\"");
    expect(limits).not.toContain("status-conflict");
  });

  test("a Proposal with no Verification Record says so instead of showing an empty list", () => {
    const bare = renderToStaticMarkup(<ProposalEvidence review={review({ verification_records: [] })} />);
    expect(bare).toContain("No Verification Record is retained for this Proposal.");
    expect(bare).not.toContain("Not established");
  });
});
