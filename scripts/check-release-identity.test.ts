import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { checkReleaseIdentity } from "./check-release-identity.mjs";

/*
  The suite that used to live here tested a gate that has been removed: a
  hand-set release tag and commit which had to match VERCEL_GIT_COMMIT_SHA. It
  also restated the version literal in eight places, so bumping the version made
  the suite certifying a release fail that release. Both are gone; the version is
  read from the manifest and the contract is now the two invariants that survive.
*/

const repository = resolve(import.meta.dirname, "..");
const ROOT = "package.json";
const WORKSPACES = [
  "apps/problems/package.json",
  "packages/brand/package.json",
  "packages/activity-data/package.json",
  "packages/projection-data/package.json",
  "packages/ui/package.json",
];
const temporary: string[] = [];

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "vela-web-release-identity-"));
  temporary.push(root);
  for (const path of [ROOT, ...WORKSPACES]) {
    const target = resolve(root, path);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(resolve(repository, path), target);
  }
  return root;
}

function patch(root: string, path: string, edit: (manifest: Record<string, unknown>) => void) {
  const target = resolve(root, path);
  const manifest = JSON.parse(readFileSync(target, "utf8"));
  edit(manifest);
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
}

describe("one Web release identity", () => {
  test("reports the one root version without inventing a release tag", () => {
    const version = JSON.parse(readFileSync(resolve(repository, ROOT), "utf8")).version;
    expect(checkReleaseIdentity(repository)).toEqual({
      ok: true,
      schema: "vela.web-release-identity.v2",
      version,
    });
  });

  test("requires the root version to be pre-1.0 SemVer", () => {
    for (const bad of ["1.0.0", "0.421", "", "latest"]) {
      const root = fixture();
      patch(root, ROOT, (manifest) => { manifest.version = bad; });
      expect(() => checkReleaseIdentity(root)).toThrow("is not pre-1.0 SemVer");
    }
  });

  test("keeps every manifest unpublishable", () => {
    for (const path of [ROOT, ...WORKSPACES]) {
      const root = fixture();
      patch(root, path, (manifest) => { manifest.private = false; });
      expect(() => checkReleaseIdentity(root)).toThrow(`${path} must remain private`);
    }
  });

  test("rejects a workspace that reintroduces its own version", () => {
    const root = fixture();
    patch(root, "packages/brand/package.json", (manifest) => { manifest.version = "0.400.0"; });
    expect(() => checkReleaseIdentity(root)).toThrow(
      "packages/brand/package.json declares its own version",
    );
  });

  test("rejects a workspace version even when it agrees with the root", () => {
    const root = fixture();
    const version = JSON.parse(readFileSync(resolve(root, ROOT), "utf8")).version;
    patch(root, "apps/problems/package.json", (manifest) => { manifest.version = version; });
    expect(() => checkReleaseIdentity(root)).toThrow("declares its own version");
  });
});
