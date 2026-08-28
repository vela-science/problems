import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProblemOverview } from "./problem-overview";

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
    source: { title: "Erdős problem 94" },
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

describe("Problem Overview, on the Problem the source contract pins", () => {
  const render94 = () => renderToStaticMarkup(<ProblemOverview state={problem94State()} route="/problems/erdos-problems/94" />);

  /* The zero-tolerance gate: an accepted Claim that proves a narrower identity
     must never read as a resolved Problem. Both sentences are derived — the
     headline from the Claim's declared scope, the limitation from the Claim's
     own text — so this holds for any Problem whose Claim states its limit. */
  it("keeps the Problem's reading separate from the accepted partial Result", () => {
    const html = render94();

    expect(html).toContain("Open in the state represented here.");
    expect(html).toContain("does not establish the cubic distance-multiplicity conjecture");
    expect(html).not.toContain("Problem resolved");
    expect(html).not.toMatch(/\bsolved\b/iu);
  });

  /* The scope figure asserts exactly one relation, and only where the Claim
     asserts it: the accepted scope sits inside the question. */
  it("draws the accepted scope inside the question it does not settle", () => {
    const html = render94();
    const scope = html.slice(html.indexOf("Scope of what is proved"));

    expect(scope.indexOf("The question")).toBeGreaterThanOrEqual(0);
    expect(scope.indexOf("Proved and accepted")).toBeGreaterThan(scope.indexOf("The question"));
    expect(html).toContain("Not established here");
  });

  /* Verification, the Decision and Standing stay three separate things. */
  it("separates verification from the Decision, and both from Standing", () => {
    const html = render94();

    expect(html).toContain("Verification did not accept the Claim.");
    expect(html).toContain("agent:submission-v3-cleanup-decision");
    expect(html).toContain("Problem Standing");
    expect(html).toContain("Not recorded");
    /* The "Not recorded in this release" panel is gone. Its last entry, "A
       recorded next discriminator", was pushed on every Problem in the release
       — the transition spine already reports that same absence as its final
       stage, in the same viewport — so the panel had no per-page content left
       to carry. The fact survives; the second telling of it does not. */
    expect(html).not.toContain("Not recorded in this release");
  });

  /* Every Problem is reachable by the same component, so the composition that
     carries the honesty gates is the one 1,216 other Problems get too. */
  it("gives a Problem with nothing recorded its own composition", () => {
    const empty = { ...(problem94State() as object), claims: [], currentClaimId: null, reviews: [] } as never;
    const html = renderToStaticMarkup(<ProblemOverview state={empty} route="/problems/erdos-problems/2" />);

    expect(html).toContain("Nothing has been recorded here yet.");
    expect(html).not.toContain("Scope of what is proved");
    expect(html).not.toContain("No result has been accepted here yet.");

    /* Both readings of a Problem draw the same reach track, so the empty one is
       measured against the same instrument rather than a ladder of its own. The
       terminal is never reached here: an open Problem is one whose question has
       not been answered, and a filled endpoint would say otherwise. */
    expect(html).toContain("How far the record reaches");
    expect(html).toContain("2 of 5 stages");
    expect(html).toContain("The question");
    expect(html).toContain("Not reached");
    expect(html).toContain("No Repository has decided on this question here, so the record stops short of it.");
  });
});
