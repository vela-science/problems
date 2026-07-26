#!/usr/bin/env bun

/*
  One version, in one file, and no deploy ceremony.

  This used to gate production builds on a hand-set pair of Vercel environment
  variables, VELA_WEB_RELEASE_TAG and VELA_WEB_RELEASE_COMMIT, where the commit
  had to equal VERCEL_GIT_COMMIT_SHA. That check could only ever fail because
  someone forgot to update the variable — never because anything was actually
  wrong — since it compared a value copied in by hand against the value Vercel
  had already supplied. On Vercel the tag half was vacuous too: the build clone
  carries no tags, so it took the "detached" path and simply trusted the same
  variable. The cost was real. Every push after a release failed production on
  both projects until a human bumped five manifests, cut a tag, and edited two
  variables in two dashboards; that ran red for a day in July 2026 and read as a
  build regression.

  Deployment identity was never coming from any of that. deploymentIdentity() in
  packages/frontier-data/src/deployment.ts reads VERCEL_GIT_COMMIT_SHA and
  VERCEL_DEPLOYMENT_ID directly and throws when a production build cannot supply
  both, and the manifest schema independently requires a commit, a deployment id
  and environment === "production". That is automatic, cannot be typed wrong in a
  dashboard, and is strictly better than what it was wrapped in.

  What remains are the two invariants that are about this repository rather than
  about a deploy:

    - nothing in the workspace can be published to npm by accident
    - there is exactly one version, at the root, in pre-1.0 SemVer

  Tags are still worth cutting when a release means something. They are simply no
  longer a precondition for shipping a commit.
*/

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT_MANIFEST = "package.json";
const WORKSPACE_MANIFESTS = [
  "apps/www/package.json",
  "apps/observatory/package.json",
  "packages/brand/package.json",
  "packages/frontier-data/package.json",
];

function fail(message) {
  throw new Error(`web release identity: ${message}`);
}

function read(repository, path) {
  return JSON.parse(readFileSync(resolve(repository, path), "utf8"));
}

export function checkReleaseIdentity(repository) {
  const root = read(repository, ROOT_MANIFEST);
  const { version } = root;
  if (!/^0\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u.test(version ?? "")) {
    fail(`root version ${JSON.stringify(version)} is not pre-1.0 SemVer`);
  }
  if (root.private !== true) fail(`${ROOT_MANIFEST} must remain private`);

  for (const path of WORKSPACE_MANIFESTS) {
    const manifest = read(repository, path);
    if (manifest.private !== true) fail(`${path} must remain private`);
    /* The root version is the only one. Four copies used to be held in lockstep
       by this check, which made a bump a five-file edit and bought nothing: no
       code read them. Absence is asserted so they cannot creep back. */
    if ("version" in manifest) {
      fail(`${path} declares its own version; the root manifest is the only source`);
    }
  }

  return { ok: true, schema: "vela.web-release-identity.v2", version, tag: `v${version}` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const repository = resolve(import.meta.dirname, "..");
    process.stdout.write(`${JSON.stringify(checkReleaseIdentity(repository))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
