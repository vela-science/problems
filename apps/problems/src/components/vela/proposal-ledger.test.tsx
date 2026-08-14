import { renderToStaticMarkup } from "react-dom/server";
import type { ReviewSummary } from "@vela/projection-data";
import { describe, expect, test } from "vitest";
import { ProposalLedger, evidenceLine, timingLine, verificationOutcomeCounts } from "./proposal-ledger";

function record(overrides: Record<string, unknown> = {}) {
  return {
    verification_record_id: "vvr_one",
    verification_root: `sha256:${"f".repeat(64)}`,
    outcome: "pass",
    verifier_actor: "verifier:replay",
    completed_at: "2026-07-30T15:05:50Z",
    does_not_establish: ["Universal nonexistence.", "Scientific acceptance."],
    independent_of: ["agent:codex"],
    ...overrides,
  };
}

function review(overrides: Record<string, unknown> = {}): ReviewSummary {
  return {
    proposal_id: "vpr_one",
    status: "accepted",
    kind: "claim.add",
    target: "vcl_one",
    claim: "An exhaustive bounded search found no witness.",
    content_root: null,
    receipt_root: null,
    created_at: "2026-07-30T14:50:53Z",
    reviewed_at: "2026-08-04T13:17:38Z",
    reviewed_by: "local:device-sha256:67fbb8e56377e6868e9f941524e0bf39cfb4fd2a4bfdd25c2edb93fc82f86213|uid:501",
    decision_actor_class: "human",
    decision_session_ref: null,
    decision_authority_principal_id: "local:repository-authority",
    decision_event_id: "vev_one",
    decision_plan_root: null,
    decision_provenance: "signed_record",
    applied_event_id: "vev_applied",
    decision_reason: "Accept the exact bounded negative result.",
    verification_records: [record()],
    ...overrides,
  } as ReviewSummary;
}

describe("the evidence line", () => {
  test("names the records, independence and stated limits without aggregating outcomes", () => {
    expect(evidenceLine(review({ verification_records: [record(), record({ verification_record_id: "vvr_two" })] })))
      .toBe("2 Verification Records · declared independent of agent:codex · 4 stated limits");
  });

  test("reports a verifier that declared no independence beside one that did", () => {
    expect(evidenceLine(review({
      verification_records: [record(), record({ verification_record_id: "vvr_two", independent_of: [] })],
    }))).toContain("declared independent of agent:codex on 1 of 2 records");
  });

  test("reports no independence where no verifier declared any", () => {
    expect(evidenceLine(review({ verification_records: [record({ independent_of: [] })] })))
      .toContain("no independence declared");
  });

  test("keeps pass, fail and inconclusive as separate counts", () => {
    const mixed = review({ verification_records: [
      record(),
      record({ verification_record_id: "vvr_two", outcome: "fail" }),
      record({ verification_record_id: "vvr_three", outcome: "inconclusive" }),
    ] });
    expect(verificationOutcomeCounts(mixed)).toEqual([
      { outcome: "pass", count: 1 },
      { outcome: "fail", count: 1 },
      { outcome: "inconclusive", count: 1 },
    ]);
  });

  test("a Proposal with no Verification Record says so", () => {
    expect(evidenceLine(review({ verification_records: [] }))).toBe("No Verification Record is retained.");
  });
});

describe("the timing line", () => {
  test("measures the first passing check and the Decision from the same origin", () => {
    expect(timingLine(review())).toBe("first pass reported in 15m · Decision recorded in 5d");
  });

  test("never describes producer withdrawal as a Decision", () => {
    expect(timingLine(review({ decision_provenance: "producer_withdrawal" })))
      .toBe("first pass reported in 15m");
  });

  test("is absent where neither instant is retained", () => {
    expect(timingLine(review({ verification_records: [], reviewed_at: null }))).toBeNull();
  });
});

/* The worst-outcome precedence the glyph's core draws is asserted where it is
   derived, in packages/projection-data/src/review-projection.test.ts. */

describe("the ledger row", () => {
  const html = renderToStaticMarkup(
    <ProposalLedger
      slug="erdos"
      reviews={[
        review({ verification_records: [record(), record({ verification_record_id: "vvr_two", outcome: "fail" })] }),
        review({ proposal_id: "vpr_two", status: "withdrawn", decision_provenance: "producer_withdrawal", verification_records: [] }),
      ]}
    />,
  );

  test("leads with the assertion, not with the identifier", () => {
    expect(html).toContain("An exhaustive bounded search found no witness.");
    const assertionAt = html.indexOf("An exhaustive bounded search");
    const identifierAt = html.indexOf("vpr_one");
    /* The identifier appears only in the row's href, which precedes the body;
       nothing renders it as the row's heading. */
    expect(html.slice(identifierAt, assertionAt)).not.toContain("item-title");
  });

  test("carries Proposal status on its own axis and in the words", () => {
    expect(html).toContain('data-state="accepted" data-axis="proposal"');
    expect(html).toContain('data-state="withdrawn" data-axis="proposal"');
    /* `accepted` is also a Claim standing, so the badge says which axis it is
       naming rather than leaving the reader to infer it from the page. */
    expect(html).toContain("Proposal accepted");
    expect(html).not.toContain('data-standing=');
  });

  test("only the concise assertion is the record link", () => {
    const anchor = html.match(/<a[^>]+href="\/repositories\/erdos\/proposals\/vpr_one"[^>]*>(.*?)<\/a>/u)?.[0] ?? "";
    expect(anchor).toContain("An exhaustive bounded search found no witness.");
    expect(anchor).toContain("line-clamp-3");
    expect(anchor).not.toContain("max-h-");
    expect(anchor).not.toContain("Verification");
    expect(anchor).not.toContain("Proposal accepted");
  });

  test("renders mixed outcomes as distinct Verification badges", () => {
    expect(html).toContain('data-state="pass" data-axis="verification"');
    expect(html).toContain('data-state="fail" data-axis="verification"');
    expect(html).toContain(">1 pass<");
    expect(html).toContain(">1 fail<");
  });

  test("a withdrawal has producer action, not a human Decision", () => {
    const withdrawn = html.slice(html.indexOf("Producer withdrawal"));
    expect(withdrawn).toContain("No repository authority ruled on it.");
    expect(withdrawn).not.toContain("Human Decision");
    expect(withdrawn).not.toContain("Decision recorded in");
  });

  test("truncates the reviewer identity on screen and keeps it whole for a reader who needs it", () => {
    expect(html).toContain('aria-hidden="true">local:device-sha256:67fbb8…</span>');
    expect(html).toContain('<span class="sr-only">local:device-sha256:67fbb8e56377e6868e9f941524e0bf39cfb4fd2a4bfdd25c2edb93fc82f86213|uid:501</span>');
  });
});
