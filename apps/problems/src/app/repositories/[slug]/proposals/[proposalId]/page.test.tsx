import { renderToStaticMarkup } from "react-dom/server";
import type { ReviewSummary } from "@vela/projection-data";
import { describe, expect, test, vi } from "vitest";

const SWEEP = "An exhaustive bounded search of the 13 primes in the inclusive range 10429601..10429800 found no k=15 witness; the maximum multiplicity observed was 11 at p=10429717, residue 2060465.";
const CODE = "The nine Pauli generators define a ten-qubit stabilizer with rank 9; therefore an explicit [[10,1,4]] stabilizer code exists.";
const ROOT = (digit: string) => `sha256:${digit.repeat(64)}`;

function currentPreview() {
  return {
    schema: "vela.projection-proposed-state-preview.v1" as const,
    authority_effect: "none" as const,
    state: "current" as const,
    proposal_id: "vpr_pending",
    entry_root: ROOT("1"),
    projection_root: ROOT("2"),
    base: {
      git_commit: "1".repeat(40),
      revision_root: ROOT("3"),
      repository_root: ROOT("4"),
    },
    inputs: {
      repository_root: ROOT("4"), proposal_root: ROOT("5"), claim_root: ROOT("6"),
      submission_root: ROOT("7"), verification_set_root: ROOT("8"),
    },
    authority_heads: {
      policy_bundle_root: ROOT("9"), authority_keyset_root: ROOT("a"),
      authority_record_root: ROOT("b"), authority_event_log_root: ROOT("c"),
    },
    predictions: {
      before_repository_root: ROOT("4"),
      if_accept_repository_root: ROOT("d"),
      if_reject_repository_root: ROOT("e"),
    },
    terminal: null,
    blocker: null,
    nonclaims: ["No Decision.", "No Standing effect.", "No root substitution."],
    preview_root: ROOT("f"),
  };
}

function review(overrides: Partial<ReviewSummary> = {}): ReviewSummary {
  return {
    proposal_id: "vpr_sweep",
    status: "accepted",
    kind: "claim.add",
    target: "vcl_sweep",
    claim: SWEEP,
    content_root: `sha256:${"a".repeat(64)}`,
    receipt_root: null,
    created_at: "2026-07-30T18:50:53Z",
    reviewed_at: "2026-08-04T17:17:38Z",
    reviewed_by: "local:device-sha256:67fbb8e56377e6868e9f941524e0bf39cfb4fd2a4bfdd25c2edb93fc82f86213|uid:501",
    decision_actor_class: "human",
    decision_session_ref: null,
    decision_authority_principal_id: "local:device-sha256:67fbb8e56377e6868e9f941524e0bf39cfb4fd2a4bfdd25c2edb93fc82f86213|uid:501",
    decision_event_id: "vev_decision",
    decision_plan_root: null,
    decision_provenance: "signed_record",
    applied_event_id: "vev_applied",
    decision_reason: "Accept the exact bounded negative result for primes 10429601..10429800.",
    producer_package_kind: "submission_v1",
    producer_package_id: "vsb_one",
    producer_package_root: `sha256:${"b".repeat(64)}`,
    producer_package: {
      producer_actor: "agent:codex",
      submitted_at: "2026-07-30T18:50:30Z",
      verification_requirements: ["Replay the retained Run with the pinned verifier capsule."],
      artifacts: [],
      caveats: [],
      replayability: "exact",
      requested_change_kind: "add_claim",
    },
    verification_records: [{
      verification_record_id: "vvr_one",
      verification_root: `sha256:${"f".repeat(64)}`,
      outcome: "pass",
      verifier_actor: "verifier:replay",
      completed_at: "2026-07-30T19:05:50Z",
      property: "Replay the retained artifact byte for byte.",
      does_not_establish: ["Universal nonexistence."],
      verifier_profile: "erdos1056-bounded-search-replay-v1",
      independent_of: ["agent:canopus-local"],
    }],
    ...overrides,
  };
}

const REVIEWS = [
  review(),
  review({
    proposal_id: "vpr_code",
    target: "vcl_code",
    claim: CODE,
    verification_records: [
      review().verification_records![0]!,
      { ...review().verification_records![0]!, verification_record_id: "vvr_fail", outcome: "fail" },
      { ...review().verification_records![0]!, verification_record_id: "vvr_inconclusive", outcome: "inconclusive" },
    ],
  }),
  review({
    proposal_id: "vpr_prose",
    target: "vcl_prose",
    claim: "At Formal Conjectures commit e6d6b867, the retained Lean artifact completes Erdos264.erdos_264.parts.i.",
  }),
  review({
    proposal_id: "vpr_agent",
    target: "vcl_agent",
    claim: "An attributed agent Decision admitted this bounded Claim.",
    reviewed_by: "agent:gpt-5.6-sol",
    decision_actor_class: "agent",
    decision_session_ref: "entire:checkpoint:01KZSESSION",
    decision_authority_principal_id: "local:repository-authority",
  }),
  review({
    proposal_id: "vpr_gone",
    target: "vcl_gone",
    status: "withdrawn",
    claim: "A byte-equivalent retry of an already committed Submission.",
    decision_provenance: "producer_withdrawal",
    decision_reason: null,
    reviewed_by: "agent:codex",
    decision_actor_class: null,
    decision_session_ref: null,
    decision_authority_principal_id: null,
    decision_event_id: null,
    applied_event_id: null,
    verification_records: [],
  }),
  review({
    proposal_id: "vpr_pending",
    status: "pending_review",
    target: "vcl_pending",
    claim: "A rooted proposed Claim awaiting an authorized Decision.",
    reviewed_at: null,
    reviewed_by: null,
    decision_actor_class: null,
    decision_session_ref: null,
    decision_authority_principal_id: null,
    decision_event_id: null,
    applied_event_id: null,
    decision_reason: null,
    decision_provenance: "pending",
    proposed_state_preview: currentPreview(),
  }),
];

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

/* Only the readers are replaced. `verificationCore` is a pure derivation over
   the fixture's own records, so the page under test runs the real one. */
vi.mock("@vela/projection-data", async (importOriginal) => ({
  ...await importOriginal<typeof import("@vela/projection-data")>(),
  repositoryBySlug: async (slug: string) => slug === "erdos" ? {
    slug: "erdos",
    status: { repository: { name: "Erdős" }, counts: { accepted_claims: 2782 } },
    /* The page names the commit a Proposal is proposed against, so a Repository
       fixture without `source` is an incomplete Repository rather than an
       optional field. */
    source: { commit: "b134ef4a2a0a9c1d3e5f70819a2b3c4d5e6f7081" },
    reviews: REVIEWS,
  } : undefined,
}));

import ProposalPage from "./page";

async function render(slug: string, proposalId: string) {
  return renderToStaticMarkup(await ProposalPage({
    params: Promise.resolve({ slug, proposalId }),
  } as never));
}

describe("the proposal record route", () => {
  test("stays dynamic, because per-record routes may not prerender", async () => {
    const route = await import("./page");
    expect(route.dynamicParams).toBe(true);
    expect(route.dynamic).toBe("force-static");
    expect(route.revalidate).toBe(false);
    expect(route.generateStaticParams()).toEqual([]);
  });

  test("opens with the assertion, not with the word Proposal", async () => {
    const html = await render("erdos", "vpr_sweep");
    const heading = html.slice(html.indexOf("<h1"), html.indexOf("</h1>"));
    expect(heading).toContain("An exhaustive bounded search");
    expect(heading).not.toContain("Proposal");
  });

  test("carries two axes as two badges, each naming its own", async () => {
    const html = await render("erdos", "vpr_sweep");
    expect(html).toContain("Proposal accepted");
    expect(html).toContain("verification pass");
  });

  test("renders each scoped Check once in the Evidence owner", async () => {
    const html = await render("erdos", "vpr_sweep");
    expect(html.match(/data-verification-record-id="vvr_one"/gu)).toHaveLength(1);
    expect(html).not.toContain("Exact Verification Record ID");
  });

  test("shows the parameters the assertion states", async () => {
    const html = await render("erdos", "vpr_sweep");
    expect(html).toContain("Max multiplicity");
    expect(html).toContain(">2060465<");
    expect(html).toContain(">10429717<");
  });

  test("lifts the code parameters where the assertion states those instead", async () => {
    const html = await render("erdos", "vpr_code");
    expect(html).toContain("[[10,1,4]]");
    expect(html).toContain("n = 10 · k = 1 · d = 4");
  });

  test("omits the parameter block entirely rather than showing a placeholder", async () => {
    const html = await render("erdos", "vpr_prose");
    expect(html).not.toContain("Stated parameters");
  });

  test("prints the Decision reason and the applied Event", async () => {
    const html = await render("erdos", "vpr_sweep");
    expect(html).toContain("Human Decision");
    expect(html).toContain("Accept the exact bounded negative result for primes 10429601..10429800.");
    expect(html).toContain("vev_applied");
    expect(html).toContain("first pass reported in 15m");
    expect(html).toContain("Decision recorded in 5d");
    /* NULL on every retained row, so no label is drawn for it. */
    expect(html).not.toContain("Decision plan");
  });

  test("a withdrawal implies no repository authority", async () => {
    const html = await render("erdos", "vpr_gone");
    expect(html).toContain("Producer withdrawal");
    expect(html).toContain("Withdrawn by the producer. No repository authority ruled on it.");
    expect(html).toContain("No Verification Record is retained for this Proposal.");
    expect(html).not.toContain("Human Decision");
    expect(html).not.toContain("Decision recorded in");
  });

  test("keeps mixed Verification outcomes separate from Proposal status", async () => {
    const html = await render("erdos", "vpr_code");
    expect(html).toContain('data-state="accepted" data-axis="proposal"');
    expect(html).toContain('data-state="pass" data-axis="verification"');
    expect(html).toContain('data-state="fail" data-axis="verification"');
    expect(html).toContain('data-state="inconclusive" data-axis="verification"');
    expect(html).toContain("1 Verification Record: pass");
    expect(html).toContain("1 Verification Record: fail");
    expect(html).toContain("1 Verification Record: inconclusive");
    expect(html).not.toContain("aggregate Verification");
  });

  test("a pending Proposal awaits an attributed Decision without emitting Decision metadata", async () => {
    const html = await render("erdos", "vpr_pending");
    const headingAt = html.indexOf("Awaiting Decision");
    const decisionSection = html.slice(html.lastIndexOf("<section", headingAt), html.indexOf("</section>", headingAt));
    expect(decisionSection).toContain("Awaiting Decision");
    expect(decisionSection).toContain("No Decision has been recorded.");
    expect(decisionSection).not.toContain(">Human Decision<");
    expect(decisionSection).not.toContain("Decision recorded in");
    expect(decisionSection).not.toContain("local:device-sha256");
    expect(decisionSection).not.toContain("vev_applied");
    expect(decisionSection).not.toContain("signed record");
    expect(decisionSection).not.toContain(">pending<");
  });

  test("shows the rooted proposed state as hypothetical and authority-none", async () => {
    const html = await render("erdos", "vpr_pending");
    expect(html).toContain("Authority effect · none");
    expect(html).toContain("Current proposed state");
    expect(html).toContain("hypothetical until a Decision is recorded");
    expect(html).toContain("If accepted");
    expect(html).toContain("If rejected");
    expect(html).not.toContain("Applied exactly as reviewed");
  });

  test("distinguishes an agent performer, its session, and Repository authority", async () => {
    const html = await render("erdos", "vpr_agent");
    expect(html).toContain("Agent Decision");
    expect(html).toContain("agent:gpt-5.6-sol");
    expect(html).toContain("entire:checkpoint:01KZSESSION");
    expect(html).toContain("Repository authority");
    expect(html).toContain("local:repository-authority");
  });

  test("an unknown Proposal is not found", async () => {
    await expect(render("erdos", "vpr_missing")).rejects.toThrow("NOT_FOUND");
  });
});
