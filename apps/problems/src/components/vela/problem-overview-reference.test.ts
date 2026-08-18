import { describe, expect, it } from "vitest";
import {
  dominantCheckOutcome,
  compactResultLimitation,
  exactResultHeadline,
  exactResultLimitation,
  summarizeCheckOutcomes,
  summarizeFormalTargets,
} from "./problem-overview-reference";

describe("Problem Overview state summaries", () => {
  it("keeps mixed formal targets visible instead of selecting the first occurrence", () => {
    expect(summarizeFormalTargets([
      { formal: { category_label: "Solved" } },
      { formal: { category_label: "Solved" } },
      { formal: { category_label: "Test" } },
      { formal: { category_label: "Open" } },
    ])).toBe("1 open · 2 solved · 1 test");
  });

  it("summarizes every check and gives failures visual priority", () => {
    const checks = [{ outcome: "pass" }, { outcome: "fail" }, { outcome: "inconclusive" }];
    expect(summarizeCheckOutcomes(checks)).toBe("1 failed · 1 inconclusive · 1 passed");
    expect(dominantCheckOutcome(checks)).toBe("fail");
    expect(dominantCheckOutcome([])).toBeNull();
  });

  it("keeps exact Result meaning while removing release machinery from the headline", () => {
    expect(exactResultHeadline(
      "Commit abc proves that every witness has density at most one half, matching the retained target.",
    )).toBe("Every witness has density at most one half");
    expect(exactResultHeadline(
      "The reviewed package establishes a sharp upper bound, which closes the scoped claim.",
    )).toBe("A sharp upper bound");
    expect(exactResultLimitation(
      "The reviewed package establishes a sharp upper bound. It does not establish the full Problem.",
    )).toBe("It does not establish the full Problem.");
    expect(compactResultLimitation(
      "At an exact commit, this supplies a candidate answer for target X, not a proof of it.",
    )).toBe("Supplies a candidate answer, not a proof of it.");
    expect(compactResultLimitation(
      "That occurrence is exact, and this identity does not establish the cubic conjecture.",
    )).toBe("This identity does not establish the cubic conjecture.");
  });
});
