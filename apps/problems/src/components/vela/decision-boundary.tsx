import type { DecisionPacketSummary, ProposedStatePreview, ReviewSummary } from "@vela/projection-data";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { RecordId } from "@/components/vela/record-id";
import { RecordPreview } from "@/components/vela/record-preview";
import { Disclosure } from "@/components/vela/disclosure";

const previewStateCopy: Record<ProposedStatePreview["state"], { title: string; detail: string }> = {
  current: {
    title: "Current proposed state",
    detail: "These consequences are rooted to the Repository State shown below. They remain hypothetical until an eligible, attributed performer records a Decision.",
  },
  stale_recomputable: {
    title: "Stale proposed state",
    detail: "The Proposal still exists, but its rooted read set has advanced. Recompute the preview and review the new entry before any Decision.",
  },
  invalidated: {
    title: "Invalidated proposed state",
    detail: "One or more exact Proposal inputs no longer match. This preview cannot be used for a Decision.",
  },
  terminal_historical: {
    title: "Historical proposed state",
    detail: "This is the exact preview retained from immediately before the terminal Proposal transition.",
  },
  unavailable: {
    title: "Historical proposed state unavailable",
    detail: "The exact pre-terminal Repository revision is retained, but the pinned Core reader cannot reconstruct a Decision Inbox entry for that predecessor layout. No modern hypothetical is substituted.",
  },
};

function PreviewRoot({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-eyebrow text-muted-foreground">{label}</dt>
      <dd className="mt-1"><RecordId value={value} prefix={22} /></dd>
    </div>
  );
}

/* Nine roots, and they used to be the first thing on the page.
 *
 * The Proposal opened with Preview root, Base revision, Base Git commit, Base
 * Repository root, Decision Inbox entry, If accepted, If rejected, Terminal
 * Git commit and Terminal Repository root — before the producer, before the
 * two Checks, before the Decision's own scope sentence. A reader met the
 * apparatus and never reached the evidence.
 *
 * The roots stay exactly as they are and keep every value; they move below
 * the Decision and open on request. Native `<details>` rather than a Base UI
 * Collapsible, because Base UI keeps closed content out of the DOM, and a
 * root a reader cannot find with the browser's own search is not disclosed,
 * it is deleted. */
export function ProposedStatePreviewSection({ preview }: { preview: ProposedStatePreview }) {
  const copy = previewStateCopy[preview.state];
  return (
    <Disclosure
      className="mt-10 rounded-xl bg-muted/25 px-5 py-5 sm:px-6"
      summaryClassName="items-baseline focus-visible:outline-offset-4"
      meta={<span className="font-mono text-micro">{preview.state.replaceAll("_", " ")}</span>}
      chevron={false}
      summary={
        <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <span>
            <span className="block text-eyebrow text-muted-foreground">Authority effect · none</span>
            {/* An `h2` inside the summary rather than beside it: `details`
                exposes no role that takes an accessible name, so the
                `aria-labelledby` this replaced was inert, and moving the block
                into a disclosure had dropped it out of the heading outline —
                a screen-reader user navigating by heading could no longer
                reach the roots. */}
            <h2 className="mt-1 text-subtitle">{copy.title}</h2>
          </span>
        </span>
      }
    >
      <p className="mt-3 max-w-[85ch] text-body text-muted-foreground">{copy.detail}</p>

      <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        <PreviewRoot label="Preview root" value={preview.preview_root} />
        <PreviewRoot label="Base revision" value={preview.base.revision_root} />
        <div className="min-w-0">
          <dt className="text-eyebrow text-muted-foreground">Base Git commit</dt>
          <dd className="mt-1"><RecordId value={preview.base.git_commit} /></dd>
        </div>
        <PreviewRoot label="Base Repository root" value={preview.base.repository_root} />
        {preview.entry_root ? <PreviewRoot label="Decision Inbox entry" value={preview.entry_root} /> : null}
        {preview.predictions ? <>
          <PreviewRoot label="If accepted" value={preview.predictions.if_accept_repository_root} />
          <PreviewRoot label="If rejected" value={preview.predictions.if_reject_repository_root} />
        </> : null}
        {preview.terminal ? <>
          <div className="min-w-0">
            <dt className="text-eyebrow text-muted-foreground">Terminal Git commit</dt>
            <dd className="mt-1"><RecordId value={preview.terminal.git_commit} /></dd>
          </div>
          <PreviewRoot label="Terminal Repository root" value={preview.terminal.repository_root} />
        </> : null}
      </dl>

      {preview.blocker ? (
        <p className="mt-5 max-w-[85ch] text-compact text-muted-foreground">
          <span className="font-mono text-status-conflict">{preview.blocker.code}</span>
          {" · "}{preview.blocker.detail}
        </p>
      ) : null}
      {preview.terminal?.applied_exactly_as_reviewed === true ? (
        <p className="mt-5 text-compact">Applied exactly as reviewed: the predicted and actual Repository roots are identical.</p>
      ) : null}
    </Disclosure>
  );
}

/* What a Decision would change, before anyone makes one.
 *
 * `reviews.decision_packet` has been projected all along and read by nothing.
 * It carries, per pending Proposal, the protocol gate and its blockers, the
 * standing transition proposed, and the accepted-Claim set the repository would
 * hold under each of accept and reject — so the product could always have shown
 * a reader what turns on the Decision, and instead showed the Proposal's status
 * word and left the consequence to be imagined.
 *
 * This is the shape GitHub puts above a merge button, with one difference that
 * is the whole point: GitHub's box states a policy ("At least 1 approving
 * review is required"), and this one states retained arithmetic. Every number
 * here was computed by the emitter over the repository's own accepted set.
 *
 * IT RENDERS ON NOTHING TODAY. The projection nulls `decision_packet` for every
 * terminal Proposal and asserts it is present only while `status` is
 * `pending_review`; the current release has 18 Proposals and all 18 are
 * accepted. The component is covered by a fixture rather than by live data, and
 * it lights up the first time a Proposal is open. */

function Delta({ label, count, before }: { label: string; count: number; before: number }) {
  const change = count - before;
  return (
    <div className="min-w-0">
      <dt className="text-eyebrow text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-body tabular-nums">
        {count.toLocaleString()}
        {change === 0 ? (
          <span className="ml-1.5 text-micro text-muted-foreground">unchanged</span>
        ) : (
          <span className="ml-1.5 text-micro text-muted-foreground">
            {change > 0 ? "+" : "−"}{Math.abs(change).toLocaleString()}
          </span>
        )}
      </dd>
    </div>
  );
}

export function DecisionBoundary({ packet }: { packet: DecisionPacketSummary }) {
  const { readiness, standing_delta: delta, next_obligation: next } = packet;
  const counts = delta.counts.global_accepted_claims;
  const blocked = readiness.protocol_gate === "blocked";

  return (
    <section className="mt-10" aria-labelledby="boundary-heading">
      <h2 id="boundary-heading" className="mb-1 text-subtitle">If this is decided</h2>
      {/* Said once, plainly, because it is the product's central claim and the
          one thing a passing verifier must never be read as having done. */}
      <p className="max-w-[85ch] text-body text-muted-foreground">
        No check below decides anything. Only an authorized, attributed Decision by
        repository authority moves a Claim&rsquo;s Standing, and these are the
        two repositories it would choose between.
      </p>

      <Alert className="mt-4" variant={blocked ? "destructive" : "default"}>
        <AlertTitle>
          {blocked ? "Protocol gate blocked" : "Protocol gate satisfied"}
          {readiness.rejection_available ? null : " · rejection unavailable"}
        </AlertTitle>
        <AlertDescription>
          {blocked
            ? "The protocol refuses this transition until every blocker below is cleared. A Decision to accept cannot be recorded in this state."
            : "The protocol permits this transition. Whether it happens is an attributed ruling, not a consequence of the gate opening."}
        </AlertDescription>
      </Alert>

      {readiness.blockers.length ? (
        <ul className="mt-4 grid gap-2">
          {readiness.blockers.map((blocker) => (
            <li
              key={`${blocker.code}:${blocker.subject}`}
              className="rounded-md bg-destructive/5 px-3 py-2.5"
            >
              <p className="flex flex-wrap items-baseline gap-x-2 text-compact">
                <span className="font-mono text-micro text-status-conflict">{blocker.code}</span>
                <span className="min-w-0 break-words">{blocker.detail}</span>
              </p>
              <p className="mt-0.5 text-micro text-muted-foreground">
                <RecordId value={blocker.subject} prefix={16} copy={false} />
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-6 text-compact">
        <span className="text-muted-foreground">Transition</span>{" "}
        <span className="font-mono">{delta.transition}</span>
        {delta.scope ? (
          <>
            {" on "}
            <RecordId value={delta.scope.target_claim_id} prefix={16} copy={false} />
            {delta.scope.affected_claim_ids.length > 1 ? (
              <span className="text-muted-foreground">
                {" "}and {(delta.scope.affected_claim_ids.length - 1).toLocaleString()} other
                {delta.scope.affected_claim_ids.length === 2 ? "" : "s"}
              </span>
            ) : null}
          </>
        ) : null}
      </p>

      {/* Three columns, not two: a reader comparing accept against reject needs
          the number it is currently at, or both outcomes read as arbitrary. */}
      <dl className="mt-4 grid grid-cols-1 gap-4 rounded-lg bg-muted/30 p-4 sm:grid-cols-3">
        <Delta label="Accepted Claims now" count={counts.before} before={counts.before} />
        <Delta label="If accepted" count={counts.if_accept} before={counts.before} />
        <Delta label="If rejected" count={counts.if_reject} before={counts.before} />
      </dl>

      <dl className="mt-6 grid gap-1.5">
        {/* Labelled distinctly from the counts above. Both blocks said "If
            accepted" and "If rejected", so the page used one pair of words for
            two different things one screen apart. */}
        {[
          ["Obligation now", next.now],
          ["Obligation if accepted", next.if_accept],
          ["Obligation if rejected", next.if_reject],
        ].map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 rounded-md bg-muted/25 px-3 py-2.5 sm:grid-cols-3 sm:gap-4"
          >
            <dt className="text-meta text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-compact sm:col-span-2">{value}</dd>
          </div>
        ))}
      </dl>

      {packet.limits.length ? (
        <>
          <h3 className="mt-6 text-eyebrow text-muted-foreground">What this packet does not establish</h3>
          <ul className="mt-2 space-y-1">
            {packet.limits.map((limit) => (
              <li key={limit} className="max-w-[85ch] text-compact text-muted-foreground">{limit}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

/* One sentence naming the exact transition proposed, for every Proposal rather
   than only a pending one. A GitHub pull request opens with "X wants to merge 1
   commit into canary from Y" — a reader knows what is on the table before
   reading anything else. This page opened with the Claim's text and two status
   badges, which say where the Proposal sits without ever saying what it does. */
export function ProposedTransition({
  review,
  repositoryName,
  commit,
}: {
  review: ReviewSummary;
  repositoryName: string;
  commit: string;
}) {
  const producer = review.producer_package_id;
  return (
    <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-compact text-muted-foreground">
      {producer ? <RecordId value={producer} prefix={14} copy={false} /> : <span>An unrecorded producer package</span>}
      <span>proposes</span>
      <span className="font-mono text-foreground">{review.kind}</span>
      <span>on</span>
      {/* The one reference on this page that names a record the reader cannot
          see. Hovering says what the Claim asserts and where its Standing is,
          without leaving the Proposal. */}
      <RecordPreview id={review.target}>
        <RecordId value={review.target} prefix={14} copy={false} />
      </RecordPreview>
      <span>into {repositoryName} at</span>
      <span className="font-mono">{commit.slice(0, 12)}</span>
    </p>
  );
}
