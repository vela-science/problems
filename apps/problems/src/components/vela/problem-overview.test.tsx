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

    expect(html).toContain("The Decision accepted the Claim, not the check.");
    expect(html).toContain("agent:submission-v3-cleanup-decision");
    /* The third axis reads as a sentence now: "Problem Standing: Not recorded"
       required knowing both that a Problem carries a Standing of its own and
       that it is separate from the Result accepted above it. The record's own
       field stays underneath for anyone who needs to cite it. */
    expect(html).toContain("The question itself");
    expect(html).toContain("No Repository has ruled on it");
    expect(html).toContain("problem_standing: not_recorded");
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
    /* `declared_status` cleared, so this is the genuinely-open reading. The
       fixture's own status is "proved (Lean)", which is the other branch and is
       covered below — 613 of the 1,217 Problems in this release are in it. */
    const base = problem94State() as { problem: Record<string, unknown> };
    const empty = {
      ...(base as object),
      problem: { ...base.problem, declared_status: "open" },
      claims: [], currentClaimId: null, reviews: [],
    } as never;
    const html = renderToStaticMarkup(<ProblemOverview state={empty} route="/problems/erdos-problems/2" />);

    /* The fixture retains source occurrences, so the empty reading names them
       rather than denying the whole record. Erdős 1 shipped the denial over
       eight retained formalizations and nine occurrences. */
    expect(html).toMatch(/No Result is current here\. \d+ (formal statements? (is|are)|source records? (is|are))\./u);
    expect(html).not.toContain("Nothing has been recorded here yet.");
    expect(html).not.toContain("Scope of what is proved");
    expect(html).not.toContain("No result has been accepted here yet.");

    /* Both readings of a Problem draw the same reach track, so the empty one is
       measured against the same instrument rather than a ladder of its own. The
       terminal is never reached here: an open Problem is one whose question has
       not been answered, and a filled endpoint would say otherwise. */
    expect(html).toContain("How far the record reaches");
    expect(html).toContain("2 of 6 stages");
    expect(html).toContain("Answer");
    expect(html).toContain("Not established");
    /* The track's own stages carry it — asserted two lines above — so the
       caption that said the same thing in a sentence is gone. Work keeps its
       caption: there the track is the only prose in the rail. */
    expect(html).not.toContain("so the record stops short of it");
  });

  /* The sentence that was false on 613 of 1,217 pages.
   *
   * Erdős 16 is recorded by its own collection as disproved, in Lean, and this
   * page opened with "Nothing has been recorded here yet" — measuring the one
   * axis that is near-empty by construction, because Vela state means a
   * Repository signed a Decision and one Repository has signed eighteen. The
   * finding now leads, in the source's words and under the source's name, and
   * the Vela boundary follows it as the next fact rather than as a denial. */
  it("leads with the source's finding, attributed, where the source records one", () => {
    const base = problem94State() as { problem: Record<string, unknown> };
    const resolved = {
      ...(base as object),
      problem: { ...base.problem, declared_status: "disproved (Lean)" },
      claims: [], currentClaimId: null, reviews: [],
    } as never;
    const html = renderToStaticMarkup(<ProblemOverview state={resolved} route="/problems/erdos-problems/16" />);

    expect(html).toContain("records this as disproved (Lean).");
    expect(html).not.toContain("Nothing has been recorded here yet.");
    /* Attributed, never asserted. The page must never claim the finding as its
       own, and the Vela boundary has to survive the promotion. */
    expect(html).toContain("No Repository has ruled on it here.");
    expect(html).not.toMatch(/>\s*Disproved \(Lean\)\.?\s*</u);
    /* The finding is on the reach axis too, which had no stage for it: the
       track read "3 of 5 stages" and said nothing about the disproof. */
    expect(html).toContain("Resolution");
    expect(html).toContain("of 6 stages");
  });
});
