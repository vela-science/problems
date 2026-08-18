import { describe, expect, it } from "vitest";
import {
  dominantCheckOutcome,
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
});
