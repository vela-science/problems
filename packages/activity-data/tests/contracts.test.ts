import { describe, expect, test } from "bun:test";
import {
  assessAnchorFreshness,
  commandRequestRoot,
  followsCurrentAnchor,
  scientificAnchorRoot,
  type ScientificAnchor,
} from "../src/contracts";

const root = (hex: string) => `sha256:${hex.repeat(64).slice(0, 64)}` as const;

const anchor: ScientificAnchor = {
  projectionReleaseRoot: root("1"),
  repositoryId: "erdos-problems",
  repositoryRoot: root("2"),
  sourceCommit: "3".repeat(40),
  sourceTree: "4".repeat(40),
  problemId: "erdos-264",
  problemRecordRoot: root("5"),
  sourceObservationRoot: root("6"),
  claimId: `vcl_${"7".repeat(64)}`,
  claimRoot: root("8"),
  claimStanding: "verified",
};

describe("scientific activity anchors", () => {
  test("root every exact projection and repository field", () => {
    expect(scientificAnchorRoot(anchor)).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(scientificAnchorRoot({ ...anchor, sourceTree: "9".repeat(40) }))
      .not.toBe(scientificAnchorRoot(anchor));
  });

  test("derives following only from the exact current anchor", () => {
    const historical = root("a");
    const current = root("b");
    expect(followsCurrentAnchor([historical], current)).toBe(false);
    expect(followsCurrentAnchor([historical, current], current)).toBe(true);
  });

  test("classify canonical advances without rewriting the stored anchor", () => {
    expect(assessAnchorFreshness(anchor, anchor)).toEqual({ state: "current" });
    expect(assessAnchorFreshness(anchor, { ...anchor, repositoryRoot: root("a") }))
      .toEqual({ state: "repository_advanced", fields: ["repositoryRoot"] });
    expect(assessAnchorFreshness(anchor, { ...anchor, problemRecordRoot: root("b") }))
      .toEqual({ state: "problem_changed", fields: ["problemRecordRoot"] });
    expect(assessAnchorFreshness(anchor, { ...anchor, claimStanding: "accepted" }))
      .toEqual({ state: "claim_changed", fields: ["claimStanding"] });
    expect(assessAnchorFreshness(anchor, null)).toEqual({
      state: "unavailable",
      fields: ["current_anchor"],
    });
  });
});

describe("Problem-scoped Approach command identity", () => {
  test("roots the exact Problem anchor and contribution fields", () => {
    const input = {
      anchor: { root: root("a") },
      title: "Finite reduction",
      summary: "Test a bounded obstruction.",
    };
    const inputRoot = commandRequestRoot("approach.create", input);
    expect(commandRequestRoot("approach.create", { ...input, anchor: { root: root("b") } }))
      .not.toBe(inputRoot);
    expect(commandRequestRoot("approach.create", { ...input, title: "Different reduction" }))
      .not.toBe(inputRoot);
    expect(commandRequestRoot("approach.create", { ...input, summary: "Different scope." }))
      .not.toBe(inputRoot);
  });
});
