import { createHash } from "node:crypto";

const deploymentIdPattern = /^[A-Za-z0-9_-]{1,32}$/u;

type DeploymentEnvironment = Record<string, string | undefined>;

function boundedNavigationId(value: string): string {
  if (deploymentIdPattern.test(value)) return value;
  if (value.length === 0) return "";
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/**
 * Produce the unique build identifier used by Next.js and Vercel to keep
 * client navigation on one immutable deployment.
 */
export function deploymentIdForEnvironment(environment: DeploymentEnvironment): string | undefined {
  const nextId = environment.NEXT_DEPLOYMENT_ID;
  const vercelId = environment.VERCEL_DEPLOYMENT_ID;
  const revision = environment.VERCEL_GIT_COMMIT_SHA ?? environment.GITHUB_SHA;
  const nextNavigationId = nextId ? boundedNavigationId(nextId) : undefined;
  const vercelNavigationId = vercelId ? boundedNavigationId(vercelId) : undefined;
  if (nextNavigationId !== undefined && vercelNavigationId !== undefined && nextNavigationId !== vercelNavigationId) {
    throw new Error("Next.js and Vercel deployment IDs disagree");
  }
  const revisionNavigationId = revision
    ? (/^[a-f0-9]{40}$/u.test(revision) ? revision.slice(0, 32) : boundedNavigationId(revision))
    : undefined;
  const candidate = nextNavigationId ?? vercelNavigationId ?? revisionNavigationId;

  if (candidate === undefined) return undefined;
  if (!deploymentIdPattern.test(candidate)) throw new Error("deployment ID normalization failed");
  return candidate;
}
