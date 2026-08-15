import { setTimeout as pause } from "node:timers/promises";
import { NextRequest, NextResponse } from "next/server";
import { claimGitHubInstallation, syncGitHubRepositories } from "@vela/activity-data";
import { currentActivityAccount } from "@/lib/hosted-account";
import { githubIdentityForUser } from "@/lib/workos-identities";
import { githubApp } from "@/lib/github-app";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const installationId = Number(request.nextUrl.searchParams.get("installation_id"));
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    return NextResponse.redirect(new URL("/account/connections?github_install=invalid", request.url));
  }
  const account = await currentActivityAccount();
  if (!account) return NextResponse.redirect(new URL("/sign-in?returnTo=/account/connections", request.url));
  const identity = await githubIdentityForUser(account.hosted.id);
  if (!identity) return NextResponse.redirect(new URL("/account/connections?github_identity=required", request.url));
  const app = githubApp();
  const installation = await app.octokit.request("GET /app/installations/{installation_id}", { installation_id: installationId });
  if (installation.data.id !== installationId || installation.data.suspended_at !== null || installation.data.permissions.contents !== "read") {
    return NextResponse.redirect(new URL("/account/connections?github_install=invalid", request.url));
  }
  let claimed = false;
  for (let attempt = 0; attempt < 8 && !claimed; attempt += 1) {
    try {
      await claimGitHubInstallation({ accountId: account.activity.id, workosIdentityId: identity.idpId, githubUserId: Number(identity.idpId), installationId });
      claimed = true;
    } catch (error) {
      if (attempt === 7) throw error;
      await pause(350);
    }
  }
  const octokit = await app.getInstallationOctokit(installationId);
  const repositories = await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, { per_page: 100 });
  await syncGitHubRepositories(account.activity.id, installationId, repositories.map((repository) => ({
    id: repository.id, node_id: repository.node_id, full_name: repository.full_name,
    visibility: repository.visibility, default_branch: repository.default_branch,
  })));
  return NextResponse.redirect(new URL("/account/connections?github_install=connected", request.url));
}
