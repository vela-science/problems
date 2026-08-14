import { createHash } from "node:crypto";
import { projectionRefusal, type ProjectionRefusal } from "@vela/projection-data/refusal";

/* The cache contract both rooted read endpoints answer under.
 *
 * A response is keyed to a projection root and a query, and a root never
 * changes, so the body is immutable for as long as the root is served. The two
 * routes had this written twice — once factored, once inline — along with the
 * same error-message-to-status ladder character for character, so a change to
 * the contract could land on one endpoint and not the other. */
export function immutableProjectionHeaders(root: string, query: string): Record<string, string> {
  return {
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${root.slice("sha256:".length)}-${createHash("sha256").update(query).digest("hex").slice(0, 16)}"`,
    "X-Vela-Projection-Root": root,
  };
}

/**
 * The status a failed rooted read answers with, and the code it names.
 *
 * This used to be a substring ladder over the thrown English, because a refusal
 * carried nothing else. It got the important case wrong: `assertReadableRelease`
 * reported "expired or unknown projection root" for two different facts and the
 * ladder tested `expired` first, so a root that was never published came back
 * `410 Gone` — telling the caller the Problems had held this projection and
 * removed it. Refusals carry a `ProjectionRefusal` now; see
 * `packages/projection-data/src/refusal.ts`.
 *
 * Anything thrown without a code is a row that contradicts the read contract —
 * the projection disagreeing with itself rather than the caller asking for
 * something wrong — and stays a 409.
 */
const refusalStatus: Record<ProjectionRefusal, 400 | 404 | 409 | 410> = {
  malformed_root: 400,
  invalid_limit: 400,
  invalid_cursor: 400,
  unknown_root: 404,
  expired_root: 410,
  foreign_manifest: 409,
  unknown_repository: 404,
  unknown_node: 404,
};

export interface ProjectionErrorAnswer {
  status: 400 | 404 | 409 | 410;
  body: { error: string; code?: ProjectionRefusal };
}

export function projectionErrorAnswer(error: unknown, fallback: string): ProjectionErrorAnswer {
  const message = error instanceof Error ? error.message : fallback;
  const code = projectionRefusal(error);
  return code === null
    ? { status: 409, body: { error: message } }
    : { status: refusalStatus[code], body: { error: message, code } };
}
