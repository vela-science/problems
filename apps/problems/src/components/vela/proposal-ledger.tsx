import Link from "next/link";
import type { ReviewSummary } from "@vela/projection-data";
import { Item, ItemContent, ItemGroup } from "@vela/ui/components/item";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import type { ProposalStatus } from "@vela/ui/vela/state-glyph";
import { RecordId } from "@/components/vela/record-id";
import { WorkSessionRef } from "@/components/vela/work-session-ref";
import { formatDate, formatElapsed } from "@/lib/format";

/* The Proposal ledger, with the evidence in the row.
 *
 * Until now a row said what was decided and when. What a verifier actually
 * checked, what it explicitly refused to establish, and whether it declared
 * independence from the producer all sat behind a Sheet, a tab and a
 * disclosure — three interactions from a reader who came to the page for
 * exactly that. The projection retains all of it, so it is printed.
 *
 * The two durations are the page's other finding. Both are differences of
 * timestamps already on the row: producer to first passing check, and producer
 * to Decision. Stating both as numbers beside the dates they came from costs a
 * line, where an axis over elapsed time would have cost a whole figure to say
 * the same thing about process rather than mathematics. The intervals describe
 * roles in this exact record; they do not rank human and agent performers. */

export function proposalStatus(status: string): ProposalStatus {
  switch (status) {
    case "accepted":
    case "rejected":
    case "withdrawn":
      return status;
    default:
      return "pending_review";
  }
}

function decisionLabel(review: ReviewSummary): string {
  if (review.decision_actor_class === "agent") return "Agent Decision";
  if (review.decision_actor_class === "human") return "Human Decision";
  return "Attributed Decision";
}

export type VerificationOutcomeCount = { outcome: string; count: number };

export function verificationOutcomeCounts(review: ReviewSummary): VerificationOutcomeCount[] {
  const counts = new Map<string, number>();
  for (const record of review.verification_records ?? []) {
    counts.set(record.outcome, (counts.get(record.outcome) ?? 0) + 1);
  }
  return [...counts].map(([outcome, count]) => ({ outcome, count }));
}

function independenceSummary(
  records: NonNullable<ReviewSummary["verification_records"]>,
): string {
  const declaring = records.filter((record) => (record.independent_of ?? []).length);
  if (!declaring.length) return "no independence declared";
  const actors = [...new Set(records.flatMap((record) => record.independent_of ?? []))].sort();
  const named = `declared independent of ${actors.join(", ")}`;
  /* One Formal Conjectures Proposal has a verifier that declared none beside
     one that did. Reporting only the union would erase the first. */
  return declaring.length === records.length
    ? named
    : `${named} on ${declaring.length} of ${records.length} records`;
}

export function evidenceLine(review: ReviewSummary): string {
  const records = review.verification_records ?? [];
  if (!records.length) return "No Verification Record is retained.";
  const limits = records.reduce((total, record) => total + (record.does_not_establish?.length ?? 0), 0);
  return [
    `${records.length} Verification ${records.length === 1 ? "Record" : "Records"}`,
    independenceSummary(records),
    limits ? `${limits} stated ${limits === 1 ? "limit" : "limits"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/* The producer's own submission time is not retained on every row, so the
   Proposal's creation is the common origin both durations are measured from. */
export function timingLine(review: ReviewSummary): string | null {
  const passed = (review.verification_records ?? [])
    .filter((record) => record.outcome === "pass" && record.completed_at)
    .map((record) => record.completed_at!)
    .sort();
  const passedIn = formatElapsed(review.created_at, passed[0] ?? null);
  const decided = formatElapsed(review.created_at, review.reviewed_at);
  const withdrawn = review.decision_provenance === "producer_withdrawal";
  const parts = [
    passedIn ? `first pass reported in ${passedIn}` : null,
    decided && !withdrawn ? `Decision recorded in ${decided}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function ProposalLedger({
  slug,
  reviews,
}: {
  slug: string;
  reviews: ReviewSummary[];
}) {
  return (
    <ItemGroup className="divide-y">
      {reviews.map((review) => {
        const timing = timingLine(review);
        const outcomes = verificationOutcomeCounts(review);
        const withdrawn = review.decision_provenance === "producer_withdrawal";
        const pending = review.status === "pending_review";
        return (
          <Item
            key={review.proposal_id}
            className="grid items-start rounded-none px-0 py-5 md:grid-cols-[minmax(0,1.5fr)_minmax(12rem,0.85fr)_minmax(12rem,0.85fr)] md:gap-x-6"
          >
            <ItemContent className="min-w-0 gap-2 md:pr-3">
              <p className="text-eyebrow uppercase text-muted-foreground">Proposal</p>
              {/* Only the assertion names the record link. Evidence, actor and
                  Decision text remain outside its accessible name. */}
              <p className="max-w-[72ch] text-body text-foreground">
                <Link
                  className="line-clamp-3 rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/repositories/${slug}/proposals/${encodeURIComponent(review.proposal_id)}`}
                >
                  <ScientificText text={review.claim || review.target} />
                </Link>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge axis="proposal" state={review.status}>
                  Proposal {review.status.replaceAll("_", " ")}
                </StatusBadge>
              </div>
            </ItemContent>

            <ItemContent className="mt-4 min-w-0 gap-2 border-t pt-4 md:mt-0 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <p className="text-eyebrow uppercase text-muted-foreground">Scoped Verification</p>
              {outcomes.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {outcomes.map(({ outcome, count }) => (
                    <StatusBadge key={outcome} axis="verification" state={outcome}>
                      {count} {outcome}
                    </StatusBadge>
                  ))}
                </div>
              ) : (
                <p className="text-compact text-muted-foreground">No Verification Record is retained.</p>
              )}
              {outcomes.length ? <p className="text-micro text-muted-foreground">{evidenceLine(review)}</p> : null}
              {timing?.includes("first pass") ? (
                <p className="text-micro text-muted-foreground">{timing.split(" · ")[0]}</p>
              ) : null}
            </ItemContent>

            <ItemContent className="mt-4 min-w-0 gap-2 border-t pt-4 md:mt-0 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <p className="text-eyebrow uppercase text-muted-foreground">
                {withdrawn ? "Producer withdrawal" : pending ? "Awaiting Decision" : decisionLabel(review)}
              </p>
              <p className="line-clamp-2 max-w-[72ch] text-compact text-foreground">
                {withdrawn
                  ? "Withdrawn by the producer. No repository authority ruled on it."
                  : review.decision_reason ?? (pending ? "No Decision has been recorded." : "No Decision reason is retained.")}
              </p>
              {!pending ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-muted-foreground">
                  <span>{formatDate(review.reviewed_at ?? review.created_at)}</span>
                  {!withdrawn && review.reviewed_by ? <RecordId value={review.reviewed_by} prefix={26} copy={false} /> : null}
                  {!withdrawn && review.decision_session_ref ? <span><WorkSessionRef reference={review.decision_session_ref} prefix={18} /></span> : null}
                  {!withdrawn ? <span>{review.decision_provenance.replaceAll("_", " ")}</span> : null}
                </div>
              ) : null}
              {!pending && !withdrawn && review.decision_authority_principal_id ? (
                <p className="text-micro text-muted-foreground">
                  Repository authority <RecordId value={review.decision_authority_principal_id} prefix={20} copy={false} />
                </p>
              ) : null}
              {timing?.includes("Decision recorded") ? (
                <p className="text-micro text-muted-foreground">{timing.split(" · ").at(-1)}</p>
              ) : null}
            </ItemContent>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
