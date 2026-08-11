import { canonicalJson, sha256, type HashRoot } from "@vela/observatory-data/canonical";

export type { HashRoot } from "@vela/observatory-data/canonical";

export type HostedAccountInput = {
  workosUserId: string;
  displayName: string;
  email: string;
};

export type ActivityAccount = {
  id: string;
  workosUserId: string;
  displayName: string;
  email: string;
  createdAt: string;
};

export type Workspace = {
  id: string;
  slug: string;
  name: string;
  role: "owner" | "member";
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceContext = {
  accountId: string;
  workspaceId: string;
};

export type CommandOptions = {
  idempotencyKey: string;
};

export type ScientificAnchor = {
  projectionReleaseRoot: HashRoot;
  repositoryId: string;
  repositoryRoot: HashRoot;
  sourceCommit: string;
  sourceTree: string;
  problemId: string;
  problemRecordRoot: HashRoot;
  sourceObservationRoot: HashRoot | null;
  claimId: string | null;
  claimRoot: HashRoot | null;
  claimStanding: string | null;
};

export type StoredScientificAnchor = ScientificAnchor & {
  root: HashRoot;
  capturedAt: string;
};

export type AnchorFreshness =
  | { state: "current" }
  | { state: "repository_advanced"; fields: string[] }
  | { state: "problem_changed"; fields: string[] }
  | { state: "claim_changed"; fields: string[] }
  | { state: "unavailable"; fields: string[] };

export function scientificAnchorRoot(anchor: ScientificAnchor): HashRoot {
  return sha256(canonicalJson({
    schema: "vela.activity-scientific-anchor.v1",
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
  }));
}

export function assessAnchorFreshness(
  stored: ScientificAnchor,
  current: ScientificAnchor | null,
): AnchorFreshness {
  if (!current) return { state: "unavailable", fields: ["current_anchor"] };
  const repository = ([
    "repositoryId",
    "repositoryRoot",
    "sourceCommit",
    "sourceTree",
    "projectionReleaseRoot",
  ] as const).filter((field) => stored[field] !== current[field]);
  const problem = (["problemId", "problemRecordRoot", "sourceObservationRoot"] as const)
    .filter((field) => stored[field] !== current[field]);
  const claim = (["claimId", "claimRoot", "claimStanding"] as const)
    .filter((field) => stored[field] !== current[field]);
  if (problem.length) return { state: "problem_changed", fields: [...problem] };
  if (claim.length) return { state: "claim_changed", fields: [...claim] };
  if (repository.length) return { state: "repository_advanced", fields: [...repository] };
  return { state: "current" };
}

export type AttemptState = "planned" | "running" | "paused" | "completed" | "failed" | "abandoned";
export type WorkRequestKind = "assignment" | "reproduction";
export type WorkRequestState = "open" | "claimed" | "completed" | "cancelled";
export type DiscussionKind = "comment" | "note";
export type DiscussionVisibility = "workspace" | "private";

export type ProblemActivityQuery = WorkspaceContext & {
  repositoryId: string;
  problemId: string;
};

export type ProblemActivity = {
  anchors: StoredScientificAnchor[];
  following: boolean;
  approaches: Array<Record<string, unknown>>;
  attempts: Array<Record<string, unknown>>;
  discussion: Array<Record<string, unknown>>;
  workRequests: Array<Record<string, unknown>>;
  artifacts: Array<Record<string, unknown>>;
  drafts: Array<Record<string, unknown>>;
  audit: Array<Record<string, unknown>>;
};

export type CreateWorkspaceInput = { slug: string; name: string };
export type FollowProblemInput = { anchor: ScientificAnchor; following: boolean };
export type CreateApproachInput = { anchor: ScientificAnchor; title: string; summary: string };
export type ForkApproachInput = {
  sourceApproachId: string;
  expectedVersion: number;
  title?: string;
  summary?: string;
};
export type CreateAttemptInput = {
  approachId: string;
  provider: string;
  externalSessionId?: string | null;
  locator?: string | null;
  title: string;
};
export type UpdateAttemptInput = {
  state?: AttemptState;
  title?: string;
  externalSessionId?: string | null;
  locator?: string | null;
};
export type AddDiscussionEntryInput = {
  anchor: ScientificAnchor;
  approachId?: string | null;
  attemptId?: string | null;
  kind: DiscussionKind;
  visibility: DiscussionVisibility;
  body: string;
};
export type CreateWorkRequestInput = {
  anchor: ScientificAnchor;
  approachId?: string | null;
  attemptId?: string | null;
  kind: WorkRequestKind;
  title: string;
  detail: string;
  assigneeAccountId?: string | null;
};
export type AttachArtifactInput = {
  anchor: ScientificAnchor;
  attemptId?: string | null;
  contentRoot: HashRoot;
  kind: string;
  path: string;
  mediaType?: string | null;
  byteSize?: number | null;
  locator?: string | null;
  metadataRoot?: HashRoot | null;
};

export function commandRequestRoot(kind: string, input: unknown, expectedVersion?: number): HashRoot {
  return sha256(canonicalJson({
    schema: "vela.activity-command.v1",
    kind,
    expected_version: expectedVersion ?? null,
    input,
  }));
}
