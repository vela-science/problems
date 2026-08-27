import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Problem94TransitionPilot } from "./problem-transition-pilot";

const assertion = "For every finite planar point set P, the sum over its distinct determined distances of the unordered-pair distance multiplicities equals P.card.choose 2. That occurrence is one of four Erdős 94 declarations Formal Conjectures publishes, and this identity does not establish the cubic distance-multiplicity conjecture.";

function problem94State() {
  return {
    repositorySlug: "vela-mathematics-program",
    repositoryName: "Vela Mathematics Program",
    problem: {
      problem: "94",
      source_id: "source:erdos-problems",
      declared_status: "proved (Lean)",
    },
    claims: [
      { id: "vcl_before", assertion, standing: "corrected", evidence_count: 3 },
      {
        id: "vcl_current",
        assertion,
        standing: "accepted",
        evidence_count: 3,
        record: { relations: [{ kind: "corrects", target_claim_id: "vcl_before" }] },
      },
    ],
    currentClaimId: "vcl_current",
    reviews: [{
      proposal_id: "proposal-current",
      status: "accepted",
      claim: assertion,
      created_at: "2026-08-18T18:40:00Z",
      reviewed_at: "2026-08-18T18:46:11Z",
      reviewed_by: "agent:submission-v3-cleanup-decision",
      producer_package_kind: "submission_v1",
      producer_package: { producer_actor: "agent:submission-v3-cleanup" },
      verification_records: [
        { verification_record_id: "verification-1", property: "submission_v3_revision_fidelity", outcome: "pass" },
        { verification_record_id: "verification-2", property: "scientific_meaning_and_state_fidelity", outcome: "pass" },
      ],
    }],
    sources: {
      occurrences: [
        { formal: { category_label: "Open" } },
        { formal: { category_label: "Solved" } },
        { formal: { category_label: "Solved" } },
        { formal: { category_label: "Test" } },
      ],
    },
    anchor: {
      repositoryRoot: `sha256:${"1".repeat(64)}`,
      projectionReleaseRoot: `sha256:${"2".repeat(64)}`,
      sourceCommit: "3".repeat(40),
    },
  } as never;
}

describe("Problem 94 transition pilot", () => {
  it("keeps headline standing separate from the accepted partial Result", () => {
    const html = renderToStaticMarkup(<Problem94TransitionPilot state={problem94State()} route="/problems/erdos-problems/94" />);

    expect(html).toContain("Open in the state represented here.");
    expect(html).toContain("No accepted Result represented in this release establishes the cubic distance-multiplicity conjecture.");
    expect(html).toContain("Accepted partial result");
    expect(html).toContain("Still open");
    expect(html).not.toContain("Problem resolved");
  });

  it("renders the complete source-faithful transition loop in order", () => {
    const html = renderToStaticMarkup(<Problem94TransitionPilot state={problem94State()} route="/problems/erdos-problems/94" />);
    const labels = [
      "Before",
      "Work reviewed",
      "Checks",
      "Decision",
      "Now",
      "Next",
    ];
    const transaction = html.slice(html.indexOf("How we got here"));
    const positions = labels.map((label) => transaction.indexOf(label));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(html).toContain("2 of 2 scoped checks passed");
    expect(html).toContain("agent:submission-v3-cleanup-decision");
    expect(html).toContain("Next key gap");
    expect(html).toContain("Verification → Repository Decision → Standing");
  });

  it("discloses the unchanged assertion, source rights, and replay boundary", () => {
    const html = renderToStaticMarkup(<Problem94TransitionPilot state={problem94State()} route="/problems/erdos-problems/94" />);

    expect(html).toContain("Scientific claim");
    expect(html).toContain("Source license not established");
    expect(html).toContain("vela replay");
    expect(html).toContain("vela projection --json");
    expect(html).toContain("Raw prompts, tool calls, and private traces");
    expect(html).toContain("Not exposed in this public projection.");
  });
});
