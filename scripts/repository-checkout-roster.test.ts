import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { repositoryRegistry } from "../packages/projection-data/src/registry";

describe("canonical Repository acquisition", () => {
  const release = readFileSync(resolve(import.meta.dir, "release-problems.mjs"), "utf8");

  test("derives the roster from the typed registry", () => {
    expect(repositoryRegistry.repositories).toHaveLength(1);
    expect(release).toContain('import { repositoryRegistry }');
    expect(release).toContain("for (const entry of repositoryRegistry.repositories)");
    expect(release).not.toContain("vela-science/math.git");
  });

  test("acquires full public history and verifies each declared source branch", () => {
    expect(release).toContain('"clone", "--no-local", "--origin", "origin"');
    expect(release).toContain('git(["remote", "get-url", "origin"]');
    expect(release).toContain('git(["branch", "--show-current"]');
    expect(repositoryRegistry.repositories.map(({ branch }) => branch)).toEqual(["coh-00"]);
    expect(release).toContain("`origin/${entry.branch}`");
    expect(release).toContain('git(["status", "--porcelain"]');
    expect(release).not.toContain("VELA_MATH_READ_TOKEN");
  });
});
