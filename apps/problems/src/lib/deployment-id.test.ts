import { describe, expect, test } from "vitest";
import { deploymentIdForEnvironment } from "./deployment-id";

describe("deployment identity", () => {
  test("preserves the exact platform deployment identity", () => {
    expect(deploymentIdForEnvironment({
      NEXT_DEPLOYMENT_ID: "dpl_3F3xdRVPLLkC86Uo1wHTYzejETaq",
      VERCEL_DEPLOYMENT_ID: "dpl_3F3xdRVPLLkC86Uo1wHTYzejETaq",
      VERCEL_GIT_COMMIT_SHA: "4494536c5cf66e7b529c12675d0d257f2eabe4fa",
    })).toBe("dpl_3F3xdRVPLLkC86Uo1wHTYzejETaq");
  });

  test("uses a bounded source revision outside Vercel", () => {
    expect(deploymentIdForEnvironment({
      GITHUB_SHA: "4494536c5cf66e7b529c12675d0d257f2eabe4fa",
    })).toBe("4494536c5cf66e7b529c12675d0d257f");
  });

  test("derives a bounded navigation identity from a long Vercel deployment ID", () => {
    expect(deploymentIdForEnvironment({
      VERCEL_DEPLOYMENT_ID: "dpl_8TFqgkR6A7V3cJSmtYVCGEWY8Uo4-long",
    })).toMatch(/^[a-f0-9]{32}$/u);
  });

  test("leaves ordinary local development unbound", () => {
    expect(deploymentIdForEnvironment({})).toBeUndefined();
  });

  test("normalizes malformed framework identifiers into a bounded navigation identity", () => {
    expect(deploymentIdForEnvironment({ NEXT_DEPLOYMENT_ID: "not valid" }))
      .toMatch(/^[a-f0-9]{32}$/u);
  });

  test("ignores the empty framework default used by local Next builds", () => {
    expect(deploymentIdForEnvironment({ NEXT_DEPLOYMENT_ID: "" })).toBeUndefined();
  });

  test("fails if framework and platform deployment identities drift", () => {
    expect(() => deploymentIdForEnvironment({
      NEXT_DEPLOYMENT_ID: "dpl_framework",
      VERCEL_DEPLOYMENT_ID: "dpl_platform",
    })).toThrow("Next.js and Vercel deployment IDs disagree");
  });
});
