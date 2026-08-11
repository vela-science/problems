import { activitySql } from "./client";
import { canonicalJson, sha256 } from "@vela/observatory-data/canonical";
import {
  commandRequestRoot,
  scientificAnchorRoot,
  type ActivityAccount,
  type AddDiscussionEntryInput,
  type AttachArtifactInput,
  type CommandOptions,
  type CreateApproachInput,
  type CreateAttemptInput,
  type CreateWorkRequestInput,
  type CreateWorkspaceInput,
  type FollowProblemInput,
  type ForkApproachInput,
  type HostedAccountInput,
  type ProblemActivity,
  type ProblemActivityQuery,
  type ScientificAnchor,
  type StoredScientificAnchor,
  type UpdateAttemptInput,
  type Workspace,
  type WorkspaceContext,
} from "./contracts";
import {
  assertSubmissionDraft,
  createSubmissionDraftExport,
  type SaveSubmissionDraftInput,
  type SubmissionDraftExport,
} from "./draft-submission";
import { activityDatabaseError } from "./errors";

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

function workspaceFrom(value: unknown): Workspace {
  const row = record(value, "workspace");
  const role = row.role;
  if (role !== "owner" && role !== "member") throw new Error("activity response has invalid workspace role");
  return {
    id: text(row.id, "workspace id"),
    slug: text(row.slug, "workspace slug"),
    name: text(row.name, "workspace name"),
    role,
    version: integer(row.version, "workspace version"),
    createdAt: text(row.created_at, "workspace created_at"),
    updatedAt: text(row.updated_at, "workspace updated_at"),
  };
}

function anchorFrom(value: unknown): StoredScientificAnchor {
  const row = record(value, "scientific anchor");
  return {
    root: text(row.anchor_root, "anchor root") as StoredScientificAnchor["root"],
    projectionReleaseRoot: text(
      row.projection_release_root,
      "anchor projection_release_root",
    ) as StoredScientificAnchor["projectionReleaseRoot"],
    repositoryId: text(row.repository_id, "anchor repository_id"),
    repositoryRoot: text(
      row.repository_root,
      "anchor repository_root",
    ) as StoredScientificAnchor["repositoryRoot"],
    sourceCommit: text(row.source_commit, "anchor source_commit"),
    sourceTree: text(row.source_tree, "anchor source_tree"),
    problemId: text(row.problem_id, "anchor problem_id"),
    problemRecordRoot: text(
      row.problem_record_root,
      "anchor problem_record_root",
    ) as StoredScientificAnchor["problemRecordRoot"],
    sourceObservationRoot: row.source_observation_root == null
      ? null
      : text(row.source_observation_root, "anchor source_observation_root") as StoredScientificAnchor["sourceObservationRoot"],
    claimId: row.claim_id == null ? null : text(row.claim_id, "anchor claim_id"),
    claimRoot: row.claim_root == null
      ? null
      : text(row.claim_root, "anchor claim_root") as StoredScientificAnchor["claimRoot"],
    claimStanding: row.claim_standing == null
      ? null
      : text(row.claim_standing, "anchor claim_standing"),
    capturedAt: text(row.captured_at, "anchor captured_at"),
  };
}

function recordArray(value: unknown, field: string): JsonRecord[] {
  if (!Array.isArray(value)) throw new Error(`problem activity ${field} must be an array`);
  return value.map((item) => record(item, `problem activity ${field}`));
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
    return result.map(workspaceFrom);
  } catch (error) {
    throw activityDatabaseError(error);
  }
}

export async function getProblemActivity(query: ProblemActivityQuery): Promise<ProblemActivity> {
  try {
    const rows = await activitySql().query(
      "SELECT activity_api.get_problem_activity($1::uuid, $2::uuid, $3, $4) AS result",
      [query.accountId, query.workspaceId, query.repositoryId, query.problemId],
    );
    const result = record(rows[0]?.result, "problem activity");
    if (!Array.isArray(result.anchors)) throw new Error("problem activity anchors must be an array");
    if (typeof result.following !== "boolean") throw new Error("problem activity following must be boolean");
    return {
      anchors: result.anchors.map(anchorFrom),
      following: result.following,
      approaches: recordArray(result.approaches, "approaches"),
      attempts: recordArray(result.attempts, "attempts"),
      discussion: recordArray(result.discussion, "discussion"),
      workRequests: recordArray(result.workRequests, "work requests"),
      artifacts: recordArray(result.artifacts, "artifacts"),
      drafts: recordArray(result.drafts, "drafts"),
      audit: recordArray(result.audit, "audit"),
    };
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
    anchor: dbAnchor(input.anchor), title: input.title, summary: input.summary,
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
    provider: input.provider,
    external_session_id: input.externalSessionId ?? null,
    locator: input.locator ?? null,
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
    external_session_id: patch.externalSessionId ?? null,
    locator: patch.locator ?? null,
    set_external_session_id: Object.hasOwn(patch, "externalSessionId"),
    set_locator: Object.hasOwn(patch, "locator"),
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

export function createWorkRequest(
  context: WorkspaceContext,
  input: CreateWorkRequestInput,
  options: CommandOptions,
) {
  return command(context, "work_request.create", {
    anchor: dbAnchor(input.anchor),
    approach_id: input.approachId ?? null,
    attempt_id: input.attemptId ?? null,
    kind: input.kind,
    title: input.title,
    detail: input.detail,
    assignee_account_id: input.assigneeAccountId ?? null,
  }, options);
}

export function attachArtifact(
  context: WorkspaceContext,
  input: AttachArtifactInput,
  options: CommandOptions,
) {
  return command(context, "artifact.attach", {
    anchor: dbAnchor(input.anchor),
    attempt_id: input.attemptId ?? null,
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
