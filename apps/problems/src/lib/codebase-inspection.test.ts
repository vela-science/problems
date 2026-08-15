import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { assertSafeGitHubArchiveEntry, normalizeGitHubLocator } from "./codebase-inspection";

describe("GitHub codebase import boundary", () => {
  it("normalizes one exact GitHub HTTPS repository", () => {
    expect(normalizeGitHubLocator("https://github.com/vela-science/vela.git")).toEqual({
      fullName: "vela-science/vela", locator: "https://github.com/vela-science/vela.git",
    });
  });
  it.each([
    "http://github.com/vela-science/vela", "https://evil.example/vela-science/vela",
    "https://github.com/vela-science/vela/issues", "https://token@github.com/vela-science/vela",
    "https://github.com/vela-science/vela?ref=main",
  ])("refuses noncanonical or SSRF-capable locator %s", (locator) => {
    expect(() => normalizeGitHubLocator(locator)).toThrow();
  });
  it.each([
    ["root/../secret", "File"], ["/absolute", "File"], ["root/link", "SymbolicLink"],
    ["root/device", "CharacterDevice"], ["root\\..\\secret", "File"],
  ])("refuses unsafe archive entry %s (%s)", (path, type) => {
    expect(() => assertSafeGitHubArchiveEntry(path, type)).toThrow();
  });
});
