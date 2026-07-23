import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { checkReleaseIdentity } from "./check-release-identity.mjs";

const repository = resolve(import.meta.dirname, "..");
const workspaces = [
  "package.json",
  "apps/www/package.json",
  "apps/observatory/package.json",
  "packages/brand/package.json",
  "packages/frontier-data/package.json",
];
const temporary: string[] = [];

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "vela-web-release-identity-"));
  temporary.push(root);
  for (const path of workspaces) cpSync(resolve(repository, path), resolve(root, path), { recursive: true });
  return root;
}

function git(repository: string, ...args: string[]) {
  return execFileSync("git", ["-C", repository, ...args], {
    encoding: "utf8",
  }).trim();
}

describe("one Web release identity", () => {
  test("accepts one version across every private workspace", () => {
    expect(checkReleaseIdentity(repository)).toMatchObject({ version: "0.420.0", tag: "v0.420.0" });
  });

  test("rejects an independently versioned internal package", () => {
    const root = fixture();
    const path = resolve(root, "apps/observatory/package.json");
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    manifest.version = "0.400.0";
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
    expect(() => checkReleaseIdentity(root)).toThrow("differs from root 0.420.0");
  });

  test("requires the advertised production tag to resolve to the exact build commit", () => {
    const root = fixture();
    git(root, "init", "-q");
    git(root, "config", "user.name", "Vela release test");
    git(root, "config", "user.email", "release-test@vela.invalid");
    git(root, "add", ".");
    git(root, "commit", "-qm", "fixture release");

    expect(() => checkReleaseIdentity(root, "v0.420.0")).toThrow();

    git(root, "-c", "tag.gpgSign=false", "tag", "v0.420.0");
    expect(checkReleaseIdentity(root, "v0.420.0")).toMatchObject({
      version: "0.420.0",
      tag: "v0.420.0",
      commit: git(root, "rev-parse", "HEAD"),
    });

    writeFileSync(resolve(root, "release-note"), "later commit\n");
    git(root, "add", "release-note");
    git(root, "commit", "-qm", "later commit");
    expect(() => checkReleaseIdentity(root, "v0.420.0")).toThrow("not HEAD");
  });
});
