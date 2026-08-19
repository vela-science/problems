import "server-only";

import {
  accountPublicProfile,
  ensureCurrentAccount,
  listGitHubConnections,
  listWorkspaces,
  publicProfileByHandle,
  publicProfileForPerformer,
  savePublicProfile,
  type PublicProfile,
  type SavePublicProfileInput,
} from "@vela/activity-data";
import { currentAccount } from "./auth";

export type { PublicProfile };

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

export async function accountProfile(accountId: string) {
  return accountPublicProfile(accountId);
}

export async function profileByHandle(handle: string, viewerAccountId?: string | null) {
  return publicProfileByHandle(handle, viewerAccountId);
}

export async function profileForPerformer(performerId: string) {
  return publicProfileForPerformer(performerId);
}

export async function updateAccountProfile(
  accountId: string,
  input: SavePublicProfileInput,
  expectedVersion?: number | null,
) {
  return savePublicProfile(accountId, input, expectedVersion);
}
