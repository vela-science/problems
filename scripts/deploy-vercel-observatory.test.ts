import { describe, expect, test } from "bun:test";
import {
  deployVercelObservatory,
  observatoryDeploymentTarget,
  vercelObservatoryDeploymentRequest,
  verifyVercelObservatoryDeployment,
} from "./deploy-vercel-observatory.mjs";

const commit = "0123456789abcdef0123456789abcdef01234567";

function response(overrides: Record<string, unknown> = {}) {
  return {
    id: "dpl_exact",
    url: "vela-web-observatory-exact.vercel.app",
    target: "production",
    gitSource: { sha: commit },
    meta: { githubCommitSha: commit },
    ...overrides,
  };
}

describe("exact Observatory Vercel deployment", () => {
  test("builds one production request for the exact GitHub commit", () => {
    const request = vercelObservatoryDeploymentRequest(commit);
    const url = new URL(request.url);

    expect(url.origin + url.pathname).toBe("https://api.vercel.com/v13/deployments");
    expect(url.searchParams.get("teamId")).toBe(observatoryDeploymentTarget.teamId);
    expect(url.searchParams.get("forceNew")).toBe("1");
    expect(request.body).toEqual({
      name: "vela-web-observatory",
      project: "prj_Be9WMWjLhmfwZg7sAxJUAnCkZ9m7",
      target: "production",
      gitSource: {
        type: "github",
        repoId: 1128958598,
        ref: "main",
        sha: commit,
      },
    });
  });

  test("refuses anything except an exact lowercase commit", () => {
    expect(() => vercelObservatoryDeploymentRequest("main")).toThrow(
      "exact lowercase 40-character Git SHA",
    );
    expect(() => vercelObservatoryDeploymentRequest(commit.toUpperCase())).toThrow(
      "exact lowercase 40-character Git SHA",
    );
  });

  test("requires both Vercel commit identities and production target to agree", () => {
    expect(verifyVercelObservatoryDeployment(response(), commit)).toEqual({
      deploymentId: "dpl_exact",
      deploymentUrl: "vela-web-observatory-exact.vercel.app",
      commit,
    });
    expect(() => verifyVercelObservatoryDeployment(
      response({ gitSource: { sha: "f".repeat(40) } }),
      commit,
    )).toThrow("gitSource SHA");
    expect(() => verifyVercelObservatoryDeployment(
      response({ meta: { githubCommitSha: "f".repeat(40) } }),
      commit,
    )).toThrow("metadata SHA");
    expect(() => verifyVercelObservatoryDeployment(
      response({ target: "preview" }),
      commit,
    )).toThrow("not a production deployment");
  });

  test("keeps the token in the request header and emits only safe identities", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    let output = "";
    const deployed = await deployVercelObservatory({
      environment: {
        VERCEL_TOKEN: "secret-token-that-must-not-be-output",
        VELA_SITE_COMMIT: commit,
        GITHUB_REPOSITORY: "vela-science/vela-web",
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
      vercelObservatoryDeploymentRequest(commit).body,
    );
    expect(output).toBe(
      "deployment_id=dpl_exact\n"
        + "deployment_url=https://vela-web-observatory-exact.vercel.app\n"
        + `deployment_commit=${commit}\n`,
    );
    expect(output).not.toContain("secret-token");
    expect(deployed.commit).toBe(commit);
  });

  test("refuses production deployment from any non-main GitHub ref", async () => {
    await expect(deployVercelObservatory({
      environment: {
        VERCEL_TOKEN: "secret-token",
        VELA_SITE_COMMIT: commit,
        GITHUB_REPOSITORY: "vela-science/vela-web",
        GITHUB_REF: "refs/heads/feature",
      },
      fetchImplementation: async () => {
        throw new Error("the Vercel API must not be called");
      },
      timeoutSignal: undefined,
    })).rejects.toThrow("restricted to refs/heads/main");
  });

  test("reports a bounded API failure without reflecting response text", async () => {
    await expect(deployVercelObservatory({
      environment: {
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
});
