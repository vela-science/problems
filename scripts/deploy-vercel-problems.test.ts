import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  deployVercelProblems,
  deployVercelProblemsViaCli,
  problemsDeploymentTargetFrom,
  vercelProblemsDeploymentRequest,
  verifyVercelProblemsDeployment,
} from "./deploy-vercel-problems.mjs";

const commit = "0123456789abcdef0123456789abcdef01234567";

/* The deployment target is environment configuration now, so the suite supplies
   its own rather than asserting against whichever project the operator's shell
   happens to name. */
const target = {
  VERCEL_TEAM_ID: "team_fixture",
  VERCEL_PROJECT_ID: "prj_fixture",
  VERCEL_PROJECT_NAME: "problems-fixture",
  VERCEL_GIT_REPO_ID: "1234567",
  VELA_DEPLOY_REPOSITORY: "vela-science/problems",
};

function response(overrides: Record<string, unknown> = {}) {
  return {
    id: "dpl_exact",
    url: "problems-exact.vercel.app",
    target: "production",
    gitSource: { sha: commit },
    meta: { githubCommitSha: commit },
    ...overrides,
  };
}

describe("exact Problems Vercel deployment", () => {
  test("exposes the exact Git deployment as the one root operator command", () => {
    const workspace = JSON.parse(readFileSync(resolve(import.meta.dir, "../package.json"), "utf8"));
    expect(workspace.scripts["deploy:problems"]).toBe(
      "VELA_SITE_COMMIT=$(git rev-parse HEAD) bun scripts/deploy-vercel-problems.mjs",
    );
  });

  test("builds one production request for the exact GitHub commit", () => {
    const request = vercelProblemsDeploymentRequest(commit, target);
    const url = new URL(request.url);

    expect(url.origin + url.pathname).toBe("https://api.vercel.com/v13/deployments");
    expect(url.searchParams.get("teamId")).toBe("team_fixture");
    expect(url.searchParams.get("forceNew")).toBe("1");
    expect(request.body).toEqual({
      name: "problems-fixture",
      project: "prj_fixture",
      target: "production",
      gitSource: {
        type: "github",
        repoId: 1234567,
        ref: "main",
        sha: commit,
      },
    });
  });

  test("refuses to deploy without an explicit target", () => {
    expect(() => problemsDeploymentTargetFrom({})).toThrow(
      "missing required deployment target VERCEL_GIT_REPO_ID",
    );
    expect(() => problemsDeploymentTargetFrom({ ...target, VERCEL_GIT_REPO_ID: "main" })).toThrow(
      "VERCEL_GIT_REPO_ID must be a positive integer",
    );
  });

  test("refuses anything except an exact lowercase commit", () => {
    expect(() => vercelProblemsDeploymentRequest("main", target)).toThrow(
      "exact lowercase 40-character Git SHA",
    );
    expect(() => vercelProblemsDeploymentRequest(commit.toUpperCase(), target)).toThrow(
      "exact lowercase 40-character Git SHA",
    );
  });

  test("requires both Vercel commit identities and production target to agree", () => {
    expect(verifyVercelProblemsDeployment(response(), commit)).toEqual({
      deploymentId: "dpl_exact",
      deploymentUrl: "problems-exact.vercel.app",
      commit,
    });
    expect(() => verifyVercelProblemsDeployment(
      response({ gitSource: { sha: "f".repeat(40) } }),
      commit,
    )).toThrow("gitSource SHA");
    expect(() => verifyVercelProblemsDeployment(
      response({ meta: { githubCommitSha: "f".repeat(40) } }),
      commit,
    )).toThrow("metadata SHA");
    expect(() => verifyVercelProblemsDeployment(
      response({ target: "preview" }),
      commit,
    )).toThrow("not a production deployment");
  });

  test("keeps the token in the request header and emits only safe identities", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    let output = "";
    const deployed = await deployVercelProblems({
      environment: {
        ...target,
        VERCEL_TOKEN: "secret-token-that-must-not-be-output",
        VELA_SITE_COMMIT: commit,
        GITHUB_REPOSITORY: "vela-science/problems",
        GITHUB_REF: "refs/heads/main",
        GITHUB_OUTPUT: "/unused/github-output",
      },
      fetchImplementation: async (url, init) => {
        requestUrl = String(url);
        requestInit = init;
        return new Response(JSON.stringify(response()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      timeoutSignal: undefined,
      appendOutput: (_path, value) => {
        output += String(value);
      },
    });

    expect(requestUrl).toContain("/v13/deployments?");
    expect(requestInit?.method).toBe("POST");
    expect(requestInit?.headers).toEqual({
      Authorization: "Bearer secret-token-that-must-not-be-output",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(requestInit?.body))).toEqual(
      vercelProblemsDeploymentRequest(commit, target).body,
    );
    expect(output).toBe(
      "deployment_id=dpl_exact\n"
        + "deployment_url=https://problems-exact.vercel.app\n"
        + `deployment_commit=${commit}\n`,
    );
    expect(output).not.toContain("secret-token");
    expect(deployed.commit).toBe(commit);
  });

  test("refuses production deployment from any non-main GitHub ref", async () => {
    await expect(deployVercelProblems({
      environment: {
        ...target,
        VERCEL_TOKEN: "secret-token",
        VELA_SITE_COMMIT: commit,
        GITHUB_REPOSITORY: "vela-science/problems",
        GITHUB_REF: "refs/heads/feature",
      },
      fetchImplementation: async () => {
        throw new Error("the Vercel API must not be called");
      },
      timeoutSignal: undefined,
    })).rejects.toThrow("restricted to refs/heads/main");
  });

  test("reports a bounded API failure without reflecting response text", async () => {
    await expect(deployVercelProblems({
      environment: {
        ...target,
        VERCEL_TOKEN: "secret-token",
        VELA_SITE_COMMIT: commit,
      },
      fetchImplementation: async () => new Response(JSON.stringify({
        error: {
          code: "forbidden",
          message: "secret-token should never appear in an exception",
        },
      }), { status: 403 }),
      timeoutSignal: undefined,
    })).rejects.toThrow("HTTP 403 (forbidden)");
  });

  test("uses the authenticated Vercel CLI without reading or persisting a token", () => {
    let invocation: any;
    const deployed = deployVercelProblemsViaCli({
      environment: {
        ...target,
        VELA_SITE_COMMIT: commit,
        GITHUB_REPOSITORY: "vela-science/problems",
        GITHUB_REF: "refs/heads/main",
        PATH: process.env.PATH,
        VERCEL_GLOBAL_CONFIG: "/operator/vercel-config",
      },
      execute: (command, args, options) => {
        invocation = { command, args, options };
        return JSON.stringify(response());
      },
    });
    expect(deployed.commit).toBe(commit);
    expect(invocation.command).toBe("vercel");
    expect(invocation.args).toContain(
      "/v13/deployments?teamId=team_fixture&forceNew=1",
    );
    expect(invocation.args).toContain("--raw");
    expect(invocation.args).toContain("constellate-dc388081");
    expect(invocation.args).toContain("/operator/vercel-config");
    expect(invocation.options.env).not.toHaveProperty("VERCEL_TOKEN");
  });
});
