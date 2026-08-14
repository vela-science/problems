import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { repositoryRegistry } from "../packages/observatory-data/src/registry";

describe("canonical Repository acquisition", () => {
  const release = readFileSync(resolve(import.meta.dir, "refresh-observatory.mjs"), "utf8");

  test("derives the roster from the typed registry", () => {
    expect(repositoryRegistry.repositories).toHaveLength(1);
    expect(release).toContain('import { repositoryRegistry }');
    expect(release).toContain("for (const entry of repositoryRegistry.repositories)");
    expect(release).not.toContain("vela-science/math.git");
  });

  test("acquires full public history and verifies exact origin/main", () => {
    expect(release).toContain('"clone", "--no-local", "--origin", "origin"');
    expect(release).toContain('git(["remote", "get-url", "origin"]');
    expect(release).toContain('git(["branch", "--show-current"]');
    expect(release).toContain('git(["rev-parse", "origin/main"]');
    expect(release).toContain('git(["status", "--porcelain"]');
    expect(release).not.toContain("VELA_MATH_READ_TOKEN");
  });
});
