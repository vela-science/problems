import { describe, expect, test } from "bun:test";
import { buildClaimStandingView, reviewFromRow, siteRepositorySchema, verificationCore } from "./index";
import { currentProposedStatePreview } from "./proposed-state-preview";

const CLAIM_ROOT = `sha256:${"a".repeat(64)}`;
const SUBMISSION_ROOT = `sha256:${"b".repeat(64)}`;
const VERIFICATION_ROOT = `sha256:${"c".repeat(64)}`;
const ARTIFACT_DIGEST = `sha256:${"d".repeat(64)}`;

function reviewRow(overrides: Record<string, unknown> = {}) {
  return {
    repository_id: "123e4567-e89b-42d3-a456-426614174000",
    proposal_id: "vpr_exact",
    status: "accepted",
    kind: "add_claim",
    target: "vcl_exact",
    claim: "An exact bounded Claim.",
    content_root: CLAIM_ROOT,
    receipt_root: null,
    created_at: "2026-07-31T01:17:01.883Z",
    reviewed_at: "2026-07-31T04:33:12.000Z",
    reviewed_by: "local:device-sha256:67fbb8e5",
    decision_actor_class: "human",
    decision_session_ref: null,
    decision_authority_principal_id: "local:device-sha256:67fbb8e5",
    decision_event_id: "vev_exact",
    decision_plan_root: null,
    decision_provenance: "signed_record",
    applied_event_id: "vev_exact",
    decision_reason: "Accept the bounded negative result.",
    decision_packet: null,
    ...overrides,
  };
}

function submissionRow(overrides: Record<string, unknown> = {}) {
  return {
    submission_id: "vsb_exact",
    submission_root: SUBMISSION_ROOT,
    proposal_id: "vpr_exact",
    producer_actor: "agent:canopus-local",
    submitted_at: "2026-07-31T01:17:01.883Z",
    record: {
      artifacts: [
        { kind: "text/plain", path: "records/artifacts/sha256/d", digest: ARTIFACT_DIGEST },
      ],
      caveats: ["The search is bounded and establishes no universal nonexistence."],
      replayability: "exact",
      verification_requirements: [
        "Replay the bounded search with the frozen verifier capsule.",
        "Confirm the candidate digest against the retained artifact.",
      ],
      requested_change: { kind: "add_claim" },
    },
    ...overrides,
  };
}

function verificationRow(overrides: Record<string, unknown> = {}) {
  return {
    verification_record_id: "vvr_exact",
    verification_root: VERIFICATION_ROOT,
    proposal_id: "vpr_exact",
    outcome: "pass",
    verifier_actor: "agent:vela-verifier",
    /* A `timestamptz` column, so the driver hands back a Date and the mapper
       normalises it. `started_at` below is retained inside the record's own
       JSON, where the producer's declared string is the value and nothing
       re-derives it — the two are deliberately different treatments and the
       fixture states both. */
    completed_at: new Date("2026-07-31T02:24:09Z"),
    record: {
      started_at: "2026-07-31T02:24:03Z",
      method: {
        profile: "erdos1056-bounded-search-replay-v1",
        implementation: "Canopus frozen verifier linux-arm64",
        environment_root: VERIFICATION_ROOT,
      },
      scope: {
        property: "Replay the bounded search with the frozen verifier capsule.",
        does_not_establish: [
          "The bounded negative result does not resolve the problem.",
          "Verifier passage is evidence only, not accepted Claim standing.",
        ],
      },
      independence: {
        declared_independent_of: ["agent:codex"],
        shared_dependencies: ["Same local operator and container runtime."],
      },
    },
    ...overrides,
  };
}

describe("reviewFromRow lifts the Verification Record's own words", () => {
  test("verifies the rooted proposed-state preview instead of trusting JSONB", () => {
    const hash = (digit: string) => `sha256:${digit.repeat(64)}`;
    const preview = currentProposedStatePreview({
      entry: {
        proposal_id: "vpr_exact",
        entry_root: hash("1"),
        inputs: {
          repository_root: hash("2"),
          proposal_root: hash("3"),
          claim_root: hash("4"),
          submission_root: hash("5"),
          verification_set_root: hash("6"),
        },
        authority_heads: {
          policy_bundle_root: hash("7"),
          authority_keyset_root: hash("8"),
          authority_record_root: hash("9"),
          authority_event_log_root: hash("a"),
        },
        standing_delta: {
          before: { repository_root: hash("2") },
          if_accept: { repository_root: hash("b") },
          if_reject: { repository_root: hash("c") },
        },
        staleness: { state: "current" },
      },
      projectionRoot: hash("d"),
      revision: {
        git_commit: "e".repeat(40),
        repository_root: hash("2"),
        row_root: hash("f"),
      },
    });
    expect(reviewFromRow(reviewRow({ proposed_state_preview: preview }), submissionRow(), []))
      .toMatchObject({ proposed_state_preview: { preview_root: preview.preview_root } });

    const drift = structuredClone(preview);
    drift.predictions!.if_accept_repository_root = hash("0");
    expect(() => reviewFromRow(
      reviewRow({ proposed_state_preview: drift }),
      submissionRow(),
      [],
    )).toThrow("preview root drift");
  });

  test("scope, method profile, independence, and start time reach the record", () => {
    const review = reviewFromRow(reviewRow(), submissionRow(), [verificationRow()]);
    const record = review.verification_records?.[0];

    expect(record?.property).toBe("Replay the bounded search with the frozen verifier capsule.");
    expect(record?.does_not_establish).toEqual([
      "The bounded negative result does not resolve the problem.",
      "Verifier passage is evidence only, not accepted Claim standing.",
    ]);
    expect(record?.verifier_profile).toBe("erdos1056-bounded-search-replay-v1");
    expect(record?.independent_of).toEqual(["agent:codex"]);
    expect(record?.started_at).toBe("2026-07-31T02:24:03Z");
    expect(record?.completed_at).toBe("2026-07-31T02:24:09.000Z");
  });

  test("typed reviewer provenance reaches the record without changing its outcome axis", () => {
    const methodRoot = `sha256:${"e".repeat(64)}`;
    const review = reviewFromRow(reviewRow(), submissionRow(), [verificationRow({
      reviewer_kind: "ai_model",
      reviewer_display_name: "GPT-5.6 Sol",
      reviewer_identifier: "gpt-5.6-sol",
      reviewer_provider: "OpenAI",
      reviewer_version: null,
      review_method_root: methodRoot,
    })]);
    expect(review.verification_records?.[0]).toMatchObject({
      outcome: "pass",
      reviewer_kind: "ai_model",
      reviewer_display_name: "GPT-5.6 Sol",
      reviewer_identifier: "gpt-5.6-sol",
      reviewer_provider: "OpenAI",
      reviewer_version: null,
      review_method_root: methodRoot,
    });
  });

  /* A verifier that declared independence of nobody is a real row on
     formal-conjectures. An empty list and an absent record are different facts,
     and a surface saying "no independence declared" must be reading the first
     rather than guessing from the second. */
  test("a declared-independent-of nobody stays an empty list, not a missing field", () => {
    const row = verificationRow();
    row.record.independence.declared_independent_of = [];
    const review = reviewFromRow(reviewRow(), submissionRow(), [row]);

    expect(review.verification_records?.[0]?.independent_of).toEqual([]);
  });

  test("a row with no retained record yields nulls and empty lists rather than throwing", () => {
    const review = reviewFromRow(reviewRow(), submissionRow(), [verificationRow({ record: null })]);
    const record = review.verification_records?.[0];

    expect(record?.verification_record_id).toBe("vvr_exact");
    expect(record?.property).toBeNull();
    expect(record?.verifier_profile).toBeNull();
    expect(record?.started_at).toBeNull();
    expect(record?.does_not_establish).toEqual([]);
    expect(record?.independent_of).toEqual([]);
  });
});

describe("reviewFromRow lifts what the producer declared", () => {
  test("the producer package carries the Submission's own declarations", () => {
    const review = reviewFromRow(reviewRow(), submissionRow(), [verificationRow()]);

    expect(review.producer_package).toEqual({
      producer_actor: "agent:canopus-local",
      submitted_at: "2026-07-31T01:17:01.883Z",
      verification_requirements: [
        "Replay the bounded search with the frozen verifier capsule.",
        "Confirm the candidate digest against the retained artifact.",
      ],
      artifacts: [{ kind: "text/plain", digest: ARTIFACT_DIGEST }],
      caveats: ["The search is bounded and establishes no universal nonexistence."],
      replayability: "exact",
      requested_change_kind: "add_claim",
    });
  });

  test("the requested change kind is the retained kind", () => {
    const submission = submissionRow();
    submission.record.requested_change = {
      kind: "retract_claim",
      target: { claim_id: "vcl_exact", claim_root: CLAIM_ROOT },
    } as any;
    const review = reviewFromRow(reviewRow(), submission, []);

    expect(review.producer_package?.requested_change_kind).toBe("retract_claim");
  });

  /* A withdrawn Proposal has no Submission behind it. Null says so; an empty
     package would read as a producer who declared nothing. */
  test("a Proposal with no Submission has no producer package", () => {
    const review = reviewFromRow(reviewRow({ status: "withdrawn" }), undefined, []);

    expect(review.producer_package).toBeNull();
    expect(review.producer_package_kind).toBe("unrecorded");
    expect(review.verification_records).toEqual([]);
  });
});

/* The rail, the ledger row and the Proposal badge all showed one Proposal's
   outcome, and each derived it. Two of those derivations disagreed on
   [pass, error]: one reported `error`, the other reported `inconclusive`, which
   is a protocol outcome restated as a different protocol outcome. */
describe("the Verification outcome a Proposal reports", () => {
  const outcomes = (...values: string[]) => ({
    verification_records: values.map((outcome) => ({ outcome })),
  });

  test("a failing check outranks every other outcome beside it", () => {
    expect(verificationCore(outcomes("pass", "inconclusive", "error", "fail"))).toBe("fail");
  });

  test("an errored check outranks a pass, and is not restated as inconclusive", () => {
    expect(verificationCore(outcomes("pass", "error"))).toBe("error");
  });

  test("an inconclusive check outranks a pass", () => {
    expect(verificationCore(outcomes("pass", "inconclusive"))).toBe("inconclusive");
  });

  test("pass is reported only where every retained record passed", () => {
    expect(verificationCore(outcomes("pass", "pass"))).toBe("pass");
  });

  test("no retained record is not a failure and not an outcome", () => {
    expect(verificationCore(outcomes())).toBe("not_attempted");
  });

  /* A record the protocol's enum does not cover exists, so saying no check was
     attempted would misstate it in the other direction. */
  test("an outcome word the protocol does not name is inconclusive", () => {
    expect(verificationCore(outcomes("pass", "skipped"))).toBe("inconclusive");
  });

  test("the projected field carries the same derivation", () => {
    const passing = reviewFromRow(reviewRow(), submissionRow(), [verificationRow()]);
    expect(passing.verification_status).toBe("pass");

    const errored = reviewFromRow(reviewRow(), submissionRow(), [
      verificationRow(),
      verificationRow({ verification_record_id: "vvr_errored", outcome: "error" }),
    ]);
    expect(errored.verification_status).toBe("error");
  });
});

describe("the lift does not change what already read this projection", () => {
  test("a mapped Proposal validates against the package's own review schema", () => {
    const reviews = siteRepositorySchema.shape.reviews;
    const mapped = reviewFromRow(reviewRow(), submissionRow(), [verificationRow()]);

    expect(() => reviews.parse([mapped])).not.toThrow();
  });

  /* The release-wide Proposal accordion and the committed editorial snapshot
     both hold Proposals written before this lift. Every new field is optional
     so those keep validating. */
  test("a Proposal carrying none of the lifted fields still validates", () => {
    const reviews = siteRepositorySchema.shape.reviews;
    const { producer_package, verification_records, ...withoutLift } = reviewFromRow(
      reviewRow(),
      submissionRow(),
      [verificationRow()],
    );

    expect(() => reviews.parse([{
      ...withoutLift,
      verification_records: [{
        verification_record_id: "vvr_exact",
        verification_root: VERIFICATION_ROOT,
        outcome: "pass",
        verifier_actor: "agent:vela-verifier",
        completed_at: "2026-07-31T02:24:09Z",
      }],
    }])).not.toThrow();
  });

  test("a predecessor release normalizes absent Decision performer provenance", () => {
    const reviews = siteRepositorySchema.shape.reviews;
    const {
      decision_actor_class: _actorClass,
      decision_session_ref: _sessionRef,
      decision_authority_principal_id: _authorityPrincipal,
      ...predecessor
    } = reviewFromRow(reviewRow(), submissionRow(), [verificationRow()]);

    expect(reviews.parse([predecessor])[0]).toMatchObject({
      decision_actor_class: null,
      decision_session_ref: null,
      decision_authority_principal_id: null,
    });
  });

  test("a Decision Inbox v2 packet normalizes to attributed Decision readiness", () => {
    const hash = (digit: string) => `sha256:${digit.repeat(64)}`;
    const reviews = siteRepositorySchema.shape.reviews;
    const parsed = reviews.parse([{
      ...reviewFromRow(reviewRow(), submissionRow(), [verificationRow()]),
      decision_packet: {
        entry_root: hash("1"),
        conditions: [],
        readiness: {
          protocol_gate: "satisfied",
          human_decision_required: true,
          rejection_available: true,
          blockers: [],
        },
        standing_delta: {
          transition: "add_claim",
          before: { repository_root: hash("2"), accepted: [] },
          if_accept: { repository_root: hash("3"), accepted: [] },
          if_reject: { repository_root: hash("2"), accepted: [] },
          counts: {
            unchanged_accepted_claims: 0,
            global_accepted_claims: { before: 0, if_accept: 1, if_reject: 0 },
          },
        },
        limits: [],
        next_obligation: { now: "Decide", if_accept: "Replay", if_reject: "Revise" },
      },
    }]);

    expect(parsed[0]?.decision_packet?.readiness).toEqual({
      protocol_gate: "satisfied",
      attributed_decision_required: true,
      rejection_available: true,
      blockers: [],
    });
  });

  test("the Claim Standing view reads the same lineage", () => {
    const review = reviewFromRow(reviewRow(), submissionRow(), [verificationRow()]);
    const standingView = buildClaimStandingView(
      {
        id: "vcl_exact",
        root: CLAIM_ROOT,
        standing: "accepted",
        assertion: "An exact bounded Claim.",
        assertion_type: "computational",
        conditions: [],
        created: "2026-07-31T01:00:00Z",
        source_title: null,
        source_type: null,
        has_proposal: true,
        contested: false,
        retracted: false,
        evidence_count: 1,
        revision: 1,
        relation_count: 0,
      },
      [review],
    );

    expect(standingView.lineages).toHaveLength(1);
    expect(standingView.lineages[0].submission).toEqual({ id: "vsb_exact", root: SUBMISSION_ROOT });
    /* `property`, `does_not_establish` and `verifier_profile` join the lineage
       so a Claim page can print the assurance vector rather than one reduced
       outcome. They come from the same record this view already read; the
       lift moves them, it does not derive them. */
    expect(standingView.lineages[0].verifications).toEqual([{
      id: "vvr_exact",
      root: VERIFICATION_ROOT,
      outcome: "pass",
      property: "Replay the bounded search with the frozen verifier capsule.",
      does_not_establish: [
        "The bounded negative result does not resolve the problem.",
        "Verifier passage is evidence only, not accepted Claim standing.",
      ],
      verifier: "agent:vela-verifier",
      verifier_profile: "erdos1056-bounded-search-replay-v1",
      completed_at: "2026-07-31T02:24:09.000Z",
    }]);
  });
});
