import Link from "next/link";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { Attribution, AttributionLimits, DecisionAttribution } from "@/components/vela/attribution";
import { RecordId } from "@/components/vela/record-id";
import { formatDate } from "@/lib/format";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;
type Review = State["reviews"][number];

/* Who or what produced and checked what this Problem currently holds.
 *
 * Every fact below was already retained and rendered only on
 * `/repositories/{slug}/proposals/{id}`, which is not a page a reader reaches
 * from a Problem. So the Problem page could show an accepted Claim while the
 * producer, the verifiers, their declared independence, and the Decision's own
 * scope sentence all sat one unlinked route away.
 *
 * The order is the protocol's: a producer submits, a scoped check reports, an
 * authorised Decision rules. Rendering it as a sequence is what makes "a
 * passing verifier is not an acceptance" legible without a disclaimer line,
 * because the reader watches the three happen to different actors. */

/* Which contribution is the current one.
 *
 * By timestamp, a Proposal withdrawn or opened after the accepted one would
 * take the headline and read as the current result. Standing is what makes a
 * contribution current, so the accepted review whose Claim is the Claim this
 * Problem holds is the one; everything else keeps its own status word. */
export function currentReview(state: State): Review | null {
  const current = state.claims.find((claim) => claim.id === state.currentClaimId) ?? state.claims[0];
  if (!current) return null;
  /* Only the accepted review whose Claim is this Problem's Claim. The
     fallback here used to be `accepted[0]`, which handed an unrelated accepted
     Proposal the heading "Latest contribution and reviews" and the caption
     "Supports the Claim this Problem currently holds" — presenting its
     producer, verifiers, limits and Decision reason as the provenance of a
     Claim it has nothing to do with. Two accepted Proposals for different
     Claims, or any drift in assertion text, was enough. When nothing matches
     the honest answer is nothing. */
  return state.reviews.find(
    (review) => review.status === "accepted" && review.claim === current.assertion,
  ) ?? null;
}

function ChecksFor({ review, producer }: { review: Review; producer?: string | null }) {
  const records = review.verification_records ?? [];
  if (!records.length) {
    return <p className="max-w-[85ch] text-compact text-muted-foreground">
      No scoped Verification Record is retained for this contribution.
    </p>;
  }
  return <ItemGroup className="divide-y">
    {records.map((record) => (
      <Item
        key={record.verification_record_id}
        data-verification-record-id={record.verification_record_id}
        className="items-start rounded-none px-0 py-4"
      >
        <ItemContent className="min-w-0 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ItemTitle>{record.property ?? "Scoped verification"}</ItemTitle>
            <StatusBadge axis="verification" state={record.outcome}>verification {record.outcome.replaceAll("_", " ")}</StatusBadge>
          </div>
          <Attribution record={record} producer={producer} />
          <ItemDescription className="line-clamp-none flex flex-wrap items-center gap-x-3 gap-y-1 text-micro">
            <span>{formatDate(record.completed_at)}</span>
            <RecordId value={record.verification_record_id} />
          </ItemDescription>
        </ItemContent>
      </Item>
    ))}
  </ItemGroup>;
}

export function ProblemProvenance({ state }: { state: State }) {
  const current = currentReview(state);
  const others = state.reviews.filter((review) => review !== current);
  const producer = current?.producer_package?.producer_actor ?? null;
  const requirements: string[] = current?.producer_package?.verification_requirements ?? [];
  const limits = [...new Set((current?.verification_records ?? []).flatMap((record) => record.does_not_establish ?? []))];

  return <section aria-labelledby="provenance-heading" className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h2 id="provenance-heading" className="text-title">Latest contribution and reviews</h2>
      {current ? <span className="text-meta text-muted-foreground">Supports the Claim this Problem currently holds</span> : null}
    </div>

    {!current ? (
      <p className="max-w-[85ch] text-body text-muted-foreground">
        No accepted contribution is retained for this Problem.
      </p>
    ) : (
      <>
        <div>
          <h3 className="text-eyebrow uppercase text-muted-foreground">Produced by</h3>
          <p className="mt-1.5 max-w-[85ch] text-compact">
            {producer
              ? <>Authenticated producer input from <span className="font-medium">{producer}</span>. It does not check or accept the Assertion.</>
              : "This contribution's producer identity is not retained."}
          </p>
          {requirements.length ? (
            <>
              <p className="mt-3 text-eyebrow uppercase text-muted-foreground">Verification the producer declared necessary</p>
              <ol className="mt-1.5 max-w-[85ch] list-decimal space-y-1.5 pl-5 text-compact">
                {requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}
              </ol>
            </>
          ) : null}
        </div>

        <div>
          <h3 className="text-eyebrow uppercase text-muted-foreground">Checked by</h3>
          <div className="mt-1.5"><ChecksFor review={current} producer={producer} /></div>
        </div>

        <AttributionLimits limits={limits} heading="Not established by these checks" />

        <div>
          <h3 className="text-eyebrow uppercase text-muted-foreground">Decided by</h3>
          {current.decision_provenance === "pending" ? (
            <p className="mt-1.5 max-w-[85ch] text-compact text-muted-foreground">
              No Decision is retained for this contribution. Checks and source labels do not fill that role.
            </p>
          ) : (
            <div className="mt-1.5 space-y-2">
              <DecisionAttribution review={current} />
              {current.decision_reason ? (
                <p className="max-w-[85ch] text-compact">{current.decision_reason}</p>
              ) : (
                <p className="max-w-[85ch] text-compact text-muted-foreground">A Decision is retained without a projected reason.</p>
              )}
            </div>
          )}
          <p className="mt-3 text-meta">
            <Link
              href={`/repositories/${state.repositorySlug}/proposals/${current.proposal_id}`}
              className="underline underline-offset-4"
            >
              Open the proposed change and its exact records
            </Link>
          </p>
        </div>
      </>
    )}

    {/* Everything that is not the current result keeps its own status word, so
        a withdrawal or a pending review cannot be read as what stands now. */}
    {others.length ? (
      <div>
        <h3 className="text-eyebrow uppercase text-muted-foreground">
          {current
            ? others.length === 1 ? "One other proposed change" : `${others.length} other proposed changes`
            : others.length === 1 ? "One proposed change" : `${others.length} proposed changes`}
        </h3>
        <ul className="mt-1.5 space-y-1.5 text-compact">
          {others.map((review) => (
            <li key={review.proposal_id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <StatusBadge axis="proposal" state={review.status}>{review.status.replaceAll("_", " ")}</StatusBadge>
              <Link
                href={`/repositories/${state.repositorySlug}/proposals/${review.proposal_id}`}
                className="min-w-0 underline underline-offset-4"
              >
                <RecordId value={review.proposal_id} copy={false} />
              </Link>
              <span className="text-micro text-muted-foreground">{formatDate(review.reviewed_at ?? review.created_at)}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
  </section>;
}
