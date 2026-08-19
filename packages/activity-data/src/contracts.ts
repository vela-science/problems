import { canonicalJson, sha256, type HashRoot } from "@vela/projection-data/canonical";

export type { HashRoot } from "@vela/projection-data/canonical";

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

export type PublicProfileVisibility = "private" | "unlisted" | "public";
export type PublicProfileLinks = Partial<Record<"github" | "orcid" | "website" | "lab", string>>;

export type PublicProfilePerformerLink = {
  performerId: string;
  performerKind: "human" | "agent" | "organization";
  verificationKind: "signed_record" | "connected_github" | "connected_orcid" | "source_owner";
  evidenceLocator: string;
  createdAt: string;
};

export type PublicProfileHandle = {
  handle: string;
  createdAt: string;
  retiredAt: string | null;
};

export type PublicProfile = {
  id: string;
  handle: string;
  profileKind: "account";
  status: "active";
  displayName: string;
  bio: string;
  affiliation: string;
  visibility: PublicProfileVisibility;
  links: PublicProfileLinks;
  version: number;
  createdAt: string;
  updatedAt: string;
  handles: PublicProfileHandle[];
  performers: PublicProfilePerformerLink[];
  requestedHandle?: string;
  redirect?: boolean;
  ownerPreview?: boolean;
};

export type SavePublicProfileInput = {
  handle: string;
  displayName: string;
  bio: string;
  affiliation: string;
  visibility: PublicProfileVisibility;
  links: PublicProfileLinks;
};

const reservedProfileHandles = new Set([
  "account", "admin", "api", "auth", "help", "people", "problems",
  "problems-science", "root", "security", "support", "system", "vela",
]);

export function normalizePublicProfileHandle(value: string): string {
  const handle = value.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,37}[a-z0-9])$/u.test(handle) || handle.startsWith("p-") || reservedProfileHandles.has(handle)) {
    throw new Error("Profile handle must be 3–39 lowercase letters, numbers, or interior hyphens and cannot use a reserved product name");
  }
  return handle;
}

function publicProfileUrl(value: string, kind: keyof PublicProfileLinks): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${kind} link must be a complete HTTPS URL`);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || value.length > 500) {
    throw new Error(`${kind} link must be a safe HTTPS URL without credentials or a fragment`);
  }
  if (kind === "github" && (url.hostname !== "github.com" || url.pathname.split("/").filter(Boolean).length !== 1)) {
    throw new Error("GitHub link must identify one github.com account or organization");
  }
  if (kind === "orcid" && (url.hostname !== "orcid.org" || !/^\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/u.test(url.pathname))) {
    throw new Error("ORCID link must use a complete orcid.org identifier");
  }
  return url.toString();
}

export function normalizePublicProfileInput(input: SavePublicProfileInput): SavePublicProfileInput {
  const displayName = input.displayName.trim();
  const bio = input.bio.trim();
  const affiliation = input.affiliation.trim();
  if (!displayName || displayName.length > 120) throw new Error("Profile name must contain 1–120 characters");
  if (bio.length > 800) throw new Error("Profile bio must contain at most 800 characters");
  if (affiliation.length > 240) throw new Error("Profile affiliation must contain at most 240 characters");
  if (!["private", "unlisted", "public"].includes(input.visibility)) throw new Error("Profile visibility is invalid");
  const links = Object.fromEntries(Object.entries(input.links)
    .filter((entry): entry is [keyof PublicProfileLinks, string] => Boolean(entry[1]?.trim()))
    .map(([kind, value]) => [kind, publicProfileUrl(value, kind)])) as PublicProfileLinks;
  return {
    handle: normalizePublicProfileHandle(input.handle),
    displayName,
    bio,
    affiliation,
    visibility: input.visibility,
    links,
  };
}

export type Workspace = {
  id: string;
  slug: string;
  name: string;
  role: "owner" | "member";
  problemContexts: WorkspaceProblemContext[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceProblemContext = {
  projectionReleaseRoot: HashRoot;
  repositoryId: string;
  problemId: string;
  anchorRoot: HashRoot;
  capturedAt: string;
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
export type DiscussionKind = "comment" | "note";
export type DiscussionVisibility = "workspace" | "private";

export type ProblemActivityQuery = WorkspaceContext & {
  repositoryId: string;
  problemId: string;
  currentAnchorRoot: HashRoot;
};

export type ActivityApproach = {
  id: string;
  workspaceId: string;
  anchorRoot: HashRoot;
  parentApproachId: string | null;
  createdByAccountId: string;
  title: string;
  summary: string;
  state: "open" | "paused" | "completed" | "abandoned";
  authorityEffect: "none";
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ActivityAttempt = {
  id: string;
  workspaceId: string;
  anchorRoot: HashRoot;
  approachId: string;
  createdByAccountId: string;
  title: string;
  state: AttemptState;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ActivityDiscussionEntry = {
  id: string;
  workspaceId: string;
  anchorRoot: HashRoot;
  approachId: string | null;
  attemptId: string | null;
  authorAccountId: string;
  kind: DiscussionKind;
  visibility: DiscussionVisibility;
  body: string;
  createdAt: string;
};

export type ActivityArtifact = {
  id: string;
  workspaceId: string;
  anchorRoot: HashRoot;
  attemptId: string | null;
  attachedByAccountId: string;
  contentRoot: HashRoot;
  metadataRoot: HashRoot | null;
  kind: string;
  path: string;
  mediaType: string | null;
  byteSize: number | null;
  locator: string | null;
  createdAt: string;
};

export type ActivitySubmissionDraft = {
  id: string;
  workspaceId: string;
  anchorRoot: HashRoot;
  createdByAccountId: string;
  schemaName: "vela.submission.v3";
  payloadRoot: HashRoot;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ActivityAuditEntry = {
  sequence: number;
  workspaceId: string | null;
  accountId: string;
  anchorRoot: HashRoot | null;
  operation: string;
  subjectKind: string;
  subjectId: string;
  requestRoot: HashRoot;
  recordedAt: string;
};

export type ActivityCrdtUpdate = {
  id: string;
  workspaceId: string;
  anchorRoot: HashRoot;
  authorAccountId: string;
  documentName: "canvas";
  updateRoot: HashRoot;
  updateBase64: string;
  byteSize: number;
  authorityEffect: "none";
  createdAt: string;
};

export type ProblemActivity = {
  anchors: StoredScientificAnchor[];
  following: boolean;
  approaches: ActivityApproach[];
  attempts: ActivityAttempt[];
  discussion: ActivityDiscussionEntry[];
  artifacts: ActivityArtifact[];
  drafts: ActivitySubmissionDraft[];
  crdtUpdates: ActivityCrdtUpdate[];
  audit: ActivityAuditEntry[];
};

export function followsCurrentAnchor(
  followedAnchorRoots: readonly HashRoot[],
  currentAnchorRoot: HashRoot,
): boolean {
  return followedAnchorRoots.includes(currentAnchorRoot);
}

export type CreateWorkspaceInput = { slug: string; name: string };
export type FollowProblemInput = { anchor: ScientificAnchor; following: boolean };
export type CreateApproachInput = {
  anchor: ScientificAnchor;
  title: string;
  summary: string;
};
export type ForkApproachInput = {
  sourceApproachId: string;
  expectedVersion: number;
  title?: string;
  summary?: string;
};
export type CreateAttemptInput = {
  approachId: string;
  title: string;
};
export type UpdateAttemptInput = {
  state?: AttemptState;
  title?: string;
};
export type AddDiscussionEntryInput = {
  anchor: ScientificAnchor;
  approachId?: string | null;
  attemptId?: string | null;
  kind: DiscussionKind;
  visibility: DiscussionVisibility;
  body: string;
};
export type AttachArtifactInput = {
  anchor: ScientificAnchor;
  attemptId: string;
  contentRoot: HashRoot;
  kind: string;
  path: string;
  mediaType?: string | null;
  byteSize?: number | null;
  locator?: string | null;
  metadataRoot?: HashRoot | null;
};
export type AppendCrdtUpdateInput = {
  anchor: ScientificAnchor;
  documentName: "canvas";
  updateRoot: HashRoot;
  updateBase64: string;
};

export function commandRequestRoot(kind: string, input: unknown, expectedVersion?: number): HashRoot {
  return sha256(canonicalJson({
    schema: "vela.activity-command.v1",
    kind,
    expected_version: expectedVersion ?? null,
    input,
  }));
}
