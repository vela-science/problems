import { describe, expect, test } from "bun:test";
import { buildClaimStandingView, claimFromRow } from "./index";

function row(overrides: Record<string, unknown> = {}) {
  return {
    claim_id: "vcl_exact",
    claim_root: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    standing: "accepted",
    assertion: "An exact bounded Claim.",
    assertion_kind: "computational",
    conditions: ["Bounded to the retained artifact.", "Caveat: no optimality is established."],
    created_at: "2026-06-16T00:00:00Z",
    source_title: "Authenticated Submission vsb_exact",
    source_type: "submission",
    contested: false,
    retracted: false,
    evidence_count: 1,
    record: { revision: 1, relations: [] },
    ...overrides,
  };
}

describe("claimFromRow", () => {
  test("an accepted Claim with no retained Proposal carries none", () => {
    const claim = claimFromRow(row());
    expect(claim.standing).toBe("accepted");
    expect(claim.has_proposal).toBe(false);
  });

  test("has_proposal follows the retained Proposal, not the standing", () => {
    expect(claimFromRow(row({ proposal_recorded: true })).has_proposal).toBe(true);
    expect(
      claimFromRow(row({ standing: "pending_review", proposal_recorded: true })).has_proposal,
    ).toBe(true);
    expect(
      claimFromRow(row({ standing: "pending_review", proposal_recorded: false })).has_proposal,
    ).toBe(false);
  });

  test("conditions keep the boundary between them", () => {
    expect(claimFromRow(row()).conditions).toEqual([
      "Bounded to the retained artifact.",
      "Caveat: no optimality is established.",
    ]);
    expect(claimFromRow(row({ conditions: [] })).conditions).toEqual([]);
  });

  test("revision and relation count come from the retained record", () => {
    const revised = claimFromRow(row({ record: { revision: 2, relations: [{ kind: "supersedes" }] } }));
    expect(revised.revision).toBe(2);
    expect(revised.relation_count).toBe(1);
    const unrecorded = claimFromRow(row({ record: {} }));
    expect(unrecorded.revision).toBeNull();
    expect(unrecorded.relation_count).toBe(0);
  });

  test("a mapped Claim agrees with the Standing view on the same reviews", () => {
    const claim = claimFromRow(row({ proposal_recorded: true }));
    const standingView = buildClaimStandingView(claim, [
      {
        proposal_id: "vpr_exact",
        status: "accepted",
        kind: "accept_claim",
        target: claim.id,
        claim: claim.assertion,
        content_root: claim.root ?? null,
        receipt_root: null,
        created_at: "2026-06-16T00:01:00Z",
        reviewed_at: "2026-06-16T00:02:00Z",
        reviewed_by: "reviewer:human",
        decision_actor_class: "human",
        decision_session_ref: null,
        decision_authority_principal_id: "local:fixture",
        decision_event_id: "vev_exact",
        decision_plan_root: null,
        decision_provenance: "signed_record",
        applied_event_id: "vev_exact",
        decision_reason: "Accept the exact bounded result.",
        producer_package_kind: "unrecorded",
        producer_package_id: null,
        producer_package_root: null,
        verification_status: "not_attempted",
        verification_record_count: 0,
        verification_records: [],
        decision_packet: null,
      },
    ] as Parameters<typeof buildClaimStandingView>[1]);
    expect(standingView.lineages).toHaveLength(1);
    expect(claim.has_proposal).toBe(standingView.lineages.length > 0);
  });
});

describe("the Claim ledger's Proposal key", () => {
  /* `projection.reviews` carries both `target` and `claim`, and only `target`
     holds a Claim identifier. Nothing else in this package can catch the wrong
     column without a database: the wrong one returns a plausible integer that
     the ledger would print under a gold spine. */
  test("every reviews predicate over a Claim binds target", async () => {
    const source = await Bun.file(new URL("./index.ts", import.meta.url)).text();
    expect(source).toContain("r.target = f.claim_id");
    expect(source).not.toContain("r.claim = f.claim_id");
  });
});
