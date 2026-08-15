import { activitySql } from "./client";
import { activityDatabaseError } from "./errors";

type Json = Record<string, unknown>;

export type GitHubIdentity = { provider: "GitHubOAuth"; idpId: string };
export type GitHubInstallation = {
  installationId: number;
  accountLogin: string;
  accountType: "User" | "Organization";
  suspended: boolean;
};
export type GitHubRepository = {
  installationId: number;
  repositoryId: number;
  nodeId: string;
  fullName: string;
  visibility: "public" | "private" | "internal";
  defaultBranch: string;
};
export type ConnectedCodebaseSummary = {
  id: string;
  fullName: string;
  visibility: "public" | "private" | "internal";
  sourceCommit: string;
  inspectionStatus: "connected" | "structurally_inspected" | "natively_verified" | "unsupported";
  accessibility: "accessible" | "revoked";
  syncState: "pinned" | "branch_moved" | "unavailable";
  receiptRoot: string;
};
export type GitHubConnections = {
  installations: GitHubInstallation[];
  repositories: GitHubRepository[];
  codebases: ConnectedCodebaseSummary[];
};

function object(value: unknown, label: string): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Json;
}
function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) throw new Error(`${label} must be a non-empty string`);
  return value;
}
function integer(value: unknown, label: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error(`${label} must be a positive integer`);
  return result;
}
function oneOf<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (!values.includes(value as T)) throw new Error(`${label} is invalid`);
  return value as T;
}

export function parseGitHubConnections(value: unknown): GitHubConnections {
  const result = object(value, "GitHub connections");
  if (!Array.isArray(result.installations) || !Array.isArray(result.repositories) || !Array.isArray(result.codebases)) {
    throw new Error("GitHub connections arrays are missing");
  }
  return {
    installations: result.installations.map((value) => {
      const row = object(value, "GitHub installation");
      return {
        installationId: integer(row.installation_id, "installation id"),
        accountLogin: string(row.github_account_login, "GitHub account login"),
        accountType: oneOf(row.github_account_type, ["User", "Organization"] as const, "GitHub account type"),
        suspended: row.suspended_at !== null,
      };
    }),
    repositories: result.repositories.map((value) => {
      const row = object(value, "GitHub repository");
      return {
        installationId: integer(row.installation_id, "installation id"),
        repositoryId: integer(row.repository_id, "repository id"),
        nodeId: string(row.repository_node_id, "repository node id"),
        fullName: string(row.full_name, "repository full name"),
        visibility: oneOf(row.visibility, ["public", "private", "internal"] as const, "repository visibility"),
        defaultBranch: string(row.default_branch, "default branch"),
      };
    }),
    codebases: result.codebases.map(parseConnectedCodebaseSummary),
  };
}

function parseConnectedCodebaseSummary(value: unknown): ConnectedCodebaseSummary {
  const row = object(value, "connected codebase");
  return {
    id: string(row.id, "codebase id"),
    fullName: string(row.full_name, "codebase full name"),
    visibility: oneOf(row.visibility, ["public", "private", "internal"] as const, "codebase visibility"),
    sourceCommit: string(row.source_commit, "source commit"),
    inspectionStatus: oneOf(row.inspection_status, ["connected", "structurally_inspected", "natively_verified", "unsupported"] as const, "inspection status"),
    accessibility: oneOf(row.accessibility, ["accessible", "revoked"] as const, "accessibility"),
    syncState: oneOf(row.sync_state, ["pinned", "branch_moved", "unavailable"] as const, "sync state"),
    receiptRoot: string(row.receipt_root, "receipt root"),
  };
}

async function call(query: string, parameters: unknown[]): Promise<unknown> {
  try {
    const rows = await activitySql().query(query, parameters);
    return rows[0]?.result;
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function listGitHubConnections(accountId: string): Promise<GitHubConnections> {
  return parseGitHubConnections(await call(
    "SELECT activity_api.list_github_connections($1::uuid) AS result", [accountId],
  ));
}

export async function claimGitHubInstallation(input: {
  accountId: string; workosIdentityId: string; githubUserId: number; installationId: number;
}): Promise<void> {
  await call("SELECT activity_api.claim_github_installation($1::uuid,$2,$3::bigint,$4::bigint) AS result",
    [input.accountId, input.workosIdentityId, input.githubUserId, input.installationId]);
}

export async function syncGitHubRepositories(accountId: string, installationId: number, repositories: Json[]): Promise<void> {
  await call("SELECT activity_api.sync_github_repositories($1::uuid,$2::bigint,$3::jsonb) AS result",
    [accountId, installationId, JSON.stringify(repositories)]);
}

export async function recordGitHubWebhook(input: {
  deliveryId: string; eventName: string; payloadRoot: string; payload: Json;
}): Promise<{ duplicate: boolean; authority_effect: "none" }> {
  return object(await call("SELECT activity_api.record_github_webhook($1,$2,$3,$4::jsonb) AS result",
    [input.deliveryId, input.eventName, input.payloadRoot, JSON.stringify(input.payload)]), "GitHub webhook result") as { duplicate: boolean; authority_effect: "none" };
}

export async function saveConnectedCodebase(accountId: string, payload: Json): Promise<ConnectedCodebaseSummary> {
  return parseConnectedCodebaseSummary(await call(
    "SELECT activity_api.save_connected_codebase($1::uuid,$2::jsonb) AS result",
    [accountId, JSON.stringify(payload)],
  ));
}

export async function getConnectedCodebase(accountId: string, id: string): Promise<Json | null> {
  const result = await call("SELECT activity_api.get_connected_codebase($1::uuid,$2::uuid) AS result",
    [accountId, id]);
  return result === null || result === undefined ? null : object(result, "connected codebase");
}
