import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* The deployment target is configuration, not source.
 *
 * These five values used to be literals naming one Vercel team, one project,
 * and one GitHub repository. That was correct while the application lived in a
 * private monorepo with exactly one deployment, and wrong the moment the source
 * became public: a fork running `deploy:problems` would aim its build at
 * someone else's project, and the ids themselves are the first thing a targeted
 * attempt against that project would need.
 *
 * They are read from the environment now, with no fallback, so an unset
 * variable fails loudly instead of deploying somewhere unintended. */
function targetString(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`missing required deployment target ${name}`);
  }
  return value;
}

export function problemsDeploymentTargetFrom(environment = process.env) {
  const read = (name) => targetString(environment, name);
  const repositoryId = Number(read("VERCEL_GIT_REPO_ID"));
  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
    throw new Error("VERCEL_GIT_REPO_ID must be a positive integer");
  }
  return Object.freeze({
    teamId: read("VERCEL_TEAM_ID"),
    projectId: read("VERCEL_PROJECT_ID"),
    projectName: read("VERCEL_PROJECT_NAME"),
    repositoryId,
    repositoryRef: environment.VERCEL_GIT_REPO_REF || "main",
    repositorySlug: read("VELA_DEPLOY_REPOSITORY"),
  });
}

const exactCommitPattern = /^[0-9a-f]{40}$/u;

function exactCommit(value) {
  if (!exactCommitPattern.test(value ?? "")) {
    throw new Error("VELA_SITE_COMMIT must be an exact lowercase 40-character Git SHA");
  }
  return value;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Vercel deployment response has no ${label}`);
  }
  return value;
}

function deploymentId(value) {
  const id = requiredString(value, "deployment id");
  if (!/^dpl_[A-Za-z0-9]{1,120}$/u.test(id)) {
    throw new Error("Vercel deployment response has an invalid deployment id");
  }
  return id;
}

function deploymentHost(value) {
  const host = requiredString(value, "deployment URL");
  if (
    !/^[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63})*\.vercel\.app$/u.test(host)
    || host.length > 253
  ) {
    throw new Error("Vercel deployment response has an invalid deployment URL");
  }
  return host;
}

export function vercelProblemsDeploymentRequest(commit, environment = process.env) {
  const sha = exactCommit(commit);
  const target = problemsDeploymentTargetFrom(environment);
  const url = new URL("https://api.vercel.com/v13/deployments");
  url.searchParams.set("teamId", target.teamId);
  url.searchParams.set("forceNew", "1");

  return {
    url: url.toString(),
    body: {
      name: target.projectName,
      project: target.projectId,
      target: "production",
      gitSource: {
        type: "github",
        repoId: target.repositoryId,
        ref: target.repositoryRef,
        sha,
      },
    },
  };
}

export function verifyVercelProblemsDeployment(payload, expectedCommit) {
  const commit = exactCommit(expectedCommit);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Vercel deployment response must be an object");
  }
  if (payload.gitSource?.sha !== commit) {
    throw new Error("Vercel deployment response gitSource SHA does not match VELA_SITE_COMMIT");
  }
  if (payload.meta?.githubCommitSha !== commit) {
    throw new Error("Vercel deployment response metadata SHA does not match VELA_SITE_COMMIT");
  }
  if (payload.target !== "production") {
    throw new Error("Vercel deployment response is not a production deployment");
  }

  return {
    deploymentId: deploymentId(payload.id),
    deploymentUrl: deploymentHost(payload.url),
    commit,
  };
}

function responseErrorCode(payload) {
  const value = payload?.error?.code;
  return typeof value === "string" && /^[A-Za-z0-9_.-]{1,80}$/u.test(value)
    ? value
    : "unknown";
}

export async function deployVercelProblems({
  environment = process.env,
  fetchImplementation = fetch,
  timeoutSignal = AbortSignal.timeout(60_000),
  appendOutput = appendFileSync,
} = {}) {
  const token = environment.VERCEL_TOKEN;
  if (!token) throw new Error("missing required deployment secret VERCEL_TOKEN");
  if (!environment.VELA_SITE_COMMIT) {
    throw new Error("missing required deployment identity VELA_SITE_COMMIT");
  }
  const expectedRepository = targetString(environment, "VELA_DEPLOY_REPOSITORY");
  if (
    environment.GITHUB_REPOSITORY
    && environment.GITHUB_REPOSITORY !== expectedRepository
  ) {
    throw new Error(`exact Problems deployment is restricted to ${expectedRepository}`);
  }
  if (environment.GITHUB_REF && environment.GITHUB_REF !== "refs/heads/main") {
    throw new Error("exact Problems deployment is restricted to refs/heads/main");
  }

  const request = vercelProblemsDeploymentRequest(environment.VELA_SITE_COMMIT, environment);
  const response = await fetchImplementation(request.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request.body),
    signal: timeoutSignal,
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  if (!response.ok) {
    throw new Error(
      `Vercel deployment request failed with HTTP ${response.status} (${responseErrorCode(payload)})`,
    );
  }

  const deployment = verifyVercelProblemsDeployment(
    payload,
    environment.VELA_SITE_COMMIT,
  );
  if (environment.GITHUB_OUTPUT) {
    appendOutput(
      environment.GITHUB_OUTPUT,
      `deployment_id=${deployment.deploymentId}\n`
        + `deployment_url=https://${deployment.deploymentUrl}\n`
        + `deployment_commit=${deployment.commit}\n`,
      { encoding: "utf8" },
    );
  }
  return deployment;
}

export function deployVercelProblemsViaCli({
  environment = process.env,
  execute = execFileSync,
} = {}) {
  if (!environment.VELA_SITE_COMMIT) {
    throw new Error("missing required deployment identity VELA_SITE_COMMIT");
  }
  const globalConfig = requiredString(
    environment.VERCEL_GLOBAL_CONFIG,
    "authenticated CLI config directory",
  );
  const expectedRepository = targetString(environment, "VELA_DEPLOY_REPOSITORY");
  if (environment.GITHUB_REPOSITORY && environment.GITHUB_REPOSITORY !== expectedRepository) {
    throw new Error(`exact Problems deployment is restricted to ${expectedRepository}`);
  }
  if (environment.GITHUB_REF && environment.GITHUB_REF !== "refs/heads/main") {
    throw new Error("exact Problems deployment is restricted to refs/heads/main");
  }

  const request = vercelProblemsDeploymentRequest(environment.VELA_SITE_COMMIT, environment);
  const url = new URL(request.url);
  const directory = mkdtempSync(join(tmpdir(), "vela-vercel-request-"));
  const input = join(directory, "deployment.json");
  try {
    writeFileSync(input, `${JSON.stringify(request.body)}\n`, { encoding: "utf8", mode: 0o600 });
    const stdout = execute("vercel", [
      "api",
      `${url.pathname}${url.search}`,
      "--method",
      "POST",
      "--input",
      input,
      "--raw",
      "--scope",
      "constellate-dc388081",
      "--global-config",
      globalConfig,
    ], {
      encoding: "utf8",
      env: environment,
      maxBuffer: 8 * 1024 * 1024,
      stdio: ["ignore", "pipe", "inherit"],
    });
    return verifyVercelProblemsDeployment(JSON.parse(stdout), environment.VELA_SITE_COMMIT);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const deployment = process.env.VERCEL_TOKEN
    ? await deployVercelProblems()
    : deployVercelProblemsViaCli();
  console.log(JSON.stringify({
    schema: "vela.vercel-problems-deployment.v1",
    deployment_id: deployment.deploymentId,
    deployment_url: `https://${deployment.deploymentUrl}`,
    commit: deployment.commit,
  }));
}
