import "server-only";

import { problemPublicRouteForLegacyPath } from "@vela/projection-data";

export function publicProblemPath(repository: string, problem: string): string {
  const legacyPath = `/p/${repository}/${problem}`;
  return problemPublicRouteForLegacyPath(legacyPath)?.canonical_path ?? legacyPath;
}

export function publicProblemWorkspacePath(repository: string, problem: string, workspaceId?: string): string {
  const query = new URLSearchParams({ mode: "work" });
  if (workspaceId) query.set("workspace", workspaceId);
  return `${publicProblemPath(repository, problem)}?${query.toString()}`;
}
