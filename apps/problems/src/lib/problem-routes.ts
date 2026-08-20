import "server-only";

import { canonicalProblemPath } from "@vela/projection-data";

/* Where a Problem lives.
 *
 * This used to fall back to `/p/{repository}/{problem}` whenever the public
 * route table had no entry, which was 1,211 of 1,217 Problems — so the
 * "fallback" was the normal case and the legacy path could never retire.
 * Every Problem now has a computed canonical address, and an unaddressable
 * one returns null so the caller refuses rather than emitting a link that
 * resolves to nothing.
 */
export function publicProblemPath(repository: string, problem: string): string | null {
  return canonicalProblemPath(repository, problem);
}

export function publicProblemWorkspacePath(repository: string, problem: string, workspaceId?: string): string | null {
  const path = publicProblemPath(repository, problem);
  if (!path) return null;
  /* Work is a path segment; `?view=work` still resolves for shared links but
     is not what internal navigation emits (AGENTS.md). */
  const query = new URLSearchParams();
  if (workspaceId) query.set("workspace", workspaceId);
  return query.size ? `${path}/work?${query.toString()}` : `${path}/work`;
}
