import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const script = resolve(import.meta.dir, "vercel-should-build.mjs");
const repositories: string[] = [];

afterEach(() => {
  while (repositories.length) rmSync(repositories.pop()!, { recursive: true, force: true });
});

function repository() {
  const path = mkdtempSync(resolve(tmpdir(), "vela-vercel-build-"));
  repositories.push(path);
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: path });
  execFileSync("git", ["config", "user.name", "Vela test"], { cwd: path });
  execFileSync("git", ["config", "user.email", "test@vela.invalid"], { cwd: path });
  mkdirSync(resolve(path, "apps/observatory"), { recursive: true });
  mkdirSync(resolve(path, "apps/www"), { recursive: true });
  mkdirSync(resolve(path, "packages/brand"), { recursive: true });
  writeFileSync(resolve(path, "apps/observatory/app.ts"), "one\n");
  writeFileSync(resolve(path, "apps/www/app.ts"), "one\n");
  writeFileSync(resolve(path, "README.md"), "one\n");
  execFileSync("git", ["add", "."], { cwd: path });
  execFileSync("git", ["commit", "-qm", "initial"], { cwd: path });
  return path;
}

function commit(path: string, file: string, value: string) {
  writeFileSync(resolve(path, file), value);
  execFileSync("git", ["add", file], { cwd: path });
  execFileSync("git", ["commit", "-qm", file], { cwd: path });
}

function status(path: string, target: "observatory" | "www", environment: Record<string, string> = {}) {
  const inherited = { ...process.env };
  delete inherited.VERCEL_GIT_COMMIT_SHA;
  delete inherited.VERCEL_GIT_PREVIOUS_SHA;
  return spawnSync("bun", [script, target], { cwd: path, env: { ...inherited, ...environment } }).status;
}

describe("Vercel workspace build selection", () => {
  test("builds the Observatory for Observatory and shared changes", () => {
    const path = repository();
    commit(path, "apps/observatory/app.ts", "two\n");
    expect(status(path, "observatory")).toBe(1);
    commit(path, "packages/brand/token.ts", "shared\n");
    expect(status(path, "observatory")).toBe(1);
  });

  test("skips the unaffected application", () => {
    const path = repository();
    commit(path, "apps/observatory/app.ts", "two\n");
    expect(status(path, "www")).toBe(0);
    commit(path, "README.md", "two\n");
    expect(status(path, "observatory")).toBe(0);
  });

  test("honors an exact Vercel comparison range", () => {
    const path = repository();
    const previous = execFileSync("git", ["rev-parse", "HEAD"], { cwd: path, encoding: "utf8" }).trim();
    commit(path, "apps/www/app.ts", "two\n");
    const current = execFileSync("git", ["rev-parse", "HEAD"], { cwd: path, encoding: "utf8" }).trim();
    expect(status(path, "www", { VERCEL_GIT_PREVIOUS_SHA: previous, VERCEL_GIT_COMMIT_SHA: current })).toBe(1);
  });

  test("fails open for a first commit or invalid comparison", () => {
    const path = repository();
    expect(status(path, "observatory", { VERCEL_GIT_PREVIOUS_SHA: "bad", VERCEL_GIT_COMMIT_SHA: "bad" })).toBe(1);
    rmSync(resolve(path, ".git"), { recursive: true, force: true });
    expect(status(path, "observatory")).toBe(1);
  });
});
