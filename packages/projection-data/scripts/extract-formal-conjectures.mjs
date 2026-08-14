/**
 * Moves the Formal Conjectures pin.
 *
 * Both halves of that source are retained bytes, and neither can be refetched
 * at a revision. `conjectures.json` is a GitHub Pages build artifact tracked at
 * no ref — `git ls-files` upstream does not list it — and the statements exist
 * only by elaborating the library under Lean. So this is the one path that can
 * produce a new pin, and it is deliberately a human running a command rather
 * than a step in the daily refresh: a cold run takes about half an hour and
 * leaves roughly ten gigabytes of build output.
 *
 * What it does, in the order that matters:
 *
 *   1. Asks the deployment API which commit's build is being served. That, not
 *      `main`, is the revision the published artifact came from. Pages lags
 *      pushes, so the two routinely differ.
 *   2. Fetches that artifact and retains it.
 *   3. Checks out the same commit, builds, and runs the repository's own
 *      extractor against it.
 *   4. Prints the commit, tree, and both content roots.
 *
 * Every value it prints was computed from bytes it fetched or read here. Paste
 * them into `formalConjecturesRelease`; the adapter checks all four on every
 * refresh, so a mistyped root fails the next run rather than being believed.
 *
 *   bun packages/projection-data/scripts/extract-formal-conjectures.mjs
 *   bun packages/projection-data/scripts/extract-formal-conjectures.mjs --checkout ~/personal/formal-conjectures
 *
 * `--checkout` reuses a clone you have already built, which turns half an hour
 * into about two minutes. It is checked out to the served commit first, so the
 * bytes still answer to the pin, and the clone is left on that commit.
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  formalConjecturesPagesDeployments,
  formalConjecturesRelease,
  resolvePagesDeploymentCommit,
} from "../src/source-adapters/formal-conjectures.ts";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const retainedDirectory = join(root, "config/formal-conjectures");
const publishedUrl =
  "https://google-deepmind.github.io/formal-conjectures/data/conjectures.json";
const repository = formalConjecturesRelease.repository;

const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

async function git(directory, args) {
  const { stdout } = await execFileAsync("git", ["-C", directory, ...args], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.trim();
}

/* The same three commands, in the same order, that upstream's own workflow runs
   before it extracts. `lake exe extract_names` alone does not build the
   conjecture library — it builds the executable and the three modules the
   script imports — and an unbuilt environment yields `{"problems": []}` and
   exit 0, so leaving the first two out fails silently rather than loudly. */
async function extract(checkout) {
  for (const argv of [["exe", "cache", "get"], ["build"]]) {
    process.stderr.write(`lake ${argv.join(" ")}\n`);
    await execFileAsync("lake", argv, {
      cwd: checkout,
      encoding: "buffer",
      maxBuffer: 256 * 1024 * 1024,
    });
  }
  process.stderr.write("lake exe extract_names\n");
  const { stdout } = await execFileAsync("lake", ["exe", "extract_names"], {
    cwd: checkout,
    encoding: "buffer",
    maxBuffer: 256 * 1024 * 1024,
  });
  return new Uint8Array(stdout);
}

const commit = await resolvePagesDeploymentCommit(
  option("--deployments") ?? formalConjecturesPagesDeployments,
);
process.stderr.write(`github-pages deployment serves ${commit}\n`);

const response = await fetch(publishedUrl, {
  redirect: "follow",
  headers: { accept: "application/json", "user-agent": "vela-source-adapter/1.0" },
});
if (!response.ok) {
  throw new Error(`published dataset fetch failed (${response.status}) for ${publishedUrl}`);
}
const publishedBytes = new Uint8Array(await response.arrayBuffer());

const supplied = option("--checkout");
const temporary = supplied ? null : await mkdtemp(join(tmpdir(), "vela-formal-conjectures-"));
const checkout = supplied ? resolve(supplied) : join(temporary, "repository");
try {
  if (temporary) {
    await execFileAsync("git", ["clone", "--quiet", "--", repository, checkout]);
  } else {
    await git(checkout, ["fetch", "--quiet", "--no-tags", "origin", commit]);
  }
  await git(checkout, ["checkout", "--quiet", "--detach", commit]);
  const status = await git(checkout, ["status", "--porcelain=v1", "--untracked-files=no"]);
  if (status !== "") {
    throw new Error(`checkout ${checkout} is dirty; the extraction would not answer to ${commit}`);
  }
  const tree = await git(checkout, ["rev-parse", "--verify", "HEAD^{tree}"]);
  const extractedBytes = await extract(checkout);

  const problems = JSON.parse(Buffer.from(extractedBytes).toString("utf8")).problems;
  if (!Array.isArray(problems) || problems.length === 0) {
    throw new Error("the extractor produced no problems; the conjecture library was not built");
  }
  const conjectures = JSON.parse(Buffer.from(publishedBytes).toString("utf8")).conjectures;
  /* The published half is what the projection counts and the extracted half is
     what fills those rows in. If they disagree the pin is being taken across a
     redeployment, and the adapter would refuse it later with a message about
     one theorem out of thousands. */
  if (!Array.isArray(conjectures) || conjectures.length !== problems.length) {
    throw new Error(
      `the served dataset has ${conjectures?.length} theorems and the extraction at ${commit}`
      + ` has ${problems.length}; Pages redeployed mid-run, so re-run this`,
    );
  }

  await mkdir(retainedDirectory, { recursive: true });
  await writeFile(join(retainedDirectory, "conjectures.json"), publishedBytes);
  await writeFile(join(retainedDirectory, "extract-names.json"), extractedBytes);

  console.log(JSON.stringify({
    ok: true,
    command: "formal-conjectures.repin",
    commit,
    tree,
    published_root: sha256(publishedBytes),
    extracted_root: sha256(extractedBytes),
    theorems: problems.length,
    statements: problems.filter(({ statement }) => statement).length,
    docstrings: problems.filter(({ docstring }) => docstring).length,
  }, null, 2));
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
