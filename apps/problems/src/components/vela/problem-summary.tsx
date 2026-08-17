import { StatusBadge } from "@vela/ui/vela/status-badge";
import { localStandingLabel, standingScopeSentence } from "@/components/vela/problem-facts";
import { currentReview } from "@/components/vela/problem-provenance";
import { formatDate } from "@/lib/format";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* The thirty-second answer, in the hero, on every public view: the two state
 * axes that must never collapse into one verdict, what has been checked, and
 * what the checks left open. Everything here derives from data the page
 * already loaded — no new read, no session — and everything is a summary:
 * the detail each cell compresses lives at its own address one tab away.
 *
 * The empties stay distinct: "not checked" is a fact about the Repository,
 * "no Verification Record retained" is a fact about one Claim's record, and
 * an open declared status is the source's own word. */
export function ProblemAnswerStrip({ state }: { state: State }) {
  const review = currentReview(state);
  const standings = state.claims.map((claim) => claim.standing);
  const standingState = new Set(standings).size === 1 ? state.claims[0]!.standing : "unassessed";
  const scope = standingScopeSentence(state);
  const limits = [...new Set((review?.verification_records ?? []).flatMap((record) => record.does_not_establish ?? []))];
  const checked = review
    ? `${(review.verification_records ?? []).length || "No"} scoped verification ${(review.verification_records ?? []).length === 1 ? "pass" : "passes"}, decided ${formatDate(review.reviewed_at ?? review.created_at)}`
    : state.claims.length
      ? "No Verification Record is retained for the current Claim"
      : "Not checked by this Repository";
  const unresolved = limits[0]
    ?? (state.problem.declared_status === "open" ? "Open per the source's own declaration" : null);
  return <dl className="mt-6 grid gap-x-6 gap-y-4 border-y py-4 text-meta sm:grid-cols-2 lg:grid-cols-4">
    <div className="min-w-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">Source status</dt>
      <dd className="mt-1.5 text-label capitalize">{state.problem.declared_status}</dd>
    </div>
    <div className="min-w-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">Local Standing</dt>
      {/* The label names the authority, so it runs long; the badge wraps
          inside its own cell rather than escaping into the next one. */}
      <dd className="mt-1.5"><StatusBadge state={standingState} axis="standing" className="h-auto min-h-6 max-w-full whitespace-normal py-1 text-left leading-snug">{localStandingLabel(standings, state.repositoryName)}</StatusBadge>
        {scope ? <span className="mt-1.5 block text-micro text-muted-foreground">{scope}</span> : null}</dd>
    </div>
    <div className="min-w-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">Checked</dt>
      <dd className="mt-1.5 text-compact">{checked}</dd>
    </div>
    <div className="min-w-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">Unresolved</dt>
      {/* Absence of a retained remainder is a fact about the record, not a
          claim that nothing is uncertain — the wording keeps that apart. */}
      <dd className="mt-1.5 text-compact">{unresolved ?? "No retained record names one"}</dd>
    </div>
  </dl>;
}
