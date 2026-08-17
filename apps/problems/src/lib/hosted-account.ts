import "server-only";

import { ensureCurrentAccount, listGitHubConnections, listWorkspaces } from "@vela/activity-data";
import { currentAccount } from "./auth";

export async function currentActivityAccount() {
  const hosted = await currentAccount();
  if (!hosted) return null;
  const activity = await ensureCurrentAccount({ workosUserId: hosted.id, displayName: hosted.displayName, email: hosted.email });
  return { hosted, activity };
}

export async function accountWorkspaces(accountId: string) {
  return listWorkspaces(accountId);
}

export async function accountGitHubConnections(accountId: string) {
  return listGitHubConnections(accountId);
}
