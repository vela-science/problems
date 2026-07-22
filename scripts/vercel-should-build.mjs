import { execFileSync } from "node:child_process";

const target = process.argv[2];
const targets = {
  observatory: [
    "apps/observatory",
    "packages/brand",
    "packages/frontier-data/src",
    "packages/frontier-data/config",
    "packages/frontier-data/package.json",
    ".vercelignore",
    "package.json",
    "bun.lock",
  ],
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
  console.error("usage: bun scripts/vercel-should-build.mjs <observatory|www>");
  process.exit(1);
}

function validCommit(value) {
  return /^[0-9a-f]{40}$/u.test(value ?? "");
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

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

  // The projection refresh deploy hook rebuilds the current Observatory
  // commit after atomically activating a new rooted data release. Vercel
  // represents that hook as an exact same-commit comparison. It must build;
  // otherwise a truthful data refresh can be activated in Neon but remain
  // invisible behind the previous deployment manifest.
  if (target === "observatory" && previous === current) {
    process.exit(1);
  }

  git(["cat-file", "-e", `${previous}^{commit}`]);
  git(["cat-file", "-e", `${current}^{commit}`]);
  const changed = git(["diff", "--name-only", previous, current, "--", ...targets[target]])
    .split("\n")
    .filter(Boolean);

  // Vercel's ignore command skips a build on zero and builds on one.
  process.exit(changed.length === 0 ? 0 : 1);
} catch {
  // Missing Git history or an invalid comparison must build, never fail a deployment.
  process.exit(1);
}
