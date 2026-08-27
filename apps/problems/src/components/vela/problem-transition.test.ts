import { describe, expect, it } from "vitest";
import { problemTransition } from "./problem-transition";

const assertion = "Proves the sum-multiplicity identity. This identity does not establish the cubic distance-multiplicity conjecture.";

function state(overrides: Record<string, unknown> = {}) {
  return {
    repositoryName: "Vela Mathematics Program",
    problem: { problem: "94", source_id: "source:erdos-problems", metadata: null },
    claims: [
      { id: "vcl_before", assertion, standing: "corrected", evidence_count: 3 },
      { id: "vcl_current", assertion, standing: "accepted", evidence_count: 3, record: { relations: [{ kind: "corrects", target_claim_id: "vcl_before" }] } },
    ],
    currentClaimId: "vcl_current",
    reviews: [{
      proposal_id: "p1", status: "accepted", claim: assertion, reviewed_at: "2026-08-18T18:46:11Z",
      producer_package: { producer_actor: "agent:submission-v3-cleanup" },
      verification_records: [
        { verification_record_id: "v1", property: "revision_fidelity", outcome: "pass" },
        { verification_record_id: "v2", property: "state_fidelity", outcome: "pass" },
      ],
    }],
    sources: { occurrences: [] },
    ...overrides,
  } as never;
}

describe("problemTransition", () => {
  it("derives the whole loop from the record", () => {
    const stages = problemTransition(state());
    expect(stages.map((stage) => stage.label)).toEqual([
      "Prior state", "Work", "Verification", "Decision", "Standing", "Next gap",
    ]);
    expect(stages[0]!.value).toBe("Accepted, then corrected");
    expect(stages[2]!.value).toBe("2 of 2 scoped checks passed");
    expect(stages[3]!.value).toBe("accepted by Vela Mathematics Program");
    expect(stages[4]!.value).toBe("Open in this repository");
  });

  /* The loop does not close in this release, and the figure has to say so
     rather than ending at Standing as though it did. */
  it("marks an unrecorded next gap as absent rather than omitting it", () => {
    const gap = problemTransition(state()).at(-1)!;
    expect(gap.label).toBe("Next gap");
    expect(gap.value).toBe("Not recorded");
    expect(gap.tone).toBe("absent");
  });

  it("reports absence at every stage for a Problem with nothing recorded", () => {
    const stages = problemTransition(state({ claims: [], currentClaimId: null, reviews: [] }));
    expect(stages.every((stage) => stage.tone === "absent")).toBe(true);
    expect(stages[4]!.value).toBe("Nothing recorded here");
  });

  it("never reports the Problem as solved", () => {
    for (const s of [state(), state({ claims: [], currentClaimId: null, reviews: [] })]) {
      const text = problemTransition(s).map((stage) => stage.value).join(" ").toLowerCase();
      expect(text).not.toContain("solved");
      expect(text).not.toContain("resolved");
    }
  });
});
