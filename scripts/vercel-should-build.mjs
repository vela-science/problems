import { execFileSync } from "node:child_process";

const target = process.argv[2];
const targets = {
  www: [
    "apps/www",
    "packages/brand",
    "packages/observatory-data/src",
    "packages/observatory-data/config",
    "packages/observatory-data/package.json",
    ".vercelignore",
    "package.json",
    "bun.lock",
  ],
};

if (!(target in targets)) {
  console.error("usage: bun scripts/vercel-should-build.mjs www");
  process.exit(1);
}

function validCommit(value) {
  return /^[0-9a-f]{40}$/u.test(value ?? "");
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function changedPaths(previous, current) {
  git(["cat-file", "-e", `${previous}^{commit}`]);
  git(["cat-file", "-e", `${current}^{commit}`]);
  return git(["diff", "--name-only", previous, current, "--", ...targets[target]])
    .split("\n")
    .filter(Boolean);
}

/* There was a second mode here, `--equivalent <previous> <current>`, which
   compared two named commits instead of Vercel's pair. It existed for the
   Observatory: a data refresh may follow editorial-only commits, so the
   redeploy needed to ask whether the application surface had really changed
   between the deployed commit and the one it was about to ship. The Observatory
   has no Git deploy any more — apps/observatory/vercel.json sets
   `git.deploymentEnabled: false` and carries no ignoreCommand, and its redeploy
   is a hook fired from refresh-projection.yml, which refresh-integrity.test.ts
   asserts does not invoke this script. Its last caller was its own test. */
try {
  git(["rev-parse", "--is-inside-work-tree"]);

  const current = validCommit(process.env.VERCEL_GIT_COMMIT_SHA)
    ? process.env.VERCEL_GIT_COMMIT_SHA
    : git(["rev-parse", "HEAD"]);
  let previous = validCommit(process.env.VERCEL_GIT_PREVIOUS_SHA)
    ? process.env.VERCEL_GIT_PREVIOUS_SHA
    : "";

  if (!previous) {
    try {
      previous = git(["rev-parse", `${current}^`]);
    } catch {
      process.exit(1);
    }
  }

  const changed = changedPaths(previous, current);

  // Vercel's ignore command skips a build on zero and builds on one.
  process.exit(changed.length === 0 ? 0 : 1);
} catch {
  // Missing Git history or an invalid comparison must build, never fail a deployment.
  process.exit(1);
}
