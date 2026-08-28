import { activitySql } from "./client";
import { canonicalJson, sha256 } from "@vela/projection-data/canonical";
import {
  commandRequestRoot,
  type AppendCrdtUpdateInput,
  type HashRoot,
  scientificAnchorRoot,
  type ActivityAccount,
  type AddDiscussionEntryInput,
  type AttachArtifactInput,
  type CommandOptions,
  type CreateApproachInput,
  type CreateAttemptInput,
  type CreateWorkspaceInput,
  type FollowProblemInput,
  type FollowedProblem,
  type ForkApproachInput,
  type HostedAccountInput,
  type ProblemActivity,
  type ProblemActivityQuery,
  type PublicProfile,
  type PublicProfileLinks,
  type PublicProfilePerformerLink,
  type SavePublicProfileInput,
  type ScientificAnchor,
  type UpdateAttemptInput,
  type Workspace,
  type WorkspaceContext,
  type WorkspaceProblemContext,
  normalizePublicProfileInput,
} from "./contracts";
import {
  assertSubmissionDraft,
  createSubmissionDraftExport,
  type SaveSubmissionDraftInput,
  type SubmissionDraftExport,
} from "./draft-submission";
import { activityDatabaseError } from "./errors";
import {
  pilotTelemetryRecord,
  type PilotTelemetryReceipt,
  type PilotTelemetryRecord,
} from "./pilot-telemetry";
import { parseCrdtUpdates, parseFollowedProblems, parseProblemActivity as parseProblemActivityResponse } from "./problem-activity";

type JsonRecord = Record<string, unknown>;

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new Error(`activity response has no ${field}`);
  return value;
}

function integer(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`activity response has invalid ${field}`);
  return parsed;
}

function hashRoot(value: unknown, field: string): `sha256:${string}` {
  const parsed = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(parsed)) throw new Error(`activity response has invalid ${field}`);
  return parsed as `sha256:${string}`;
}

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} response must be an object`);
  }
  return value as JsonRecord;
}

function accountFrom(value: unknown): ActivityAccount {
  const row = record(value, "account");
  return {
    id: text(row.id, "account id"),
    workosUserId: text(row.workos_user_id, "WorkOS user id"),
    displayName: text(row.display_name, "display name"),
    email: text(row.email, "email"),
    createdAt: text(row.created_at, "account created_at"),
  };
}

function workspaceProblemContextFrom(value: unknown): WorkspaceProblemContext {
  const row = record(value, "workspace Problem context");
  return {
    projectionReleaseRoot: hashRoot(row.projection_release_root, "workspace Problem context release root"),
    repositoryId: text(row.repository_id, "workspace Problem context repository id"),
    problemId: text(row.problem_id, "workspace Problem context Problem id"),
    anchorRoot: hashRoot(row.anchor_root, "workspace Problem context anchor root"),
    capturedAt: text(row.captured_at, "workspace Problem context captured_at"),
  };
}

function workspaceFrom(value: unknown, requireProblemContexts = false): Workspace {
  const row = record(value, "workspace");
  const role = row.role;
  if (role !== "owner" && role !== "member") throw new Error("activity response has invalid workspace role");
  if (requireProblemContexts && !Array.isArray(row.problem_contexts)) {
    throw new Error("activity response has no workspace Problem contexts");
  }
  return {
    id: text(row.id, "workspace id"),
    slug: text(row.slug, "workspace slug"),
    name: text(row.name, "workspace name"),
    role,
    problemContexts: Array.isArray(row.problem_contexts)
      ? row.problem_contexts.map(workspaceProblemContextFrom)
      : [],
    version: integer(row.version, "workspace version"),
    createdAt: text(row.created_at, "workspace created_at"),
    updatedAt: text(row.updated_at, "workspace updated_at"),
  };
}

function nullableText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return text(value, field);
}

function profileLinksFrom(value: unknown): PublicProfileLinks {
  const row = record(value ?? {}, "public profile links");
  const links: PublicProfileLinks = {};
  for (const kind of ["github", "orcid", "website", "lab"] as const) {
    if (row[kind] !== undefined) links[kind] = text(row[kind], `${kind} link`);
  }
  return links;
}

function profilePerformerFrom(value: unknown): PublicProfilePerformerLink {
  const row = record(value, "profile performer");
  const performerKind = row.performer_kind;
  const verificationKind = row.verification_kind;
  if (!["human", "agent", "organization"].includes(String(performerKind))) throw new Error("profile performer has invalid kind");
  if (!["signed_record", "connected_github", "connected_orcid", "source_owner"].includes(String(verificationKind))) throw new Error("profile performer has invalid verification kind");
  return {
    performerId: text(row.performer_id, "performer id"),
    performerKind: performerKind as PublicProfilePerformerLink["performerKind"],
    verificationKind: verificationKind as PublicProfilePerformerLink["verificationKind"],
    evidenceLocator: text(row.evidence_locator, "performer evidence locator"),
    createdAt: text(row.created_at, "performer link created_at"),
  };
}

function publicProfileFrom(value: unknown): PublicProfile {
  const row = record(value, "public profile");
  const visibility = row.visibility;
  if (!["private", "unlisted", "public"].includes(String(visibility))) throw new Error("public profile has invalid visibility");
  if (row.profile_kind !== "account" || row.status !== "active") throw new Error("account profile has invalid kind or status");
  const handles = Array.isArray(row.handles) ? row.handles.map((value) => {
    const handle = record(value, "profile handle");
    return {
      handle: text(handle.handle, "profile handle"),
      createdAt: text(handle.created_at, "profile handle created_at"),
      retiredAt: nullableText(handle.retired_at, "profile handle retired_at"),
    };
  }) : [];
  return {
    id: text(row.id, "public profile id"),
    handle: text(row.handle, "public profile handle"),
    profileKind: "account",
    status: "active",
    displayName: text(row.display_name, "public profile display name"),
    bio: typeof row.bio === "string" ? row.bio : "",
    affiliation: typeof row.affiliation === "string" ? row.affiliation : "",
    visibility: visibility as PublicProfile["visibility"],
    links: profileLinksFrom(row.links),
    version: integer(row.version, "public profile version"),
    createdAt: text(row.created_at, "public profile created_at"),
    updatedAt: text(row.updated_at, "public profile updated_at"),
    handles,
    performers: Array.isArray(row.performers) ? row.performers.map(profilePerformerFrom) : [],
    ...(typeof row.requested_handle === "string" ? { requestedHandle: row.requested_handle } : {}),
    ...(typeof row.redirect === "boolean" ? { redirect: row.redirect } : {}),
    ...(typeof row.owner_preview === "boolean" ? { ownerPreview: row.owner_preview } : {}),
  };
}

function dbAnchor(anchor: ScientificAnchor): JsonRecord {
  return {
    root: scientificAnchorRoot(anchor),
    projection_release_root: anchor.projectionReleaseRoot,
    repository_id: anchor.repositoryId,
    repository_root: anchor.repositoryRoot,
    source_commit: anchor.sourceCommit,
    source_tree: anchor.sourceTree,
    problem_id: anchor.problemId,
    problem_record_root: anchor.problemRecordRoot,
    source_observation_root: anchor.sourceObservationRoot,
    claim_id: anchor.claimId,
    claim_root: anchor.claimRoot,
    claim_standing: anchor.claimStanding,
  };
}

async function command(
  context: WorkspaceContext,
  kind: string,
  payload: JsonRecord,
  options: CommandOptions,
  expectedVersion?: number,
): Promise<JsonRecord> {
  try {
    const requestRoot = commandRequestRoot(kind, payload, expectedVersion);
    const rows = await activitySql().query(
      "SELECT activity_api.execute_command($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7::bigint) AS result",
      [
        context.accountId,
        context.workspaceId,
        kind,
        options.idempotencyKey,
        requestRoot,
        JSON.stringify(payload),
        expectedVersion ?? null,
      ],
    );
    return record(rows[0]?.result, `${kind} command`);
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function ensureCurrentAccount(input: HostedAccountInput): Promise<ActivityAccount> {
  try {
    const rows = await activitySql().query(
      "SELECT activity_api.ensure_account($1, $2, $3) AS result",
      [input.workosUserId, input.displayName, input.email],
    );
    return accountFrom(rows[0]?.result);
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function accountPublicProfile(accountId: string): Promise<PublicProfile | null> {
  try {
    const rows = await activitySql().query(
      "SELECT activity_api.get_account_profile($1::uuid) AS result",
      [accountId],
    );
    return rows[0]?.result ? publicProfileFrom(rows[0].result) : null;
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function publicProfileByHandle(handle: string, viewerAccountId?: string | null): Promise<PublicProfile | null> {
  try {
    const rows = await activitySql().query(
      "SELECT activity_api.get_public_profile($1::text, $2::uuid) AS result",
      [handle.trim().toLowerCase(), viewerAccountId ?? null],
    );
    return rows[0]?.result ? publicProfileFrom(rows[0].result) : null;
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function publicProfileForPerformer(performerId: string): Promise<PublicProfile | null> {
  try {
    const rows = await activitySql().query(
      "SELECT activity_api.get_profile_for_performer($1::text) AS result",
      [performerId],
    );
    return rows[0]?.result ? publicProfileFrom(rows[0].result) : null;
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function savePublicProfile(
  accountId: string,
  input: SavePublicProfileInput,
  expectedVersion?: number | null,
): Promise<PublicProfile> {
  try {
    const normalized = normalizePublicProfileInput(input);
    const rows = await activitySql().query(
      "SELECT activity_api.save_public_profile($1::uuid, $2::jsonb, $3::bigint) AS result",
      [accountId, JSON.stringify({
        handle: normalized.handle,
        display_name: normalized.displayName,
        bio: normalized.bio,
        affiliation: normalized.affiliation,
        visibility: normalized.visibility,
        links: normalized.links,
      }), expectedVersion ?? null],
    );
    return publicProfileFrom(rows[0]?.result);
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function createWorkspace(
  accountId: string,
  input: CreateWorkspaceInput,
  options: CommandOptions,
): Promise<Workspace> {
  try {
    const payload = { slug: input.slug, name: input.name };
    const rows = await activitySql().query(
      "SELECT activity_api.create_workspace($1::uuid, $2, $3, $4, $5) AS result",
      [accountId, input.slug, input.name, options.idempotencyKey, commandRequestRoot("workspace.create", payload)],
    );
    return workspaceFrom(rows[0]?.result);
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function listWorkspaces(accountId: string): Promise<Workspace[]> {
  try {
    const rows = await activitySql().query(
      "SELECT activity_api.list_workspaces($1::uuid) AS result",
      [accountId],
    );
    const result = rows[0]?.result;
    if (!Array.isArray(result)) throw new Error("workspace list response must be an array");
    return result.map((workspace) => workspaceFrom(workspace, true));
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

/* What this account watches, everywhere. The read is account-scoped in SQL and
   guarded by the same membership join as every other activity read; a follow in
   a workspace this account has been removed from stops being visible here. */
export async function listFollowedProblems(accountId: string): Promise<FollowedProblem[]> {
  try {
    const rows = await activitySql().query(
      "SELECT activity_api.list_followed_problems($1::uuid) AS result",
      [accountId],
    );
    return parseFollowedProblems(rows[0]?.result);
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function listProblemWorkspaces(
  accountId: string,
  repositoryId: string,
  problemId: string,
): Promise<Workspace[]> {
  try {
    const rows = await activitySql().query(
      "SELECT activity_api.list_problem_workspaces($1::uuid, $2, $3) AS result",
      [accountId, repositoryId, problemId],
    );
    const result = rows[0]?.result;
    if (!Array.isArray(result)) throw new Error("problem workspace list response must be an array");
    return result.map((workspace) => workspaceFrom(workspace, true));
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export function parseProblemActivity(value: unknown, currentAnchorRoot: HashRoot) {
  return parseProblemActivityResponse(value, currentAnchorRoot);
}

export async function getProblemActivity(query: ProblemActivityQuery): Promise<ProblemActivity> {
  try {
    const rows = await activitySql().query(
      `SELECT
        activity_api.get_problem_activity($1::uuid, $2::uuid, $3, $4) AS result,
        activity_api.list_workspace_crdt_updates($1::uuid, $2::uuid, $3, $4) AS crdt_updates`,
      [query.accountId, query.workspaceId, query.repositoryId, query.problemId],
    );
    return {
      ...parseProblemActivity(rows[0]?.result, query.currentAnchorRoot),
      crdtUpdates: parseCrdtUpdates(rows[0]?.crdt_updates),
    };
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function appendWorkspaceCrdtUpdate(
  context: WorkspaceContext,
  input: AppendCrdtUpdateInput,
  options: CommandOptions,
) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(input.updateBase64) || input.updateBase64.length % 4 !== 0) {
    throw new Error("CRDT update must be canonical base64");
  }
  const payload = {
    anchor: dbAnchor(input.anchor),
    document_name: input.documentName,
    update_root: input.updateRoot,
    update_base64: input.updateBase64,
  };
  try {
    const rows = await activitySql().query(
      `SELECT activity_api.append_workspace_crdt_update(
        $1::uuid, $2::uuid, $3, $4, $5::jsonb, $6, $7, $8
      ) AS result`,
      [
        context.accountId,
        context.workspaceId,
        options.idempotencyKey,
        commandRequestRoot("crdt_update.append", payload),
        JSON.stringify(payload.anchor),
        payload.document_name,
        payload.update_root,
        payload.update_base64,
      ],
    );
    return record(rows[0]?.result, "CRDT update command");
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export function followProblem(
  context: WorkspaceContext,
  input: FollowProblemInput,
  options: CommandOptions,
) {
  return command(context, "follow.set", { anchor: dbAnchor(input.anchor), following: input.following }, options);
}

export function createApproach(
  context: WorkspaceContext,
  input: CreateApproachInput,
  options: CommandOptions,
) {
  return command(context, "approach.create", {
    anchor: dbAnchor(input.anchor),
    title: input.title,
    summary: input.summary,
  }, options);
}

export function forkApproach(
  context: WorkspaceContext,
  input: ForkApproachInput,
  options: CommandOptions,
) {
  return command(context, "approach.fork", {
    source_approach_id: input.sourceApproachId,
    title: input.title ?? null,
    summary: input.summary ?? null,
  }, options, input.expectedVersion);
}

export function createAttempt(
  context: WorkspaceContext,
  input: CreateAttemptInput,
  options: CommandOptions,
) {
  return command(context, "attempt.create", {
    approach_id: input.approachId,
    title: input.title,
  }, options);
}

export function updateAttempt(
  context: WorkspaceContext,
  attemptId: string,
  expectedVersion: number,
  patch: UpdateAttemptInput,
  options: CommandOptions,
) {
  return command(context, "attempt.update", {
    attempt_id: attemptId,
    state: patch.state ?? null,
    title: patch.title ?? null,
  }, options, expectedVersion);
}

export function addDiscussionEntry(
  context: WorkspaceContext,
  input: AddDiscussionEntryInput,
  options: CommandOptions,
) {
  return command(context, "discussion.add", {
    anchor: dbAnchor(input.anchor),
    approach_id: input.approachId ?? null,
    attempt_id: input.attemptId ?? null,
    kind: input.kind,
    visibility: input.visibility,
    body: input.body,
  }, options);
}

export function attachArtifact(
  context: WorkspaceContext,
  input: AttachArtifactInput,
  options: CommandOptions,
) {
  return command(context, "artifact.attach", {
    anchor: dbAnchor(input.anchor),
    attempt_id: input.attemptId,
    content_root: input.contentRoot,
    kind: input.kind,
    path: input.path,
    media_type: input.mediaType ?? null,
    byte_size: input.byteSize ?? null,
    locator: input.locator ?? null,
    metadata_root: input.metadataRoot ?? null,
  }, options);
}

export function saveSubmissionDraft(
  context: WorkspaceContext,
  input: SaveSubmissionDraftInput,
  options: CommandOptions,
  expectedVersion?: number,
) {
  const payload = assertSubmissionDraft(input.payload);
  return command(context, "submission_draft.save", {
    anchor: dbAnchor(input.anchor),
    draft_id: input.draftId ?? null,
    payload,
    payload_root: sha256(canonicalJson(payload)),
  }, options, expectedVersion);
}

export async function recordPilotTelemetry(input: PilotTelemetryRecord): Promise<PilotTelemetryReceipt> {
  const parsed = pilotTelemetryRecord.parse(input);
  try {
    const rows = await activitySql().query(
      "SELECT activity_api.record_pilot_telemetry($1, $2, $3, $4::timestamptz, $5::bigint) AS result",
      [parsed.install_id, parsed.record_id, parsed.signal, parsed.occurred_at, parsed.stage_ms ?? null],
    );
    const result = record(rows[0]?.result, "pilot telemetry");
    if (typeof result.stored !== "boolean" || typeof result.duplicate !== "boolean"
      || result.authority_effect !== "none") {
      throw new Error("pilot telemetry response is invalid");
    }
    return { stored: result.stored, duplicate: result.duplicate, authorityEffect: "none" };
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function exportSubmissionDraft(
  context: WorkspaceContext,
  draftId: string,
): Promise<SubmissionDraftExport> {
  try {
    const rows = await activitySql().query(
      "SELECT activity_api.export_submission_draft($1::uuid, $2::uuid, $3::uuid) AS result",
      [context.accountId, context.workspaceId, draftId],
    );
    return createSubmissionDraftExport(rows[0]?.result);
  } catch (error) {
    throw activityDatabaseError(error);
  }
}
