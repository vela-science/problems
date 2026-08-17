import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { repositoryRegistry } from "../packages/projection-data/src/registry.ts";

const root = resolve(import.meta.dirname, "..");
const CHILD_ENVIRONMENT = Object.freeze([
  "PATH", "LANG", "LC_ALL", "LC_CTYPE", "TERM", "TMPDIR", "SHELL", "USER", "LOGNAME",
  "BUN_INSTALL", "NO_COLOR", "FORCE_COLOR",
]);
const RELEASE_GIT_IDENTITY = Object.freeze({
  GIT_AUTHOR_NAME: "Vela Problems release",
  GIT_AUTHOR_EMAIL: "release@vela.space",
  GIT_COMMITTER_NAME: "Vela Problems release",
  GIT_COMMITTER_EMAIL: "release@vela.space",
});

function required(environment, name) {
  const value = environment[name];
  if (!value) throw new Error(`missing required release input ${name}`);
  return value;
}

export function releaseChildEnvironment(environment, allowed = []) {
  const names = new Set([...CHILD_ENVIRONMENT, ...allowed]);
  const child = Object.fromEntries(
    [...names].filter((name) => environment[name]).map((name) => [name, environment[name]]),
  );
  child.HOME = required(environment, "VELA_RELEASE_HOME");
  child.XDG_CONFIG_HOME = join(child.HOME, ".config");
  child.XDG_CACHE_HOME = join(child.HOME, ".cache");
  return child;
}

function environmentFor(environment, allowed = []) {
  return {
    ...releaseChildEnvironment(environment, allowed),
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "credential.helper",
    GIT_CONFIG_VALUE_0: "",
  };
}

function githubEnvironment(environment) {
  return releaseChildEnvironment(environment, ["GH_TOKEN", "GH_CONFIG_DIR"]);
}

function shellQuote(value) {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function githubGitEnvironment(environment, { commit = false } = {}) {
  const githubCli = required(environment, "VELA_GITHUB_CLI");
  return {
    ...githubEnvironment(environment),
    ...(commit ? RELEASE_GIT_IDENTITY : {}),
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_KEY_0: "credential.helper",
    GIT_CONFIG_VALUE_0: "",
    GIT_CONFIG_KEY_1: "credential.helper",
    GIT_CONFIG_VALUE_1: `!${shellQuote(githubCli)} auth git-credential`,
  };
}

function nativeGitHubCli(environment) {
  if (environment.VELA_GITHUB_CLI && !environment.VELA_GITHUB_CLI.startsWith("/")) {
    throw new Error("VELA_GITHUB_CLI must be an absolute executable path");
  }
  const candidates = [
    environment.VELA_GITHUB_CLI,
    "/opt/homebrew/bin/gh",
    "/usr/local/bin/gh",
    "/usr/bin/gh",
  ].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], {
      env: environment,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status === 0) return realpathSync(candidate);
  }
  throw new Error("direct release requires the native GitHub CLI executable");
}

function neonEnvironment(environment) {
  return environmentFor(environment, ["NEON_API_KEY"]);
}

function vercelEnvironment(environment) {
  return environmentFor(environment, ["VERCEL_TOKEN", "VERCEL_GLOBAL_CONFIG"]);
}

function run(command, args, { environment = process.env, cwd = root, quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: environment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", quiet ? "pipe" : "inherit"],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const detail = quiet && result.stderr ? `: ${result.stderr.trim()}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${detail}`);
  }
  return result.stdout.trim();
}

function git(args, cwd = root, environment = process.env) {
  return run("git", args, { cwd, environment, quiet: true });
}

function exactWebCheckout(environment) {
  const safe = githubGitEnvironment(environment);
  const expectedRemote = "https://github.com/vela-science/vela-web.git";
  const head = git(["rev-parse", "HEAD"], root, safe);
  if (git(["branch", "--show-current"], root, safe) !== "main") {
    throw new Error("release requires main");
  }
  if (git(["remote", "get-url", "origin"], root, safe) !== expectedRemote) {
    throw new Error("release requires the canonical vela-science/vela-web origin");
  }
  if (git(["status", "--porcelain"], root, safe)) {
    throw new Error("release requires a clean worktree");
  }
  run("git", ["fetch", "--quiet", "origin", "main"], { environment: safe });
  if (git(["rev-parse", "origin/main"], root, safe) !== head) {
    throw new Error("release requires exact origin/main parity");
  }
  return head;
}

const releaseLockRef = "refs/heads/ops/problems-release-lock";

function remoteReleaseLock(environment) {
  const safe = githubGitEnvironment(environment);
  return run("git", ["ls-remote", "--refs", "origin", releaseLockRef], {
    environment: safe,
    quiet: true,
  }).split(/\s+/u)[0] ?? "";
}

function acquireReleaseLock(environment, context) {
  const safe = githubGitEnvironment(environment, { commit: true });
  if (remoteReleaseLock(environment)) throw new Error("another Problems release holds the remote lock");
  const tree = git(["rev-parse", "HEAD^{tree}"], root, safe);
  const lock = run("git", [
    "commit-tree", tree,
    "-p", context.siteCommit,
    "-m", `Problems release lock ${randomUUID()}`,
  ], { environment: safe, quiet: true });
  run("git", ["push", "origin", `${lock}:${releaseLockRef}`], {
    environment: safe,
    quiet: true,
  });
  if (remoteReleaseLock(environment) !== lock) {
    throw new Error("Problems release lock readback drift");
  }
  context.releaseLock = lock;
}

function releaseReleaseLock(environment, context) {
  if (!context.releaseLock) return;
  if (remoteReleaseLock(environment) !== context.releaseLock) {
    throw new Error("Problems release lock ownership changed");
  }
  run("git", [
    "push",
    `--force-with-lease=${releaseLockRef}:${context.releaseLock}`,
    "origin",
    `:${releaseLockRef}`,
  ], { environment: githubGitEnvironment(environment), quiet: true });
  if (remoteReleaseLock(environment)) throw new Error("Problems release lock was not removed");
  context.releaseLock = null;
}

export function releaseWorkDirectory(environment) {
  if (!environment.VELA_RELEASE_WORKDIR) {
    const path = mkdtempSync(join(tmpdir(), "vela-problems-release-"));
    chmodSync(path, 0o700);
    return { path: realpathSync(path), ephemeral: true };
  }
  const path = resolve(environment.VELA_RELEASE_WORKDIR);
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("VELA_RELEASE_WORKDIR must be a real directory");
  }
  if (readdirSync(path).length !== 0) throw new Error("VELA_RELEASE_WORKDIR must be empty");
  if ((stat.mode & 0o077) !== 0) throw new Error("VELA_RELEASE_WORKDIR must be private (0700)");
  return { path: realpathSync(path), ephemeral: false };
}

function verifyNeonProductionBranch(environment) {
  const safe = neonEnvironment(environment);
  const config = environment.NEON_API_KEY
    ? []
    : ["--config-dir", required(environment, "VELA_NEON_CONFIG_DIR")];
  const raw = run("neonctl", [
    "branches", "list",
    "--project-id", "lingering-meadow-20929365",
    "--output", "json",
    ...config,
  ], { environment: safe });
  const branches = JSON.parse(raw);
  const production = branches.filter(({ default: isDefault }) => isDefault);
  if (
    production.length !== 1
    || production[0].id !== "br-gentle-unit-aemc23nf"
    || production[0].name !== "main"
    || production[0].current_state !== "ready"
  ) throw new Error("Neon production branch identity or readiness drift");
  return { project_id: "lingering-meadow-20929365", branch_id: production[0].id };
}

function verifyVelaBinary(environment, velaBin) {
  const safe = environmentFor(environment);
  const record = JSON.parse(readFileSync(
    resolve(root, "packages/projection-data/config/vela-release.v1.json"),
    "utf8",
  ));
  const expected = process.platform === "darwin"
    ? record.macos_generator_binary_sha256
    : record.generator_binary_sha256;
  if (run(velaBin, ["--version"], { environment: safe }) !== `vela ${record.version}`) {
    throw new Error("Vela generator version does not match the release record");
  }
  const digest = `sha256:${run("shasum", ["-a", "256", velaBin], { environment: safe }).split(/\s+/u)[0]}`;
  if (digest !== expected) throw new Error("Vela generator bytes do not match the release record");
  return { version: record.version, binary_root: digest };
}

function acquireRepositories(environment, work) {
  const safe = environmentFor(environment);
  const repositoriesRoot = join(work, "repositories");
  run("mkdir", ["-p", repositoriesRoot], { environment: safe });
  for (const entry of repositoryRegistry.repositories) {
    const directory = join(repositoriesRoot, entry.directory);
    const remote = entry.remotes[0];
    run("git", ["clone", "--no-local", "--origin", "origin", remote, directory], {
      environment: safe,
    });
    if (git(["remote", "get-url", "origin"], directory, safe) !== remote) {
      throw new Error(`${entry.slug}: acquired remote drift`);
    }
    if (git(["branch", "--show-current"], directory, safe) !== entry.branch) {
      throw new Error(`${entry.slug}: canonical branch is not ${entry.branch}`);
    }
    run("git", ["fetch", "--quiet", "origin", entry.branch], { cwd: directory, environment: safe });
    if (git(["rev-parse", "HEAD"], directory, safe) !== git(["rev-parse", `origin/${entry.branch}`], directory, safe)) {
      throw new Error(`${entry.slug}: acquired checkout is not current origin/${entry.branch}`);
    }
    if (git(["status", "--porcelain"], directory, safe)) {
      throw new Error(`${entry.slug}: acquired checkout is dirty`);
    }
  }
  return repositoriesRoot;
}

function runStaticQualification(environment) {
  const safe = environmentFor(environment);
  for (const [command, args] of [
    ["bun", ["install", "--frozen-lockfile"]],
    ["bun", ["run", "check"]],
    ["bun", ["run", "lint"]],
    ["bun", ["run", "test"]],
    ["bun", ["run", "format:check"]],
  ]) run(command, args, { environment: safe });
}

export function releaseLookupState({ status, stdout = "", stderr = "" }) {
  if (status === 0) return "present";
  if (/^HTTP\/\S+ 404\b/mu.test(`${stdout}\n${stderr}`)) return "missing";
  return null;
}

function releaseLookup(environment, tag) {
  const safe = githubEnvironment(environment);
  const result = spawnSync(required(environment, "VELA_GITHUB_CLI"), [
    "api", `repos/vela-science/vela-web/releases/tags/${tag}`, "--include",
  ], { env: safe, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const state = releaseLookupState(result);
  if (state) return state;
  throw new Error(`could not determine retained release state for ${tag}`);
}

function retainExactFile(environment, { tag, path, target, title, notes }) {
  const safe = githubEnvironment(environment);
  if (releaseLookup(environment, tag) === "missing") {
    run(required(environment, "VELA_GITHUB_CLI"), [
      "release", "create", tag, path,
      "--repo", "vela-science/vela-web",
      "--target", target,
      "--title", title,
      "--notes", notes,
      "--latest=false",
    ], { environment: safe });
    return;
  }
  const existing = join(dirname(path), `retained-${basename(path)}`);
  run(required(environment, "VELA_GITHUB_CLI"), [
    "release", "download", tag,
    "--repo", "vela-science/vela-web",
    "--pattern", basename(path),
    "--output", existing,
  ], { environment: safe });
  run("cmp", [path, existing], { environment: safe });
}

function prepareAdapters(environment, work, siteCommit) {
  const safe = environmentFor(environment);
  const raw = run("bun", [
    "packages/projection-data/scripts/source-adapters.mjs",
    "refresh",
    "--output", join(work, "source-adapters"),
    "--artifact-directory", work,
  ], { environment: safe });
  const result = JSON.parse(raw.split("\n").at(-1));
  return { ...result, prepared_for_site_commit: siteCommit };
}

function retainAdapters(environment, context) {
  const tag = `source-adapter-set-${context.adapter.set_root.slice("sha256:".length)}`;
  retainExactFile(environment, {
    tag,
    path: context.adapter.artifact_path,
    target: context.siteCommit,
    title: `Projection source evidence ${context.adapter.set_root.slice("sha256:".length)}`,
    notes: "Content-addressed source inputs for reconstructing the read-only Problems projection.",
  });
  context.adapter.retention_tag = tag;
}

function activityQualification(environment) {
  const migrate = environmentFor(environment, ["VELA_ACTIVITY_MIGRATOR_DATABASE_URL"]);
  const read = environmentFor(environment, ["VELA_ACTIVITY_DATABASE_URL"]);
  const both = environmentFor(environment, [
    "VELA_ACTIVITY_MIGRATOR_DATABASE_URL",
    "VELA_ACTIVITY_DATABASE_URL",
    "VELA_PROJECTION_DATABASE_URL",
  ]);
  run("bun", ["run", "activity:db:migrate"], { environment: migrate });
  run("bun", ["run", "activity:db:check"], { environment: read });
  run("bun", ["run", "activity:db:verify"], { environment: both });
  run("bun", ["run", "activity:db:live-proof"], { environment: both });
}

function projectionQualification(environment, context) {
  if (environment.VELA_PROJECTION_ALLOW_CORPUS_DROP || environment.CORPUS_DROP_REASON) {
    throw new Error("direct release refuses ambient corpus-drop overrides");
  }
  const both = environmentFor(environment, [
    "VELA_PROJECTION_WRITER_DATABASE_URL",
    "VELA_PROJECTION_DATABASE_URL",
  ]);
  run("bun", ["scripts/check-projection-environment.mjs"], { environment: both });
  const writer = environmentFor(environment, ["VELA_PROJECTION_WRITER_DATABASE_URL"]);
  Object.assign(writer, {
    VELA_BIN: context.velaBin,
    VELA_REPOSITORIES_ROOT: context.repositoriesRoot,
    VELA_SOURCE_ADAPTER_ARTIFACT: context.adapter.artifact_path,
  });
  const raw = run("bun", [
    "packages/projection-data/scripts/refresh-neon-projection.mjs",
  ], { environment: writer });
  context.refresh = JSON.parse(raw.split("\n").at(-1));
  // The old production deployment remains live on its old database. Activating
  // this fresh database is off-path and cannot alter the public rollback floor.
  writeRollbackCheckpoint(context, "projection_activated");
  const reader = environmentFor(environment, ["VELA_PROJECTION_DATABASE_URL"]);
  run("bun", ["run", "db:check"], { environment: reader });
  run("bun", ["run", "projection:verify"], { environment: reader });
}

function initializeProjectionSchema(environment) {
  run("bun", ["run", "db:migrate"], {
    environment: environmentFor(environment, ["VELA_PROJECTION_WRITER_DATABASE_URL"]),
  });
  run("bun", ["run", "db:check"], {
    environment: environmentFor(environment, ["VELA_PROJECTION_DATABASE_URL"]),
  });
}

async function captureRollbackFloor(context) {
  const response = await fetch("https://problems.science/.well-known/vela-site.json", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`rollback-floor manifest returned HTTP ${response.status}`);
  const manifest = await response.json();
  if (
    manifest.schema !== "vela.site-deployment.v4"
    || !["observatory", "problems"].includes(manifest.site?.product)
    || !/^[0-9a-f]{40}$/u.test(manifest.site?.commit ?? "")
    || !/^sha256:[0-9a-f]{64}$/u.test(manifest.projection?.release_root ?? "")
    || manifest.deployment?.provider !== "vercel"
    || manifest.deployment?.environment !== "production"
    || !/^dpl_[A-Za-z0-9]{1,120}$/u.test(manifest.deployment?.id ?? "")
  ) throw new Error("rollback-floor manifest is incomplete");
  /* The first coherence cutover captures the exact still-live pre-rename
     deployment. This is read-only rollback custody, not an emitted alias:
     every current manifest below requires product `problems`. */
  context.rollbackFloor = {
    site_commit: manifest.site.commit,
    projection_release_root: manifest.projection.release_root,
    deployment_id: manifest.deployment.id,
  };
  context.initialProduction = { ...context.rollbackFloor };
}

function writeRollbackCheckpoint(context, phase) {
  const targetRoot = context.refresh?.release_root ?? null;
  const targetDeployment = context.deployment?.deployment_id ?? null;
  const rollback = targetRoot && targetDeployment ? [
    ...(targetDeployment !== context.rollbackFloor.deployment_id ? [
      `vercel rollback ${context.rollbackFloor.deployment_id} --yes --scope constellate-dc388081`,
    ] : []),
    `bun apps/problems/scripts/check-deployed-manifest.mjs https://problems.science ${context.rollbackFloor.site_commit}`,
  ] : [];
  const forward = targetRoot && targetDeployment ? [
    ...(targetDeployment !== context.rollbackFloor.deployment_id ? [
      `vercel rollback ${targetDeployment} --yes --scope constellate-dc388081`,
    ] : []),
    `bun apps/problems/scripts/check-deployed-manifest.mjs https://problems.science ${context.siteCommit}`,
  ] : [];
  const body = {
    schema: "vela.projection-direct-release-recovery.v1",
    authority_effect: "none",
    phase,
    prior: context.rollbackFloor,
    target: {
      site_commit: context.siteCommit,
      projection_release_root: targetRoot,
      deployment_id: targetDeployment,
    },
    rollback,
    forward_recovery: forward,
    ordering: "switch_database_bound_provider_deployment_then_verify_combined_manifest",
  };
  const record = { ...body, record_root: qualificationRoot(body) };
  assertPublicQualification(record);
  const path = join(context.work, "rollback-checkpoint.json");
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  context.rollbackCheckpoint = record;
}

function publishSiteCommit(environment, context) {
  const safe = githubGitEnvironment(environment);
  run("git", ["fetch", "--quiet", "origin", "main"], { environment: safe });
  if (git(["rev-parse", "origin/main"], root, safe) !== context.siteCommit) {
    throw new Error("origin/main advanced before publication; refusing unqualified overwrite");
  }
  run("git", ["fetch", "--quiet", "origin", "main"], { environment: safe });
  if (git(["rev-parse", "origin/main"], root, safe) !== context.siteCommit) {
    throw new Error("post-refresh origin/main parity lost");
  }
}

function productQualification(environment, context, { projectionTests }) {
  const reader = environmentFor(environment, [
    "VELA_PROJECTION_DATABASE_URL",
    "VELA_ACTIVITY_DATABASE_URL",
  ]);
  Object.assign(reader, { VERCEL_ENV: "development" });
  if (projectionTests) Object.assign(reader, {
    VELA_REQUIRE_PROJECTION_TESTS: "1",
    VELA_REPOSITORIES_ROOT: context.repositoriesRoot,
    VELA_BIN: context.velaBin,
  });
  const commands = [
    ["bun", ["run", "build"]],
    ["bun", ["run", "--filter", "@vela/problems", "check:runtime"]],
    ["bun", ["run", "test:budgets"]],
    ["bun", ["run", "test:manifests"]],
  ];
  if (projectionTests) commands.unshift(
    ["bun", ["run", "--filter", "@vela/projection-data", "test"]],
  );
  else commands.unshift(["bun", ["run", "db:check"]]);
  for (const [command, args] of commands) run(command, args, { environment: reader });
}

function pruneProjection(environment, context) {
  const writer = environmentFor(environment, ["VELA_PROJECTION_WRITER_DATABASE_URL"]);
  const raw = run("bun", [
    "packages/projection-data/scripts/prune-releases.mjs",
  ], { environment: writer });
  context.prune = parsePruneResult(raw);
  run("bun", ["run", "projection:verify"], {
    environment: environmentFor(environment, ["VELA_PROJECTION_DATABASE_URL"]),
  });
}

export function parsePruneResult(raw) {
  const result = JSON.parse(raw);
  const fields = [
    "authority_effect",
    "ok",
    "removed_declarations",
    "removed_observations",
    "removed_releases",
    "retention",
    "schema",
  ];
  const roots = fields.slice(2, 5).map((field) => result?.[field]);
  if (
    !result || typeof result !== "object" || Array.isArray(result)
    || JSON.stringify(Object.keys(result).sort()) !== JSON.stringify(fields)
    || result?.schema !== "vela.projection-prune-result.v1"
    || result?.ok !== true
    || result?.authority_effect !== "none"
    || result?.retention !== "current_and_two_predecessors"
    || roots.some((values) => !Array.isArray(values))
    || roots.flat().some((rootValue) => !/^sha256:[0-9a-f]{64}$/u.test(rootValue))
    || roots.some((values) => new Set(values).size !== values.length)
  ) {
    throw new Error("projection prune returned an invalid result");
  }
  return Object.fromEntries(fields.map((field) => [field, result[field]]));
}

function reconstruct(environment, context) {
  const reader = environmentFor(environment, ["VELA_PROJECTION_DATABASE_URL"]);
  const output = join(context.work, "projection-reconstruction.json");
  const runnerTemp = join(context.work, "reconstruction");
  mkdirSync(runnerTemp, { mode: 0o700 });
  run("bun", [
    "run", "projection:reconstruct", "--",
    "--repositories-root", context.repositoriesRoot,
    "--vela", context.velaBin,
    "--source-adapter-artifact", context.adapter.artifact_path,
    "--output", output,
  ], { environment: { ...reader, RUNNER_TEMP: runnerTemp } });
  context.reconstruction = JSON.parse(readFileSync(output, "utf8"));
}

function deploy(environment, context, field = "deployment") {
  const safe = vercelEnvironment(environment);
  const raw = run("bun", ["scripts/deploy-vercel-problems.mjs"], {
    environment: {
      ...safe,
      VELA_SITE_COMMIT: context.siteCommit,
      GITHUB_REPOSITORY: "vela-science/vela-web",
      GITHUB_REF: "refs/heads/main",
    },
  });
  context[field] = JSON.parse(raw.split("\n").at(-1));
}

async function readiness(environment, context) {
  const deadline = Date.now() + 12 * 60_000;
  let manifest;
  while (Date.now() < deadline) {
    const response = await fetch("https://problems.science/.well-known/vela-site.json", {
      cache: "no-store",
    }).catch(() => undefined);
    if (response?.ok) {
      manifest = await response.json();
      if (
        manifest.site?.product === "problems"
        && manifest.site?.commit === context.siteCommit
        && manifest.projection?.release_root === context.refresh.release_root
        && manifest.deployment?.id === context.deployment.deployment_id
      ) break;
    }
    await Bun.sleep(5_000);
  }
  if (
    manifest?.site?.product !== "problems"
    || manifest?.site?.commit !== context.siteCommit
    || manifest?.projection?.release_root !== context.refresh.release_root
    || manifest?.deployment?.id !== context.deployment.deployment_id
  ) throw new Error("production manifest did not converge to the qualified commit and projection");

  const flagship = await fetch("https://problems.science/problems/erdos-problems/321?view=history", {
    redirect: "error",
    cache: "no-store",
  });
  const flagshipBody = flagship.ok ? await flagship.text() : "";
  for (const identity of [
    "vcl_1da4282b752192c52c2a985476fc13bfe460da01e4fe26c5543b7acb37d8b120",
    "vcl_b9c6915de55e15c69d06b9aeed786b0e632986374a347d77ff447ad244f67a2e",
  ]) {
    if (!flagshipBody.includes(identity)) {
      throw new Error(`Erdős 321 history is missing exact Claim identity ${identity}`);
    }
  }

  const repositoryPaths = context.refresh.repositories.map(({ route_slug: slug }) => `/repositories/${slug}`);
  for (const path of repositoryPaths) {
    let agreed = false;
    for (let attempt = 0; attempt < 20 && !agreed; attempt += 1) {
      const response = await fetch(`https://problems.science${path}`, { redirect: "error" })
        .catch(() => undefined);
      const sibling = await fetch(`https://problems.science${path}.json`, { redirect: "error" })
        .catch(() => undefined);
      const siblingRoot = sibling?.ok
        ? (await sibling.json().catch(() => undefined))?.release_root
        : sibling?.status === 404 ? "absent" : "unreachable";
      agreed = Boolean(
        response?.ok
        && (await response.text()).includes(context.refresh.release_root)
        && (siblingRoot === "absent" || siblingRoot === context.refresh.release_root),
      );
      if (!agreed) await Bun.sleep(5_000);
    }
    if (!agreed) throw new Error(`${path}: production page does not carry the qualified projection root`);
  }
  for (const path of [
    "/sources/source%3Anot-a-source",
    "/problems/erdos-problems/999999",
    ...repositoryPaths.flatMap((repositoryPath) => [
      `${repositoryPath}/claims/vcl_not-a-real-claim`,
      `${repositoryPath}/problems/999999`,
    ]),
  ]) {
    let status = 0;
    for (let attempt = 0; attempt < 12 && status !== 404; attempt += 1) {
      status = (await fetch(`https://problems.science${path}`, { redirect: "manual" })
        .catch(() => undefined))?.status ?? 0;
      if (status !== 404) await Bun.sleep(5_000);
    }
    if (status !== 404) throw new Error(`${path}: missing record returned ${status}`);
  }
  const reader = environmentFor(environment, ["VELA_PROJECTION_DATABASE_URL"]);
  run("bun", [
    "apps/problems/scripts/check-deployed-manifest.mjs",
    "https://problems.science", context.siteCommit,
  ], { environment: reader });
  context.manifest = manifest;
}

function qualificationRoot(record) {
  return `sha256:${createHash("sha256").update(JSON.stringify(record)).digest("hex")}`;
}

export function assertPublicQualification(record) {
  const bytes = JSON.stringify(record);
  const forbidden = [
    /(?:postgres(?:ql)?|neon):\/\//iu,
    /\/Users\//u,
    /\/home\//u,
    /\/private\/tmp\//u,
    /[A-Za-z]:\\Users\\/u,
    /(?:DATABASE_URL|AUTH_SOCK|PRIVATE_KEY|PASSWORD|SECRET|TOKEN|API_KEY|CREDENTIAL|DSN)/u,
  ];
  if (forbidden.some((pattern) => pattern.test(bytes))) {
    throw new Error("direct release qualification contains a credential or private path");
  }
}

function retainQualification(environment, context) {
  const body = {
    schema: "vela.projection-direct-release-qualification.v1",
    authority_effect: "none",
    site_commit: context.siteCommit,
    projection_release_root: context.refresh.release_root,
    repositories: context.refresh.repositories,
    adapter_set_root: context.adapter.set_root,
    adapter_retention_tag: context.adapter.retention_tag,
    reconstruction: context.reconstruction,
    deployment: context.deployment,
    public_manifest: context.manifest,
    pruning: context.prune,
    rollback_floor: {
      ...context.rollbackFloor,
      rollback: context.rollbackCheckpoint.rollback,
      forward_recovery: context.rollbackCheckpoint.forward_recovery,
      ordering: context.rollbackCheckpoint.ordering,
      retention: "old_database_deployment_retained_as_cross_database_rollback_floor",
    },
    replaced_production: context.initialProduction,
    gates: [
      "static_check_lint_test_format",
      "activity_migrate_check_verify",
      "projection_migrate_activate_verify",
      "projection_backed_build_runtime_budgets_manifests",
      "provider_loss_reconstruction",
      "production_manifest_routes_aliases_and_404",
      "erdos_321_v3_history_and_missing_problem",
      "current_and_two_projection_release_retention",
      "clean_projection_database_baseline",
    ],
    nonclaims: [
      "This release does not create scientific authority or change Standing.",
      "Provider deployment and passing checks do not establish scientific acceptance or external adoption.",
      "GitHub Actions is not required to reproduce this operator transaction.",
    ],
  };
  const record = { ...body, record_root: qualificationRoot(body) };
  assertPublicQualification(record);
  const path = join(context.work, `vela-problems-direct-release-${context.siteCommit}.json`);
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  retainExactFile(environment, {
    tag: `problems-direct-release-${context.deployment.deployment_id}`,
    path,
    target: context.siteCommit,
    title: `Direct Problems release ${context.siteCommit.slice(0, 12)}`,
    notes: "Exact local qualification, projection reconstruction, Vercel deployment, and public-readiness record.",
  });
  context.qualification = record;
}

const stageDefinitions = Object.freeze([
  ["exact_checkout", (environment, context) => { context.siteCommit = exactWebCheckout(environment); }],
  ["release_lock", (environment, context) => acquireReleaseLock(environment, context)],
  ["static_qualification", (environment) => runStaticQualification(environment)],
  ["neon_production_identity", (environment, context) => { context.neon = verifyNeonProductionBranch(environment); }],
  ["vela_generator_identity", (environment, context) => { context.vela = verifyVelaBinary(environment, context.velaBin); }],
  ["repository_acquisition", (environment, context) => { context.repositoriesRoot = acquireRepositories(environment, context.work); }],
  ["adapter_prepare", (environment, context) => { context.adapter = prepareAdapters(environment, context.work, context.siteCommit); }],
  ["adapter_retain", (environment, context) => retainAdapters(environment, context)],
  ["rollback_floor", async (_environment, context) => {
    await captureRollbackFloor(context);
    writeRollbackCheckpoint(context, "qualified_prior_release");
  }],
  ["projection_schema_initialize", (environment) => initializeProjectionSchema(environment)],
  ["projection_activate", (environment, context) => projectionQualification(environment, context)],
  ["activity_qualification", (environment) => activityQualification(environment)],
  ["postactivation_product", (environment, context) => productQualification(environment, context, { projectionTests: true })],
  ["provider_loss_reconstruction", (environment, context) => reconstruct(environment, context)],
  ["site_publish", (environment, context) => {
    publishSiteCommit(environment, context);
    writeRollbackCheckpoint(context, "site_commit_published");
  }],
  ["production_deploy", (environment, context) => {
    deploy(environment, context);
    writeRollbackCheckpoint(context, "production_deployed");
  }],
  ["production_readiness", (environment, context) => readiness(environment, context)],
  ["projection_prune", (environment, context) => pruneProjection(environment, context)],
  ["qualification_retain", (environment, context) => retainQualification(environment, context)],
]);

export function releaseOrder() {
  return stageDefinitions.map(([id]) => id);
}

export async function refreshProblems(environment = process.env) {
  required(environment, "VELA_BIN");
  required(environment, "VELA_PROJECTION_WRITER_DATABASE_URL");
  required(environment, "VELA_PROJECTION_DATABASE_URL");
  required(environment, "VELA_ACTIVITY_MIGRATOR_DATABASE_URL");
  required(environment, "VELA_ACTIVITY_DATABASE_URL");
  const work = releaseWorkDirectory(environment);
  const context = {
    work: work.path,
    velaBin: resolve(environment.VELA_BIN),
  };
  let completed = false;
  let failed = false;
  let scoped;
  try {
    const operatorHome = required(environment, "HOME");
    const githubCli = nativeGitHubCli(environment);
    const githubToken = environment.GH_TOKEN ?? run(
      githubCli, ["auth", "token", "--hostname", "github.com"],
      { environment, quiet: true },
    );
    const releaseHome = join(work.path, "home");
    for (const directory of [
      releaseHome,
      join(releaseHome, ".config"),
      join(releaseHome, ".config", "gh"),
      join(releaseHome, ".cache"),
    ]) mkdirSync(directory, { recursive: true, mode: 0o700 });
    const vercelConfig = environment.VERCEL_GLOBAL_CONFIG
      ?? [
        join(operatorHome, "Library", "Application Support", "com.vercel.cli"),
        join(operatorHome, ".local", "share", "com.vercel.cli"),
      ].find((path) => existsSync(path));
    if (!environment.VERCEL_TOKEN && !vercelConfig) {
      throw new Error("direct release requires VERCEL_TOKEN or an authenticated Vercel CLI config");
    }
    scoped = {
      ...environment,
      VELA_RELEASE_HOME: releaseHome,
      GH_TOKEN: githubToken,
      GH_CONFIG_DIR: join(releaseHome, ".config", "gh"),
      VELA_GITHUB_CLI: githubCli,
      VELA_NEON_CONFIG_DIR: environment.VELA_NEON_CONFIG_DIR
        ?? join(operatorHome, ".config", "neonctl"),
      ...(vercelConfig ? { VERCEL_GLOBAL_CONFIG: vercelConfig } : {}),
    };
    for (const [, stage] of stageDefinitions) await stage(scoped, context);
    completed = true;
    return {
      ...context.qualification,
      neon: context.neon,
      vela: context.vela,
      ephemeral_work_removed: work.ephemeral,
    };
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      if (scoped) releaseReleaseLock(scoped, context);
    } catch {
      if (!failed) throw new Error(`failed to release ${releaseLockRef}`);
      process.stderr.write(`release cleanup warning: ${releaseLockRef} still requires exact removal\n`);
    }
    if (work.ephemeral && completed) rmSync(work.path, { recursive: true, force: true });
    else if (work.ephemeral) {
      process.stderr.write(`direct release failed; private evidence retained at ${work.path}\n`);
    }
  }
}

if (import.meta.main) console.log(JSON.stringify(await refreshProblems()));
