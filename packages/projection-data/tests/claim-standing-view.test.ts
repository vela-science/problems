import { describe, expect, test } from "bun:test";
import {
  buildClaimStandingView,
  type ClaimSummary,
  type ReviewSummary,
} from "../src/index";

const claimRoot = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const submissionRoot = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const verificationRoot = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const decisionRoot = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

function claim(standing: ClaimSummary["standing"] = "accepted"): ClaimSummary {
  return {
    id: "vcl_exact",
    root: claimRoot,
    source_path: "records/claims/sha256/a",
    standing,
    assertion: "An exact bounded Claim.",
    assertion_type: "computational",
    conditions: ["Bounded to the retained artifact."],
    created: "2026-07-30T12:00:00Z",
    source_title: "Authenticated Submission",
    source_type: "submission",
    has_proposal: true,
    contested: false,
    retracted: false,
    evidence_count: 1,
    revision: 1,
    relation_count: 0,
  };
}

function review(overrides: Partial<ReviewSummary> = {}): ReviewSummary {
  return {
    proposal_id: "vpr_exact",
    status: "accepted",
    kind: "accept_claim",
    target: "vcl_exact",
    claim: "An exact bounded Claim.",
    content_root: claimRoot,
    receipt_root: submissionRoot,
    created_at: "2026-07-30T12:01:00Z",
    reviewed_at: "2026-07-30T12:03:00Z",
    reviewed_by: "reviewer:human",
    decision_actor_class: "human",
    decision_session_ref: null,
    decision_authority_principal_id: "local:fixture",
    decision_event_id: "vev_exact",
    decision_plan_root: decisionRoot,
    decision_provenance: "signed_record",
    applied_event_id: "vev_exact",
    decision_reason: "Accept the exact bounded result.",
    producer_package_kind: "submission_v1",
    producer_package_id: "vsb_exact",
    producer_package_root: submissionRoot,
    verification_status: "pass",
    verification_record_count: 1,
    verification_records: [{
      verification_record_id: "vvr_exact",
      verification_root: verificationRoot,
      outcome: "pass",
      verifier_actor: "verifier:frozen",
      completed_at: "2026-07-30T12:02:00Z",
    }],
    ...overrides,
  };
}

describe("Claim Standing view", () => {
  test("retains the exact Submission, Verification, Proposal, and Decision reason", () => {
    expect(buildClaimStandingView(claim(), [review()])).toEqual({
      claim_id: "vcl_exact",
      standing: "accepted",
      lineage_state: "retained",
      lineages: [{
        submission: { id: "vsb_exact", root: submissionRoot },
        /* This fixture's record declares no `scope`, so the two assurance
           fields are null and empty rather than absent — an unscoped record is
           a record that said nothing, not one that said "no limits". */
        verifications: [{
          id: "vvr_exact",
          root: verificationRoot,
          outcome: "pass",
          property: null,
          does_not_establish: [],
          verifier: "verifier:frozen",
          verifier_profile: null,
          completed_at: "2026-07-30T12:02:00Z",
        }],
        proposal: {
          id: "vpr_exact",
          status: "accepted",
          claim_root: claimRoot,
          created_at: "2026-07-30T12:01:00Z",
        },
        decision: {
          provenance: "signed_record",
          event_id: "vev_exact",
          applied_event_id: "vev_exact",
          plan_root: decisionRoot,
          reason: "Accept the exact bounded result.",
          decided_at: "2026-07-30T12:03:00Z",
          decided_by: "reviewer:human",
          performer_class: "human",
          session_ref: null,
          authority_principal_id: "local:fixture",
        },
      }],
    });
  });

  test("does not turn a passing Verification into accepted Standing", () => {
    /* The Claim is `unassessed` while the Proposal about it is `pending_review`.
       Two axes, two words, in one fixture — the standing does not borrow the
       Proposal's. */
    const standingView = buildClaimStandingView(claim("unassessed"), [
      review({
        status: "pending_review",
        reviewed_at: null,
        reviewed_by: null,
        decision_event_id: null,
        decision_plan_root: null,
        decision_provenance: "pending",
        applied_event_id: null,
        decision_reason: null,
      }),
    ]);

    expect(standingView.standing).toBe("unassessed");
    expect(standingView.lineages[0]?.verifications[0]?.outcome).toBe("pass");
    expect(standingView.lineages[0]?.decision).toBeNull();
  });

  test("names unavailable historical lineage instead of inferring it", () => {
    expect(buildClaimStandingView(claim(), [])).toMatchObject({
      lineage_state: "not_projected",
      lineages: [],
    });
  });

  test("fails closed when a Proposal binds a different Claim root", () => {
    expect(() => buildClaimStandingView(claim(), [review({
      content_root: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    })])).toThrow("Proposal binds a different Claim root");
  });
});

describe("the standing a Claim reports", () => {
  test("is the projected column, with nothing translated on read", () => {
    expect(buildClaimStandingView(claim("unassessed"), []).standing).toBe("unassessed");
    expect(buildClaimStandingView(claim(), []).standing).toBe("accepted");
  });

  /* The column carried `pending_review` until the projection separated the two
     axes at the builder. A row still spelling it is upstream drift, not a
     standing to be quietly translated into one. */
  test("refuses a Proposal-axis word rather than mapping it", () => {
    const drifted = { ...claim(), standing: "pending_review" } as unknown as ClaimSummary;
    expect(() => buildClaimStandingView(drifted, [])).toThrow("no exact Standing");
  });

  test("promotes no source flag or Submission-authored condition onto it", () => {
    const flagged = { ...claim("unassessed"), contested: true, retracted: true };
    expect(buildClaimStandingView(flagged, []).standing).toBe("unassessed");
  });
});
