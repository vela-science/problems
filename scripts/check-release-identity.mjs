#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const WORKSPACE_MANIFESTS = [
  "package.json",
  "apps/www/package.json",
  "apps/observatory/package.json",
  "packages/brand/package.json",
  "packages/frontier-data/package.json",
];

function fail(message) {
  throw new Error(`web release identity: ${message}`);
}

function git(repository, args) {
  const result = spawnSync("git", ["-C", repository, ...args], { encoding: "utf8" });
  if (result.status !== 0) fail(result.stderr.trim() || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
}

function gitResult(repository, args) {
  return spawnSync("git", ["-C", repository, ...args], { encoding: "utf8" });
}

export function checkReleaseIdentity(
  repository,
  expectedTag = null,
  expectedCommit = null,
  allowDetached = false,
) {
  const manifests = WORKSPACE_MANIFESTS.map((path) => ({
    path,
    package: JSON.parse(readFileSync(resolve(repository, path), "utf8")),
  }));
  const version = manifests[0].package.version;
  if (!/^0\.[0-9]+\.[0-9]+$/u.test(version)) fail("root version is not stable pre-1.0 SemVer");
  for (const manifest of manifests) {
    if (manifest.package.private !== true) fail(`${manifest.path} must remain private`);
    if (manifest.package.version !== version) {
      fail(`${manifest.path} version ${manifest.package.version} differs from root ${version}`);
    }
  }

  const tag = `v${version}`;
  let commit = null;
  if (expectedTag !== null) {
    if (expectedTag !== tag) fail(`expected tag ${expectedTag} differs from ${tag}`);
    const taggedCommit = gitResult(repository, [
      "rev-parse",
      `refs/tags/${tag}^{commit}`,
    ]);
    if (taggedCommit.status === 0) {
      commit = taggedCommit.stdout.trim();
      const head = git(repository, ["rev-parse", "HEAD"]);
      if (commit !== head) fail(`${tag} resolves to ${commit}, not HEAD ${head}`);
    } else if (
      allowDetached
      && typeof expectedCommit === "string"
      && /^[0-9a-f]{40}$/u.test(expectedCommit)
    ) {
      commit = expectedCommit;
    } else {
      fail(
        taggedCommit.stderr.trim()
        || `${tag} is unavailable and detached release identity is not allowed`,
      );
    }
    if (expectedCommit !== null && commit !== expectedCommit) {
      fail(`${tag} resolves to ${commit}, not registered commit ${expectedCommit}`);
    }
  }
  return { ok: true, schema: "vela.web-release-identity.v1", version, tag, commit };
}

function main() {
  const repository = resolve(import.meta.dirname, "..");
  const args = process.argv.slice(2);
  let expectedTag = null;
  if (args.length > 0) {
    if (args.length !== 2 || args[0] !== "--tag" || !args[1]) fail("usage: check-release-identity.mjs [--tag vX.Y.Z]");
    expectedTag = args[1];
  }
  process.stdout.write(`${JSON.stringify(checkReleaseIdentity(repository, expectedTag))}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
