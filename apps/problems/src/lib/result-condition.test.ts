import { describe, expect, test } from "vitest";
import { resultConditionPresentation } from "./result-condition";

describe("reader-facing Result conditions", () => {
  test("keeps scientific limitations verbatim", () => {
    expect(resultConditionPresentation("This proves only the bounded identity.")).toBe("This proves only the bounded identity.");
  });

  test("does not present a historical evidence filename as current source custody", () => {
    const rendered = resultConditionPresentation("Exact source, proof, target, toolchain, integration, and Method roots retained in evidence/current/erdos-94/pilot-input.v1.json.");
    expect(rendered).toContain("exact evidence file");
    expect(rendered).not.toContain("pilot");
  });
});
