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
import { repositoryRegistry } from "../packages/observatory-data/src/registry.ts";

const root = resolve(import.meta.dirname, "..");
const CHILD_ENVIRONMENT = Object.freeze([
  "PATH", "LANG", "LC_ALL", "LC_CTYPE", "TERM", "TMPDIR", "SHELL", "USER", "LOGNAME",
  "BUN_INSTALL", "NO_COLOR", "FORCE_COLOR",
]);
const RELEASE_GIT_IDENTITY = Object.freeze({
  GIT_AUTHOR_NAME: "Vela Observatory release",
  GIT_AUTHOR_EMAIL: "release@vela.space",
  GIT_COMMITTER_NAME: "Vela Observatory release",
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

export function releaseCommitEnvironment(environment) {
  return { ...environmentFor(environment), ...RELEASE_GIT_IDENTITY };
}

export function githubGitEnvironment(environment, { commit = false } = {}) {
  return {
    ...githubEnvironment(environment),
    ...(commit ? RELEASE_GIT_IDENTITY : {}),
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_KEY_0: "credential.helper",
    GIT_CONFIG_VALUE_0: "",
    GIT_CONFIG_KEY_1: "credential.helper",
    GIT_CONFIG_VALUE_1: "!gh auth git-credential",
  };
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

const releaseLockRef = "refs/heads/ops/observatory-release-lock";

function remoteReleaseLock(environment) {
  const safe = githubGitEnvironment(environment);
  return run("git", ["ls-remote", "--refs", "origin", releaseLockRef], {
    environment: safe,
    quiet: true,
  }).split(/\s+/u)[0] ?? "";
}

function acquireReleaseLock(environment, context) {
  const safe = githubGitEnvironment(environment, { commit: true });
  if (remoteReleaseLock(environment)) throw new Error("another Observatory release holds the remote lock");
  const tree = git(["rev-parse", "HEAD^{tree}"], root, safe);
  const lock = run("git", [
    "commit-tree", tree,
    "-p", context.siteCommit,
    "-m", `Observatory release lock ${randomUUID()}`,
  ], { environment: safe, quiet: true });
  run("git", ["push", "origin", `${lock}:${releaseLockRef}`], {
    environment: safe,
    quiet: true,
  });
  if (remoteReleaseLock(environment) !== lock) {
    throw new Error("Observatory release lock readback drift");
  }
  context.releaseLock = lock;
}

function releaseReleaseLock(environment, context) {
  if (!context.releaseLock) return;
  if (remoteReleaseLock(environment) !== context.releaseLock) {
    throw new Error("Observatory release lock ownership changed");
  }
  run("git", [
    "push",
    `--force-with-lease=${releaseLockRef}:${context.releaseLock}`,
    "origin",
    `:${releaseLockRef}`,
  ], { environment: githubGitEnvironment(environment), quiet: true });
  if (remoteReleaseLock(environment)) throw new Error("Observatory release lock was not removed");
  context.releaseLock = null;
}

export function releaseWorkDirectory(environment) {
  if (!environment.VELA_RELEASE_WORKDIR) {
    const path = mkdtempSync(join(tmpdir(), "vela-observatory-release-"));
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
    resolve(root, "packages/observatory-data/config/vela-release.v1.json"),
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
    if (git(["branch", "--show-current"], directory, safe) !== "main") {
      throw new Error(`${entry.slug}: canonical branch is not main`);
    }
    run("git", ["fetch", "--quiet", "origin", "main"], { cwd: directory, environment: safe });
    if (git(["rev-parse", "HEAD"], directory, safe) !== git(["rev-parse", "origin/main"], directory, safe)) {
      throw new Error(`${entry.slug}: acquired checkout is not current origin/main`);
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

function prepareCarrier(environment, work, repositoriesRoot) {
  const safe = environmentFor(environment);
  const github = githubEnvironment(environment);
  const identityPath = join(work, "carrier-identity.json");
  const metadataPath = join(work, "carrier-release.json");
  const directory = join(work, "carrier");
  const dossier = join(work, "standingbench-math-dossier.json");
  const identityRaw = run("bun", [
    "packages/observatory-data/scripts/standingbench-math-carrier.ts",
    "identity",
  ], { environment: safe });
  writeFileSync(identityPath, `${identityRaw}\n`, { encoding: "utf8", mode: 0o600 });
  const identity = JSON.parse(identityRaw);
  const metadata = run("gh", [
    "release", "view", identity.release_tag,
    "--repo", "vela-science/vela-web",
    "--json", "tagName,targetCommitish,isDraft,isPrerelease,assets",
  ], { environment: github });
  writeFileSync(metadataPath, `${metadata}\n`, { encoding: "utf8", mode: 0o600 });
  run("bun", [
    "packages/observatory-data/scripts/standingbench-math-carrier.ts",
    "release-metadata", "--metadata", metadataPath,
  ], { environment: safe });
  run("mkdir", ["-p", directory], { environment: safe });
  for (const asset of [identity.bundle_asset_name, identity.descriptor_asset_name]) {
    run("gh", [
      "release", "download", identity.release_tag,
      "--repo", "vela-science/vela-web",
      "--pattern", asset,
      "--dir", directory,
    ], { environment: github });
  }
  run("bun", [
    "packages/observatory-data/scripts/standingbench-math-carrier.ts",
    "verify",
    "--base-repository", join(repositoriesRoot, "math"),
    "--bundle", join(directory, identity.bundle_asset_name),
    "--descriptor", join(directory, identity.descriptor_asset_name),
    "--dossier-output", dossier,
  ], { environment: safe });
  return { dossier, identity };
}

function releaseLookup(environment, tag) {
  const safe = githubEnvironment(environment);
  const result = spawnSync("gh", [
    "api", `repos/vela-science/vela-web/releases/tags/${tag}`, "--include",
  ], { env: safe, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status === 0) return "present";
  if (/^HTTP\/\S+ 404\b/mu.test(result.stdout)) return "missing";
  throw new Error(`could not determine retained release state for ${tag}`);
}

function retainExactFile(environment, { tag, path, target, title, notes }) {
  const safe = githubEnvironment(environment);
  if (releaseLookup(environment, tag) === "missing") {
    run("gh", [
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
  run("gh", [
    "release", "download", tag,
    "--repo", "vela-science/vela-web",
    "--pattern", basename(path),
    "--output", existing,
  ], { environment: safe });
  run("cmp", [path, existing], { environment: safe });
}

function prepareAdapters(environment, work, repositoriesRoot, siteCommit) {
  const safe = environmentFor(environment);
  const raw = run("bun", [
    "packages/observatory-data/scripts/source-adapters.mjs",
    "refresh",
    "--repositories-root", repositoriesRoot,
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
    notes: "Content-addressed source inputs for reconstructing the read-only Observatory projection.",
  });
  context.adapter.retention_tag = tag;
}

function activityQualification(environment) {
  const migrate = environmentFor(environment, ["VELA_ACTIVITY_MIGRATOR_DATABASE_URL"]);
  const read = environmentFor(environment, ["VELA_ACTIVITY_DATABASE_URL"]);
  const both = environmentFor(environment, [
    "VELA_ACTIVITY_MIGRATOR_DATABASE_URL",
    "VELA_ACTIVITY_DATABASE_URL",
  ]);
  run("bun", ["run", "activity:db:migrate"], { environment: migrate });
  run("bun", ["run", "activity:db:check"], { environment: read });
  run("bun", ["run", "activity:db:verify"], { environment: both });
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
  run("bun", ["run", "db:migrate"], {
    environment: environmentFor(environment, ["VELA_PROJECTION_WRITER_DATABASE_URL"]),
  });
  const writer = environmentFor(environment, ["VELA_PROJECTION_WRITER_DATABASE_URL"]);
  Object.assign(writer, {
    VELA_BIN: context.velaBin,
    VELA_REPOSITORIES_ROOT: context.repositoriesRoot,
    VELA_SOURCE_ADAPTER_ARTIFACT: context.adapter.artifact_path,
  });
  const raw = run("bun", [
    "packages/observatory-data/scripts/refresh-neon-projection.mjs",
    "--grounded-math-dossier", context.carrier.dossier,
  ], { environment: writer });
  context.refresh = JSON.parse(raw.split("\n").at(-1));
  // Activation has already committed at this boundary. Persist the exact
  // target before any later qualification can fail.
  writeRollbackCheckpoint(context, "projection_activated");
  const reader = environmentFor(environment, ["VELA_PROJECTION_DATABASE_URL"]);
  run("bun", ["run", "db:check"], { environment: reader });
  run("bun", ["run", "projection:verify"], { environment: reader });
  run("bun", ["run", "projection:snapshot"], { environment: reader });
}

async function captureRollbackFloor(context) {
  const response = await fetch("https://problems.science/.well-known/vela-site.json", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`rollback-floor manifest returned HTTP ${response.status}`);
  const manifest = await response.json();
  if (
    manifest.schema !== "vela.site-deployment.v4"
    || manifest.site?.product !== "observatory"
    || !/^[0-9a-f]{40}$/u.test(manifest.site?.commit ?? "")
    || !/^sha256:[0-9a-f]{64}$/u.test(manifest.projection?.release_root ?? "")
    || manifest.deployment?.provider !== "vercel"
    || manifest.deployment?.environment !== "production"
    || !/^dpl_[A-Za-z0-9]{1,120}$/u.test(manifest.deployment?.id ?? "")
  ) throw new Error("rollback-floor manifest is incomplete");
  context.rollbackFloor = {
    site_commit: manifest.site.commit,
    projection_release_root: manifest.projection.release_root,
    deployment_id: manifest.deployment.id,
  };
}

function writeRollbackCheckpoint(context, phase) {
  const targetRoot = context.refresh?.release_root ?? null;
  const targetDeployment = context.deployment?.deployment_id ?? null;
  const rollback = targetRoot ? [
    `bun packages/observatory-data/scripts/select-projection-release.mjs --expected-current ${targetRoot} --target ${context.rollbackFloor.projection_release_root}`,
    `vercel rollback ${context.rollbackFloor.deployment_id} --yes --scope constellate-dc388081`,
    `bun apps/observatory/scripts/check-deployed-manifest.mjs https://problems.science ${context.rollbackFloor.site_commit}`,
  ] : [];
  const forward = targetRoot && targetDeployment ? [
    `bun packages/observatory-data/scripts/select-projection-release.mjs --expected-current ${context.rollbackFloor.projection_release_root} --target ${targetRoot}`,
    `vercel rollback ${targetDeployment} --yes --scope constellate-dc388081`,
    `bun apps/observatory/scripts/check-deployed-manifest.mjs https://problems.science ${context.siteCommit}`,
  ] : [];
  const body = {
    schema: "vela.observatory-direct-release-recovery.v1",
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
    ordering: "select_projection_then_switch_provider_then_verify_combined_manifest",
  };
  const record = { ...body, record_root: qualificationRoot(body) };
  assertPublicQualification(record);
  const path = join(context.work, "rollback-checkpoint.json");
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  context.rollbackCheckpoint = record;
}

function stageSnapshot(environment, context) {
  const safe = environmentFor(environment);
  const commit = releaseCommitEnvironment(environment);
  const snapshot = "packages/observatory-data/config/editorial-summary.v4.json";
  const changed = git(["status", "--porcelain"], root, safe).split("\n").filter(Boolean);
  if (changed.some((line) => line.slice(3) !== snapshot)) {
    throw new Error("refresh modified files outside the editorial snapshot");
  }
  run("git", ["fetch", "--quiet", "origin", "main"], { environment: safe });
  if (git(["rev-parse", "origin/main"], root, safe) !== context.siteCommit) {
    throw new Error("origin/main advanced after qualification; refusing to adopt unqualified bytes");
  }
  context.publishedSiteCommit = context.siteCommit;
  if (changed.length === 1) {
    run("git", ["add", "--", snapshot], { environment: safe });
    run("git", ["commit", "-m", "Refresh editorial snapshot after direct projection release"], {
      environment: commit,
    });
  }
  context.siteCommit = git(["rev-parse", "HEAD"], root, safe);
  if (git(["status", "--porcelain"], root, safe)) throw new Error("post-refresh checkout is dirty");
}

function publishSiteCommit(environment, context) {
  const safe = githubGitEnvironment(environment);
  run("git", ["fetch", "--quiet", "origin", "main"], { environment: safe });
  if (git(["rev-parse", "origin/main"], root, safe) !== context.publishedSiteCommit) {
    throw new Error("origin/main advanced before publication; refusing unqualified overwrite");
  }
  if (context.siteCommit !== context.publishedSiteCommit) {
    run("git", ["push", "origin", "HEAD:main"], { environment: safe });
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
    ["bun", ["run", "--filter", "@vela/observatory", "check:runtime"]],
    ["bun", ["run", "test:budgets"]],
    ["bun", ["run", "test:manifests"]],
  ];
  if (projectionTests) commands.unshift(
    ["bun", ["run", "--filter", "@vela/observatory-data", "test"]],
  );
  else commands.unshift(["bun", ["run", "db:check"]]);
  for (const [command, args] of commands) run(command, args, { environment: reader });
}

function pruneProjection(environment, context) {
  const writer = environmentFor(environment, ["VELA_PROJECTION_WRITER_DATABASE_URL"]);
  const raw = run("bun", [
    "run", "--filter", "@vela/observatory-data", "releases:prune",
  ], { environment: writer });
  context.prune = JSON.parse(raw.split("\n").at(-1));
  run("bun", ["run", "projection:verify"], {
    environment: environmentFor(environment, ["VELA_PROJECTION_DATABASE_URL"]),
  });
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
    "--grounded-math-dossier", context.carrier.dossier,
    "--output", output,
  ], { environment: { ...reader, RUNNER_TEMP: runnerTemp } });
  context.reconstruction = JSON.parse(readFileSync(output, "utf8"));
}

function deploy(environment, context) {
  const safe = vercelEnvironment(environment);
  const raw = run("bun", ["scripts/deploy-vercel-observatory.mjs"], {
    environment: {
      ...safe,
      VELA_SITE_COMMIT: context.siteCommit,
      GITHUB_REPOSITORY: "vela-science/vela-web",
      GITHUB_REF: "refs/heads/main",
    },
  });
  context.deployment = JSON.parse(raw.split("\n").at(-1));
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
        manifest.site?.commit === context.siteCommit
        && manifest.projection?.release_root === context.refresh.release_root
        && manifest.deployment?.id === context.deployment.deployment_id
      ) break;
    }
    await Bun.sleep(5_000);
  }
  if (
    manifest?.site?.commit !== context.siteCommit
    || manifest?.projection?.release_root !== context.refresh.release_root
    || manifest?.deployment?.id !== context.deployment.deployment_id
  ) throw new Error("production manifest did not converge to the qualified commit and projection");

  const flagship = await fetch("https://problems.science/problems/erdos-problems/321", {
    redirect: "error",
    cache: "no-store",
  });
  const flagshipBody = flagship.ok ? await flagship.text() : "";
  for (const identity of [
    "vcl_a618b77ab0f6a4b5b186133e37af555a22c6acb71a4746bab0b144b8973668a6",
    "vcl_3d4fd59554ccaa2b792b08abae16a8d0fe329d4901ad798fe05c6c7769c9966b",
  ]) {
    if (!flagshipBody.includes(identity)) {
      throw new Error(`Erdős 321 flagship is missing exact Claim identity ${identity}`);
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
    "/problems/erdos-problems/887",
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
  for (const host of ["app.vela.space", "app.constellate.science"]) {
    const response = await fetch(`https://${host}/repositories`, { redirect: "manual" });
    if (![307, 308].includes(response.status)) throw new Error(`${host}: canonical redirect is absent`);
    if (new URL(response.headers.get("location"), `https://${host}`).hostname !== "problems.science") {
      throw new Error(`${host}: redirect target is not problems.science`);
    }
  }
  const reader = environmentFor(environment, ["VELA_PROJECTION_DATABASE_URL"]);
  run("bun", [
    "apps/observatory/scripts/check-deployed-manifest.mjs",
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
    schema: "vela.observatory-direct-release-qualification.v1",
    authority_effect: "none",
    site_commit: context.siteCommit,
    projection_release_root: context.refresh.release_root,
    repositories: context.refresh.repositories,
    adapter_set_root: context.adapter.set_root,
    adapter_retention_tag: context.adapter.retention_tag,
    carrier: context.carrier.identity,
    reconstruction: context.reconstruction,
    deployment: context.deployment,
    public_manifest: context.manifest,
    pruning: context.prune,
    rollback_floor: {
      ...context.rollbackFloor,
      rollback: context.rollbackCheckpoint.rollback,
      forward_recovery: context.rollbackCheckpoint.forward_recovery,
      ordering: context.rollbackCheckpoint.ordering,
      retention: "current_and_two_predecessors_pruned_only_after_public_readiness",
    },
    gates: [
      "static_check_lint_test_format",
      "activity_migrate_check_verify",
      "projection_migrate_activate_verify",
      "editorial_snapshot_commit",
      "projection_backed_build_runtime_budgets_manifests",
      "provider_loss_reconstruction",
      "production_manifest_routes_aliases_and_404",
      "erdos_321_correction_and_unmapped_887",
      "current_and_two_predecessor_pruning",
    ],
    nonclaims: [
      "This release does not create scientific authority or change Standing.",
      "Provider deployment and passing checks do not establish scientific acceptance or external adoption.",
      "GitHub Actions is not required to reproduce this operator transaction.",
    ],
  };
  const record = { ...body, record_root: qualificationRoot(body) };
  assertPublicQualification(record);
  const path = join(context.work, `vela-observatory-direct-release-${context.siteCommit}.json`);
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  retainExactFile(environment, {
    tag: `observatory-direct-release-${context.deployment.deployment_id}`,
    path,
    target: context.siteCommit,
    title: `Direct Observatory release ${context.siteCommit.slice(0, 12)}`,
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
  ["preactivation_product", (environment, context) => productQualification(environment, context, { projectionTests: false })],
  ["activity_qualification", (environment) => activityQualification(environment)],
  ["carrier_verify", (environment, context) => { context.carrier = prepareCarrier(environment, context.work, context.repositoriesRoot); }],
  ["adapter_prepare", (environment, context) => { context.adapter = prepareAdapters(environment, context.work, context.repositoriesRoot, context.siteCommit); }],
  ["adapter_retain", (environment, context) => retainAdapters(environment, context)],
  ["rollback_floor", async (_environment, context) => {
    await captureRollbackFloor(context);
    writeRollbackCheckpoint(context, "qualified_prior_release");
  }],
  ["projection_activate", (environment, context) => projectionQualification(environment, context)],
  ["snapshot_stage", (environment, context) => stageSnapshot(environment, context)],
  ["snapshot_static_requalification", (environment) => runStaticQualification(environment)],
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

export async function refreshObservatory(environment = process.env) {
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
    const githubToken = environment.GH_TOKEN ?? run(
      "gh", ["auth", "token", "--hostname", "github.com"],
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

if (import.meta.main) console.log(JSON.stringify(await refreshObservatory()));
