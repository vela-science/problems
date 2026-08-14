type SafeWorkspaceErrorCode = "unauthorized" | "conflict" | "invalid" | "not_found" | "database";
type ActivitySnapshot = {
  approaches: Array<{
    id: string;
    anchorRoot: string;
    version: number;
  }>;
  attempts: Array<{
    id: string;
    anchorRoot: string;
    version: number;
  }>;
  artifacts?: Array<{
    id: string;
    anchorRoot: string;
    attemptId?: string | null;
    kind?: string;
    path?: string;
    contentRoot?: `sha256:${string}`;
  }>;
};

export class WorkspaceMutationError extends Error {
  readonly name = "WorkspaceMutationError";

  constructor(public readonly code: "conflict" | "invalid" | "not_found") {
    super(code === "conflict"
      ? "Workspace activity is not current"
      : code === "not_found"
        ? "Workspace activity was not found"
        : "Workspace activity input is invalid");
  }
}

export function requireExpectedAnchorRoot(currentAnchorRoot: string, expectedAnchorRoot: string) {
  if (currentAnchorRoot !== expectedAnchorRoot) {
    throw new WorkspaceMutationError("conflict");
  }
}

export function requireCurrentApproach(
  activity: ActivitySnapshot,
  approachId: string,
  currentAnchorRoot: string,
  expectedVersion?: number,
) {
  const approach = activity.approaches.find((entry) => entry.id === approachId);
  if (!approach) throw new WorkspaceMutationError("not_found");
  if (approach.anchorRoot !== currentAnchorRoot) {
    throw new WorkspaceMutationError("conflict");
  }
  if (expectedVersion !== undefined && approach.version !== expectedVersion) {
    throw new WorkspaceMutationError("conflict");
  }
  return approach;
}

export function requireCurrentAttempt(
  activity: ActivitySnapshot,
  attemptId: string,
  currentAnchorRoot: string,
  expectedVersion?: number,
) {
  const attempt = activity.attempts.find((entry) => entry.id === attemptId);
  if (!attempt) throw new WorkspaceMutationError("not_found");
  if (
    attempt.anchorRoot !== currentAnchorRoot
    || (expectedVersion !== undefined && attempt.version !== expectedVersion)
  ) {
    throw new WorkspaceMutationError("conflict");
  }
  return attempt;
}

export function requireCurrentArtifact(
  activity: ActivitySnapshot,
  researchBlockId: string,
  currentAnchorRoot: string,
): NonNullable<ActivitySnapshot["artifacts"]>[number] & {
  kind: string;
  path: string;
  contentRoot: `sha256:${string}`;
} {
  const artifact = activity.artifacts?.find((entry) => entry.id === researchBlockId);
  if (!artifact) throw new WorkspaceMutationError("not_found");
  if (artifact.anchorRoot !== currentAnchorRoot) {
    throw new WorkspaceMutationError("conflict");
  }
  if (!artifact.kind || !artifact.path || !artifact.contentRoot) {
    throw new WorkspaceMutationError("invalid");
  }
  return artifact as typeof artifact & { kind: string; path: string; contentRoot: `sha256:${string}` };
}

export function safeWorkspaceErrorCode(error: unknown): SafeWorkspaceErrorCode | null {
  if (error instanceof WorkspaceMutationError) return error.code;
  if (!(error instanceof Error) || error.name !== "ActivityDataError") return null;
  const code = (error as Error & { code?: unknown }).code;
  return code === "unauthorized" || code === "conflict" || code === "invalid" || code === "not_found" || code === "database"
    ? code
    : null;
}
