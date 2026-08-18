import Link from "next/link";
import { currentReview } from "@/components/vela/problem-provenance";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { formatDate } from "@/lib/format";

type State = NonNullable<ScientificProblemState>;

/* The Overview's one-line answer to "what has been checked?", with the full
 * record one link away. This summarizes and never details: performer counts
 * and a date, not method roots, record ids, or disclosure text — those are
 * record-tier and live at ?view=timeline.
 *
 * The empties stay distinct because they are different facts: a Problem
 * nothing has been checked against, and a Claim whose Verification Record is
 * simply not retained, must not collapse into one sentence. */
export function ProvenanceSummary({ state, basePath }: { state: State; basePath: string }) {
  const current = currentReview(state);
  const recordHref = `${basePath}?view=history`;
  const audit = state.sourceAudits.length
    ? <>{" "}The source publishes <Link href={`${basePath}?view=results`} className="underline underline-offset-4">its own audit</Link>.</>
    : null;
  if (current) {
    const producer = current.producer_package?.producer_actor ?? null;
    const records = current.verification_records ?? [];
    const decided = formatDate(current.reviewed_at ?? current.created_at);
    return <section aria-labelledby="checked-heading">
      <h2 id="checked-heading" className="text-title">What was checked</h2>
      <p className="mt-4 max-w-[85ch] text-body">
        {producer ? <>Produced by <span className="font-medium">{producer}</span>, </> : <>Produced by an unretained identity, </>}
        checked in {records.length === 1 ? "one scoped verification pass" : `${records.length} scoped verification passes`}, and decided {decided}.
      </p>
      <p className="mt-2 text-meta"><Link href={recordHref} className="underline underline-offset-4">Full verification record</Link>{audit}</p>
    </section>;
  }
  if (state.claims.length) {
    return <section aria-labelledby="checked-heading">
      <h2 id="checked-heading" className="text-title">What was checked</h2>
      <p className="mt-4 max-w-[85ch] text-body text-muted-foreground">The current Claim holds Repository-local Standing; no accepted contribution&apos;s Verification Record is retained for it.</p>
      <p className="mt-2 text-meta"><Link href={recordHref} className="underline underline-offset-4">Open the record surface</Link>{audit}</p>
    </section>;
  }
  return <section aria-labelledby="checked-heading">
    <h2 id="checked-heading" className="text-title">What was checked</h2>
    <p className="mt-4 max-w-[85ch] text-body text-muted-foreground">No contribution to this Problem has been checked by this Repository.</p>
    {audit ? <p className="mt-2 text-meta text-muted-foreground"><span className="sr-only">Source audit:</span>{audit}</p> : null}
  </section>;
}
