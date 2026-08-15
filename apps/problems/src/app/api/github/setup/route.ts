import { setTimeout as pause } from "node:timers/promises";
import { NextRequest, NextResponse } from "next/server";
import { claimGitHubInstallation, syncGitHubRepositories } from "@vela/activity-data";
import { currentActivityAccount } from "@/lib/hosted-account";
import { githubIdentityForUser } from "@/lib/workos-identities";
import { readGitHubInstallState } from "@/lib/github-install-state";
import { githubApp } from "@/lib/github-app";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const stateText = request.nextUrl.searchParams.get("state") ?? "";
  const installationId = Number(request.nextUrl.searchParams.get("installation_id"));
  if (!stateText || request.cookies.get("problems_github_install")?.value !== stateText || !Number.isSafeInteger(installationId) || installationId <= 0) {
    return NextResponse.redirect(new URL("/account/connections?github_install=invalid", request.url));
  }
  const state = readGitHubInstallState(stateText);
  const account = await currentActivityAccount();
  if (!account || account.activity.id !== state.accountId) return NextResponse.redirect(new URL("/sign-in", request.url));
  const identity = await githubIdentityForUser(account.hosted.id);
  if (!identity || identity.idpId !== state.workosIdentityId) return NextResponse.redirect(new URL("/account/connections?github_identity=required", request.url));
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
  const octokit = await githubApp().getInstallationOctokit(installationId);
  const repositories = await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, { per_page: 100 });
  await syncGitHubRepositories(account.activity.id, installationId, repositories.map((repository) => ({
    id: repository.id, node_id: repository.node_id, full_name: repository.full_name,
    visibility: repository.visibility, default_branch: repository.default_branch,
  })));
  const response = NextResponse.redirect(new URL("/account/connections?github_install=connected", request.url));
  response.cookies.delete("problems_github_install");
  return response;
}
