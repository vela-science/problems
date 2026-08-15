import { describe, expect, it, vi } from "vitest";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
vi.mock("server-only", () => ({}));
import { assertSafeGitHubArchiveEntry, normalizeGitHubLocator, resolveBundledVelaPath } from "./codebase-inspection";

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

  it.each(["app", "monorepo"])("resolves one executable Core binary from the %s deployment root", async (layout) => {
    const root = await mkdtemp(resolve(tmpdir(), "problems-vela-path-"));
    const directory = layout === "app" ? resolve(root, ".generated") : resolve(root, "apps/problems/.generated");
    const binary = resolve(directory, "vela");
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(binary, "test");
      await chmod(binary, 0o755);
      expect(await resolveBundledVelaPath(root)).toBe(binary);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("refuses missing or ambiguous Core binary custody", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "problems-vela-path-"));
    try {
      await expect(resolveBundledVelaPath(root)).rejects.toThrow("unavailable or ambiguous");
      for (const directory of [resolve(root, ".generated"), resolve(root, "apps/problems/.generated")]) {
        await mkdir(directory, { recursive: true });
        await writeFile(resolve(directory, "vela"), "test");
        await chmod(resolve(directory, "vela"), 0o755);
      }
      await expect(resolveBundledVelaPath(root)).rejects.toThrow("unavailable or ambiguous");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
