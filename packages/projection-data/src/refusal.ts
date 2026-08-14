/**
 * Why a rooted read refused, as a value rather than as a sentence.
 *
 * Three places in this repository derived behaviour by substring-matching the
 * English of a thrown message — `projection-response.ts`, the `sources.json`
 * route, and `objectContextById` — because the message was the only thing a
 * refusal carried. One of them was wrong. `assertReadableRelease` threw the
 * single string `"expired or unknown projection root"` for two different facts,
 * and the ladder tested `expired` before `unknown`, so a projection root that
 * was never published was answered `410 Gone`: an assertion that the
 * Problems once retained this projection and deliberately stopped serving
 * it. That is a claim about retained state, made by a surface whose whole
 * discipline is not asserting what it has not established.
 *
 * So a refusal carries a code. The prose beside it stays free to change — it is
 * written for a person and it will be reworded — and no caller has to read it.
 *
 * The list is short on purpose, and it should stay short. A code is a promise:
 * once something branches on one, removing it is a breaking change to every
 * reader. Add one when a caller would genuinely act differently, not to
 * describe a message more finely.
 */
export type ProjectionRefusal =
  /** The caller's root is not `sha256:` and 64 lowercase hex digits. */
  | "malformed_root"
  /** The caller asked for a page size that is not a positive safe integer. */
  | "invalid_limit"
  /** The caller's pagination cursor does not decode to the shape it must have. */
  | "invalid_cursor"
  /** No activated projection has ever carried this root. */
  | "unknown_root"
  /** This projection was published and is no longer among the retained set. */
  | "expired_root"
  /** The stored release carries a manifest schema this reader does not read. */
  | "foreign_manifest"
  /** The projection holds no Repository under this slug. */
  | "unknown_repository"
  /** The Repository's graph holds no node under this identifier. */
  | "unknown_node";

export class ProjectionReadError extends Error {
  readonly code: ProjectionRefusal;

  constructor(code: ProjectionRefusal, message: string) {
    super(message);
    this.name = "ProjectionReadError";
    this.code = code;
  }
}

/** The refusal a thrown value carries, or null if it carries none. */
export function projectionRefusal(error: unknown): ProjectionRefusal | null {
  return error instanceof ProjectionReadError ? error.code : null;
}
