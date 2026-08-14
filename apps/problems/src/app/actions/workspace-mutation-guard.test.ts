import { describe, expect, test } from "vitest";
import {
  requireCurrentApproach,
  requireCurrentArtifact,
  requireCurrentAttempt,
  requireExpectedAnchorRoot,
  safeWorkspaceErrorCode,
} from "./workspace-mutation-guard";

const root = (digit: string) => `sha256:${digit.repeat(64).slice(0, 64)}` as const;
const current = root("1");
const stale = root("2");
const activity = {
  approaches: [
    { id: "current-approach", anchorRoot: current, version: 2 },
    { id: "stale-approach", anchorRoot: stale, version: 1 },
  ],
  attempts: [
    { id: "current-attempt", anchorRoot: current, version: 3 },
    { id: "stale-attempt", anchorRoot: stale, version: 1 },
  ],
  artifacts: [
    {
      id: "current-artifact",
      anchorRoot: current,
      kind: "result",
      path: "evidence/result.v1.json",
      contentRoot: root("6"),
    },
    {
      id: "stale-artifact",
      anchorRoot: stale,
      kind: "result",
      path: "evidence/stale-result.v1.json",
      contentRoot: root("7"),
    },
  ],
};

describe("Workspace mutation freshness", () => {
  test("allows only exact current Approach versions", () => {
    expect(requireCurrentApproach(activity, "current-approach", current, 2).id).toBe("current-approach");
    expect(() => requireCurrentApproach(activity, "stale-approach", current)).toThrow("not current");
    expect(() => requireCurrentApproach(activity, "current-approach", current, 1)).toThrow("not current");
  });

  test("blocks stale or advanced Attempt updates", () => {
    expect(requireCurrentAttempt(activity, "current-attempt", current, 3).id).toBe("current-attempt");
    expect(() => requireCurrentAttempt(activity, "stale-attempt", current, 1)).toThrow("not current");
    expect(() => requireCurrentAttempt(activity, "current-attempt", current, 2)).toThrow("not current");
  });

  test("allows only current Research Blocks to seed a draft", () => {
    expect(requireCurrentArtifact(activity, "current-artifact", current).id).toBe("current-artifact");
    expect(() => requireCurrentArtifact(activity, "stale-artifact", current)).toThrow("not current");
    expect(() => requireCurrentArtifact(activity, "missing", current)).toThrow("not found");
  });

  test("refuses a direct post rendered against an earlier scientific anchor", () => {
    expect(requireExpectedAnchorRoot(current, current)).toBeUndefined();
    expect(() => requireExpectedAnchorRoot(current, stale)).toThrow("not current");
  });

  test("maps only bounded safe error codes for the visible refusal route", () => {
    const activityError = Object.assign(new Error("private database detail"), { name: "ActivityDataError", code: "unauthorized" });
    expect(safeWorkspaceErrorCode(activityError)).toBe("unauthorized");
    expect(safeWorkspaceErrorCode(Object.assign(new Error("private"), { name: "ActivityDataError", code: "secret" }))).toBeNull();
    expect(safeWorkspaceErrorCode(new Error("private"))).toBeNull();
    try {
      requireCurrentApproach(activity, "stale-approach", current);
    } catch (error) {
      expect(safeWorkspaceErrorCode(error)).toBe("conflict");
    }
    expect(() => requireCurrentApproach(activity, "missing", current)).toThrow("not found");
  });
});
