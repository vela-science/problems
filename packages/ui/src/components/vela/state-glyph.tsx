import { cn } from "../../lib/utils";

/* Two orthogonal channels on one mark, after the Lean blueprint DAG's
 * border-is-statement / fill-is-proof encoding.
 *
 *   ring  = Claim standing        — what an authorized human Decision did
 *   core  = Verification outcome  — what a machine check reported
 *   cone  = the transitive state  — this Claim AND its whole upstream cone
 *
 * DESIGN.md:100-116 already fixes the vocabulary (filled disc, ring, dashed
 * ring, seam); this is that vocabulary drawn. Geometry carries the meaning and
 * colour only reinforces it, so the mark survives forced-colors, print and
 * greyscale — which is also what keeps `apps/observatory/DESIGN.md:61`
 * ("Verification and acceptance are never visually or verbally conflated")
 * enforceable rather than aspirational. It cannot be satisfied by a badge that
 * has one slot for both facts.
 *
 * The mark is always aria-hidden: every caller pairs it with the words. */

export type ClaimStanding =
  | "unassessed"
  | "accepted"
  | "accepted_with_conditions"
  | "corrected"
  | "superseded"
  | "retracted";

export type VerificationOutcome =
  | "pass"
  | "fail"
  | "inconclusive"
  | "error"
  | "not_attempted";

const standingStroke: Record<ClaimStanding, string> = {
  unassessed: "text-muted-foreground",
  accepted: "text-status-progress",
  accepted_with_conditions: "text-status-caution",
  corrected: "text-status-caution",
  superseded: "text-muted-foreground",
  retracted: "text-status-conflict",
};

/* Dashed means "not yet judged"; absent means the Decision was undone. */
const dashed: ReadonlySet<ClaimStanding> = new Set(["unassessed"]);
const seamed: ReadonlySet<ClaimStanding> = new Set(["corrected", "retracted"]);
const openRing: ReadonlySet<ClaimStanding> = new Set(["superseded"]);

export function StateGlyph({
  standing,
  verification = "not_attempted",
  cone = false,
  className,
}: {
  standing: ClaimStanding;
  verification?: VerificationOutcome;
  /* True only when this Claim and every upstream dependency verify. */
  cone?: boolean;
  className?: string;
}) {
  const half = standing === "accepted_with_conditions";
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      focusable="false"
      data-standing={standing}
      data-verification={verification}
      data-cone={cone ? "verified" : undefined}
      className={cn("size-4 shrink-0", standingStroke[standing], className)}
    >
      {/* ring — standing */}
      <circle
        cx="8"
        cy="8"
        r="6.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={dashed.has(standing) ? "2.2 2" : undefined}
        opacity={openRing.has(standing) ? 0.45 : 1}
      />

      {/* cone — this Claim and all of its ancestors verify */}
      {cone ? (
        <circle cx="8" cy="8" r="4.25" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.7" />
      ) : null}

      {/* core — verification outcome */}
      {verification === "pass" ? (
        /* A half disc, not a clipped one: a clipPath needs a document-unique id
           and this renders on the server, where useId is unavailable. */
        half
          ? <path d="M5.5 8 A2.5 2.5 0 0 0 10.5 8 Z" fill="currentColor" />
          : <circle cx="8" cy="8" r="2.5" fill="currentColor" />
      ) : null}
      {verification === "inconclusive" ? <circle cx="8" cy="8" r="1.1" fill="currentColor" /> : null}
      {verification === "error" ? (
        <rect x="5.5" y="7.35" width="5" height="1.3" fill="currentColor" />
      ) : null}
      {verification === "fail" ? (
        <>
          <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
          <line x1="5.9" y1="10.1" x2="10.1" y2="5.9" stroke="currentColor" strokeWidth="1" />
        </>
      ) : null}

      {/* seam — a correction or retraction crossing the record */}
      {seamed.has(standing) ? (
        <line x1="3.2" y1="12.8" x2="12.8" y2="3.2" stroke="currentColor" strokeWidth="1.25" />
      ) : null}

      {/* forward chevron — standing moved on to a successor */}
      {openRing.has(standing) ? (
        <path d="M6.4 5.4 L9.2 8 L6.4 10.6" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="1" />
      ) : null}
    </svg>
  );
}
