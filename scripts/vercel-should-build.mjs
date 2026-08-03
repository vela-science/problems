import { execFileSync } from "node:child_process";

const target = process.argv[2];
const targets = {
  www: [
    "apps/www",
    "packages/brand",
    "packages/frontier-data/src",
    "packages/frontier-data/config",
    "packages/frontier-data/package.json",
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

try {
  git(["rev-parse", "--is-inside-work-tree"]);

  // A data refresh may follow editorial-only commits. Compare the actual
  // application dependency surface instead of the unrelated monorepo SHA.
  if (process.argv[3] === "--equivalent") {
    const previous = process.argv[4];
    const current = process.argv[5];
    if (!validCommit(previous) || !validCommit(current) || process.argv.length !== 6) {
      throw new Error("--equivalent requires two exact commits");
    }
    process.exit(changedPaths(previous, current).length === 0 ? 0 : 1);
  }
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
