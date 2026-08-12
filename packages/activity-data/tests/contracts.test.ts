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

describe("Approach Target command identity", () => {
  test("roots every optional binding field independently", () => {
    const unbound = {
      anchor: { root: root("a") },
      title: "Finite reduction",
      summary: "Test a bounded obstruction.",
      target_id: null,
      target_packet_root: null,
      target_record_root: null,
    };
    const target = {
      ...unbound,
      target_id: "erdos:321:bounded-search",
      target_packet_root: root("b"),
    };
    const unboundRoot = commandRequestRoot("approach.create", unbound);
    const targetRoot = commandRequestRoot("approach.create", target);
    expect(targetRoot).not.toBe(unboundRoot);
    expect(commandRequestRoot("approach.create", { ...target, target_id: "erdos:321:other" }))
      .not.toBe(targetRoot);
    expect(commandRequestRoot("approach.create", { ...target, target_packet_root: root("c") }))
      .not.toBe(targetRoot);
    expect(commandRequestRoot("approach.create", { ...target, target_record_root: root("d") }))
      .not.toBe(targetRoot);
  });
});
