import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ state: vi.fn() }));
vi.mock("@/lib/scientific-state", () => ({ scientificProblemState: mocks.state }));

import { problemWatch, problemWatchSentence } from "./problem-watch";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;

/* A Problem whose record reaches as far as `stages` says. `problemReachStops`
   reads the statement, the formal occurrences, the review and its checks, so a
   fixture only has to carry those. */
function state(stages: { formal?: number; checks?: number; decided?: boolean }, anchorRoot: string) {
  return {
    repositorySlug: "math",
    repositoryName: "Vela Mathematics Program",
    problem: { problem: "94", source_id: "source:erdos-problems", declared_status: "open", statement: "Is it so?", statement_kind: "prose", metadata: {} },
    /* `currentReview` resolves through the current Claim: it finds the Claim
       named by `currentClaimId`, then the accepted review whose `claim` is that
       Claim's assertion. A fixture with neither reaches no review, which is why
       an earlier draft of this test saw only `Formal` advance. */
    claims: stages.decided ? [{ id: "vcl_1", assertion: "A bounded assertion." }] : [],
    currentClaimId: stages.decided ? "vcl_1" : null,
    reviews: stages.decided
      ? [{
          status: "accepted", claim: "A bounded assertion.", reviewed_at: "2026-08-01T00:00:00Z",
          verification_records: Array.from({ length: stages.checks ?? 1 }, () => ({ outcome: "pass" })),
        }]
      : [],
    sources: { occurrences: Array.from({ length: stages.formal ?? 0 }, (_, index) => ({
      source_id: "source:formal-conjectures", source_label: "Formal Conjectures", occurrence_key: `k${index}`,
      formal: { category_label: "open" }, locators: [],
    })) },
    locator: null,
    anchor: {
      root: anchorRoot, capturedAt: "2026-08-01T00:00:00Z",
      projectionReleaseRoot: anchorRoot, repositoryId: "math", repositoryRoot: root("3"),
      sourceCommit: "4".repeat(40), sourceTree: "5".repeat(40), problemId: "erdos:94",
      problemRecordRoot: anchorRoot, sourceObservationRoot: null,
      claimId: null, claimRoot: null, claimStanding: null,
    },
  } as never;
}

const followedAnchor = {
  root: root("1"), capturedAt: "2026-07-01T00:00:00Z",
  projectionReleaseRoot: root("1"), repositoryId: "math", repositoryRoot: root("3"),
  sourceCommit: "4".repeat(40), sourceTree: "5".repeat(40), problemId: "erdos:94",
  problemRecordRoot: root("1"), sourceObservationRoot: null,
  claimId: null, claimRoot: null, claimStanding: null,
};

describe("a watch firing", () => {
  /* Nobody has followed a Problem on the live site, so this is the first thing
     to exercise the path end to end: a follow made at one release, the record
     moved at the next, and the sentence the reader is shown. */
  it("reports the stages the record gained since the follow", async () => {
    mocks.state.mockResolvedValue(state({ formal: 0 }, root("1")));
    const watch = await problemWatch(
      state({ formal: 3, checks: 2, decided: true }, root("2")),
      { anchors: [followedAnchor], following: false, followedAnchorRoots: [root("1")] } as never,
    );

    expect(watch).not.toBeNull();
    expect(watch!.since).toBe("2026-07-01T00:00:00Z");
    expect(watch!.gained).toEqual(["Formal", "Work", "Decision"]);
    expect(watch!.lost).toEqual([]);
    expect(problemWatchSentence(watch!)).toBe("Reach advanced to Formal, Work and Decision.");
  });

  /* The invariant the whole feature rests on: a follow binds to one exact
     anchor, so following the current state is not a watch waiting to fire. */
  it("says nothing while the followed state is still current", async () => {
    expect(await problemWatch(
      state({ formal: 1 }, root("1")),
      { anchors: [followedAnchor], following: true, followedAnchorRoots: [root("1")] } as never,
    )).toBeNull();
  });

  it("says nothing when no anchor moved", async () => {
    expect(await problemWatch(
      state({ formal: 1 }, root("1")),
      { anchors: [followedAnchor], following: false, followedAnchorRoots: [root("1")] } as never,
    )).toBeNull();
  });

  /* A pruned release yields no track rather than a guess. */
  it("degrades to the anchor comparison when the followed release is gone", async () => {
    mocks.state.mockRejectedValue(new Error("release not retained"));
    const watch = await problemWatch(
      state({ formal: 3 }, root("2")),
      { anchors: [followedAnchor], following: false, followedAnchorRoots: [root("1")] } as never,
    );

    expect(watch!.reachUnavailable).toBe(true);
    expect(watch!.gained).toEqual([]);
    expect(problemWatchSentence(watch!)).toContain("no longer readable here");
  });

  /* Reaching Decision is a Repository accepting a Claim. The watch may never
     render that as the question being settled. */
  it("never says a question was answered", async () => {
    mocks.state.mockResolvedValue(state({ formal: 0 }, root("1")));
    const watch = await problemWatch(
      state({ formal: 3, checks: 1, decided: true }, root("2")),
      { anchors: [followedAnchor], following: false, followedAnchorRoots: [root("1")] } as never,
    );

    expect(problemWatchSentence(watch!)).not.toMatch(/\b(solved|answered|resolved|proved|settled)\b/iu);
  });
});
