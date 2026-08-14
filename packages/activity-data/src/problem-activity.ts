import {
  followsCurrentAnchor,
  type ActivityApproach,
  type ActivityArtifact,
  type ActivityAttempt,
  type ActivityAuditEntry,
  type ActivityCrdtUpdate,
  type ActivityDiscussionEntry,
  type ActivitySubmissionDraft,
  type ActivityWorkRequest,
  type HashRoot,
  type ProblemActivity,
  type StoredScientificAnchor,
} from "./contracts";

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} response must be an object`);
  }
  return value as JsonRecord;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new Error(`activity response has no ${field}`);
  return value;
}

function integer(value: unknown, field: string, minimum = 0): number {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^(?:0|[1-9][0-9]*)$/u.test(value)
      ? Number(value)
      : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`activity response has invalid ${field}`);
  }
  return parsed;
}

function recordArray(value: unknown, field: string): JsonRecord[] {
  if (!Array.isArray(value)) throw new Error(`problem activity ${field} must be an array`);
  return value.map((item) => record(item, `problem activity ${field}`));
}

function nullableText(row: JsonRecord, key: string, field: string): string | null {
  return row[key] == null ? null : text(row[key], field);
}

function hashRoot(row: JsonRecord, key: string, field: string): HashRoot {
  const value = text(row[key], field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(value)) throw new Error(`activity response has invalid ${field}`);
  return value as HashRoot;
}

function nullableHashRoot(row: JsonRecord, key: string, field: string): HashRoot | null {
  return row[key] == null ? null : hashRoot(row, key, field);
}

function member<T extends string>(value: unknown, values: readonly T[], field: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`activity response has invalid ${field}`);
  }
  return value as T;
}

function anchorFrom(value: unknown): StoredScientificAnchor {
  const row = record(value, "scientific anchor");
  return {
    root: hashRoot(row, "anchor_root", "anchor root"),
    projectionReleaseRoot: hashRoot(row, "projection_release_root", "anchor projection_release_root"),
    repositoryId: text(row.repository_id, "anchor repository_id"),
    repositoryRoot: hashRoot(row, "repository_root", "anchor repository_root"),
    sourceCommit: text(row.source_commit, "anchor source_commit"),
    sourceTree: text(row.source_tree, "anchor source_tree"),
    problemId: text(row.problem_id, "anchor problem_id"),
    problemRecordRoot: hashRoot(row, "problem_record_root", "anchor problem_record_root"),
    sourceObservationRoot: nullableHashRoot(row, "source_observation_root", "anchor source_observation_root"),
    claimId: nullableText(row, "claim_id", "anchor claim_id"),
    claimRoot: nullableHashRoot(row, "claim_root", "anchor claim_root"),
    claimStanding: nullableText(row, "claim_standing", "anchor claim_standing"),
    capturedAt: text(row.captured_at, "anchor captured_at"),
  };
}

function validateRetainedApproachFields(row: JsonRecord): boolean {
  const targetId = nullableText(row, "target_id", "approach target_id");
  const targetPacketRoot = nullableHashRoot(row, "target_packet_root", "approach target_packet_root");
  const targetRecordRoot = nullableHashRoot(row, "target_record_root", "approach target_record_root");
  if (targetId === null && targetPacketRoot === null && targetRecordRoot === null) {
    return false;
  }
  if (
    targetId === null
    || !targetId.trim()
    || targetId !== targetId.trim()
    || targetId.length > 1_000
    || targetPacketRoot === null
  ) {
    throw new Error("activity response has invalid retained approach binding");
  }
  return true;
}

function validateRetainedExecutionFields(row: JsonRecord, subject: string): boolean {
  if (row.authority_effect !== "none") {
    throw new Error(`activity response has invalid ${subject} authority_effect`);
  }
  const packetRoot = nullableHashRoot(row, "execution_packet_root", `${subject} execution_packet_root`);
  const profileRoot = nullableHashRoot(row, "execution_profile_root", `${subject} execution_profile_root`);
  const verifierCapsuleRoot = nullableHashRoot(
    row,
    "execution_verifier_capsule_root",
    `${subject} execution_verifier_capsule_root`,
  );
  const resultContractRoot = nullableHashRoot(
    row,
    "execution_result_contract_root",
    `${subject} execution_result_contract_root`,
  );
  if (packetRoot === null && profileRoot === null && verifierCapsuleRoot === null && resultContractRoot === null) {
    return false;
  }
  if (packetRoot === null || profileRoot === null || verifierCapsuleRoot === null || resultContractRoot === null) {
    throw new Error(`activity response has partial ${subject} execution binding`);
  }
  return true;
}

function approachFrom(value: unknown): ActivityApproach {
  const row = record(value, "approach");
  if (row.authority_effect !== "none") {
    throw new Error("activity response has invalid approach authority_effect");
  }
  const frozenLegacy = validateRetainedApproachFields(row);
  return {
    id: text(row.id, "approach id"), workspaceId: text(row.workspace_id, "approach workspace_id"),
    anchorRoot: hashRoot(row, "anchor_root", "approach anchor_root"),
    parentApproachId: nullableText(row, "parent_approach_id", "approach parent_approach_id"),
    createdByAccountId: text(row.created_by_account_id, "approach created_by_account_id"),
    title: text(row.title, "approach title"), summary: text(row.summary, "approach summary"),
    state: member(row.state, ["open", "paused", "completed", "abandoned"] as const, "approach state"),
    authorityEffect: "none", frozenLegacy,
    version: integer(row.version, "approach version", 1), createdAt: text(row.created_at, "approach created_at"),
    updatedAt: text(row.updated_at, "approach updated_at"),
  };
}

function attemptFrom(value: unknown): ActivityAttempt {
  const row = record(value, "attempt");
  const frozenLegacy = validateRetainedExecutionFields(row, "attempt");
  return {
    id: text(row.id, "attempt id"), workspaceId: text(row.workspace_id, "attempt workspace_id"),
    anchorRoot: hashRoot(row, "anchor_root", "attempt anchor_root"),
    approachId: text(row.approach_id, "attempt approach_id"),
    createdByAccountId: text(row.created_by_account_id, "attempt created_by_account_id"),
    provider: text(row.provider, "attempt provider"),
    externalSessionId: nullableText(row, "external_session_id", "attempt external_session_id"),
    locator: nullableText(row, "locator", "attempt locator"), title: text(row.title, "attempt title"),
    state: member(row.state, ["planned", "running", "paused", "completed", "failed", "abandoned"] as const, "attempt state"), frozenLegacy,
    version: integer(row.version, "attempt version", 1), createdAt: text(row.created_at, "attempt created_at"),
    updatedAt: text(row.updated_at, "attempt updated_at"),
  };
}

function discussionFrom(value: unknown): ActivityDiscussionEntry {
  const row = record(value, "discussion entry");
  return {
    id: text(row.id, "discussion id"), workspaceId: text(row.workspace_id, "discussion workspace_id"),
    anchorRoot: hashRoot(row, "anchor_root", "discussion anchor_root"),
    approachId: nullableText(row, "approach_id", "discussion approach_id"),
    attemptId: nullableText(row, "attempt_id", "discussion attempt_id"),
    authorAccountId: text(row.author_account_id, "discussion author_account_id"),
    kind: member(row.kind, ["comment", "note"] as const, "discussion kind"),
    visibility: member(row.visibility, ["workspace", "private"] as const, "discussion visibility"),
    body: text(row.body, "discussion body"), createdAt: text(row.created_at, "discussion created_at"),
  };
}

function workRequestFrom(value: unknown): ActivityWorkRequest {
  const row = record(value, "work request");
  return {
    id: text(row.id, "work request id"), workspaceId: text(row.workspace_id, "work request workspace_id"),
    anchorRoot: hashRoot(row, "anchor_root", "work request anchor_root"),
    approachId: nullableText(row, "approach_id", "work request approach_id"),
    attemptId: nullableText(row, "attempt_id", "work request attempt_id"),
    createdByAccountId: text(row.created_by_account_id, "work request created_by_account_id"),
    assigneeAccountId: nullableText(row, "assignee_account_id", "work request assignee_account_id"),
    kind: member(row.kind, ["assignment", "reproduction"] as const, "work request kind"),
    state: member(row.state, ["open", "claimed", "completed", "cancelled"] as const, "work request state"),
    title: text(row.title, "work request title"), detail: text(row.detail, "work request detail"),
    version: integer(row.version, "work request version", 1), createdAt: text(row.created_at, "work request created_at"),
    updatedAt: text(row.updated_at, "work request updated_at"),
  };
}

function artifactFrom(value: unknown): ActivityArtifact {
  const row = record(value, "artifact");
  const frozenLegacy = validateRetainedExecutionFields(row, "artifact");
  return {
    id: text(row.id, "artifact id"), workspaceId: text(row.workspace_id, "artifact workspace_id"),
    anchorRoot: hashRoot(row, "anchor_root", "artifact anchor_root"),
    attemptId: nullableText(row, "attempt_id", "artifact attempt_id"),
    attachedByAccountId: text(row.attached_by_account_id, "artifact attached_by_account_id"),
    contentRoot: hashRoot(row, "content_root", "artifact content_root"),
    metadataRoot: nullableHashRoot(row, "metadata_root", "artifact metadata_root"),
    kind: text(row.kind, "artifact kind"), path: text(row.path, "artifact path"),
    mediaType: nullableText(row, "media_type", "artifact media_type"),
    byteSize: row.byte_size == null ? null : integer(row.byte_size, "artifact byte_size"),
    locator: nullableText(row, "locator", "artifact locator"), frozenLegacy,
    createdAt: text(row.created_at, "artifact created_at"),
  };
}

function draftFrom(value: unknown): ActivitySubmissionDraft {
  const row = record(value, "submission draft");
  const frozenLegacy = validateRetainedExecutionFields(row, "submission draft");
  return {
    id: text(row.id, "submission draft id"), workspaceId: text(row.workspace_id, "submission draft workspace_id"),
    anchorRoot: hashRoot(row, "anchor_root", "submission draft anchor_root"),
    artifactId: nullableText(row, "artifact_id", "submission draft artifact_id"),
    createdByAccountId: text(row.created_by_account_id, "submission draft created_by_account_id"),
    schemaName: member(row.schema_name, ["vela.submission.v2"] as const, "submission draft schema_name"),
    payloadRoot: hashRoot(row, "payload_root", "submission draft payload_root"), frozenLegacy,
    version: integer(row.version, "submission draft version", 1), createdAt: text(row.created_at, "submission draft created_at"),
    updatedAt: text(row.updated_at, "submission draft updated_at"),
  };
}

function auditFrom(value: unknown): ActivityAuditEntry {
  const row = record(value, "activity audit entry");
  return {
    sequence: integer(row.sequence, "audit sequence", 1), workspaceId: nullableText(row, "workspace_id", "audit workspace_id"),
    accountId: text(row.account_id, "audit account_id"), anchorRoot: nullableHashRoot(row, "anchor_root", "audit anchor_root"),
    operation: text(row.operation, "audit operation"), subjectKind: text(row.subject_kind, "audit subject_kind"),
    subjectId: text(row.subject_id, "audit subject_id"), requestRoot: hashRoot(row, "request_root", "audit request_root"),
    recordedAt: text(row.recorded_at, "audit recorded_at"),
  };
}

function crdtUpdateFrom(value: unknown): ActivityCrdtUpdate {
  const row = record(value, "CRDT update");
  if (row.authority_effect !== "none") throw new Error("activity response has invalid CRDT authority_effect");
  const updateBase64 = text(row.update_base64, "CRDT update_base64");
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(updateBase64) || updateBase64.length % 4 !== 0) {
    throw new Error("activity response has invalid CRDT update_base64");
  }
  const byteSize = integer(row.byte_size, "CRDT byte_size", 1);
  const padding = updateBase64.endsWith("==") ? 2 : updateBase64.endsWith("=") ? 1 : 0;
  if ((updateBase64.length * 3) / 4 - padding !== byteSize) {
    throw new Error("activity response has invalid CRDT byte_size");
  }
  return {
    id: text(row.id, "CRDT update id"),
    workspaceId: text(row.workspace_id, "CRDT workspace_id"),
    anchorRoot: hashRoot(row, "anchor_root", "CRDT anchor_root"),
    authorAccountId: text(row.author_account_id, "CRDT author_account_id"),
    documentName: member(row.document_name, ["canvas"] as const, "CRDT document_name"),
    updateRoot: hashRoot(row, "update_root", "CRDT update_root"),
    updateBase64,
    byteSize,
    authorityEffect: "none",
    createdAt: text(row.created_at, "CRDT created_at"),
  };
}

export function parseCrdtUpdates(value: unknown): ActivityCrdtUpdate[] {
  return recordArray(value, "CRDT updates").map(crdtUpdateFrom);
}

export function parseProblemActivity(value: unknown, currentAnchorRoot: HashRoot): ProblemActivity {
  const result = record(value, "problem activity");
  if (!Array.isArray(result.anchors)) throw new Error("problem activity anchors must be an array");
  if (!Array.isArray(result.followedAnchorRoots)) throw new Error("problem activity followedAnchorRoots must be an array");
  const followedAnchorRoots = result.followedAnchorRoots.map((item) => {
    const candidate = text(item, "followed anchor root");
    if (!/^sha256:[0-9a-f]{64}$/u.test(candidate)) throw new Error("problem activity followed anchor root is invalid");
    return candidate as HashRoot;
  });
  if (new Set(followedAnchorRoots).size !== followedAnchorRoots.length) {
    throw new Error("problem activity followedAnchorRoots must be unique");
  }
  return {
    anchors: result.anchors.map(anchorFrom),
    following: followsCurrentAnchor(followedAnchorRoots, currentAnchorRoot),
    approaches: recordArray(result.approaches, "approaches").map(approachFrom),
    attempts: recordArray(result.attempts, "attempts").map(attemptFrom),
    discussion: recordArray(result.discussion, "discussion").map(discussionFrom),
    workRequests: recordArray(result.workRequests, "work requests").map(workRequestFrom),
    artifacts: recordArray(result.artifacts, "artifacts").map(artifactFrom),
    drafts: recordArray(result.drafts, "drafts").map(draftFrom),
    crdtUpdates: result.crdtUpdates === undefined ? [] : parseCrdtUpdates(result.crdtUpdates),
    audit: recordArray(result.audit, "audit").map(auditFrom),
  };
}
