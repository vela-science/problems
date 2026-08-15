import { NextRequest, NextResponse } from "next/server";
import { currentActivityAccount } from "@/lib/hosted-account";
import { githubIdentityForUser } from "@/lib/workos-identities";
import { createGitHubInstallState } from "@/lib/github-install-state";
import { githubInstallUrl } from "@/lib/github-app";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const account = await currentActivityAccount();
  if (!account) return NextResponse.redirect(new URL("/sign-in?returnTo=/account/connections", request.url));
  const identity = await githubIdentityForUser(account.hosted.id);
  if (!identity) return NextResponse.redirect(new URL("/account/connections?github_identity=required", request.url));
  const state = createGitHubInstallState(account.activity.id, identity.idpId);
  const response = NextResponse.redirect(githubInstallUrl(state));
  response.cookies.set("problems_github_install", state, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/github/installation-callback", maxAge: 600,
  });
  return response;
}
