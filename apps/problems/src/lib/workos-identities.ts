import "server-only";

import { WorkOS } from "@workos-inc/node";

type GitHubIdentity = { provider: "GitHubOAuth"; idpId: string };

export async function githubIdentityForUser(userId: string): Promise<GitHubIdentity | null> {
  const apiKey = process.env.WORKOS_API_KEY;
  if (!apiKey) return null;
  const identities = await new WorkOS(apiKey).userManagement.getUserIdentities(userId);
  const github = identities.find((identity) => identity.provider === "GitHubOAuth");
  return github ? { provider: "GitHubOAuth", idpId: github.idpId } : null;
}
