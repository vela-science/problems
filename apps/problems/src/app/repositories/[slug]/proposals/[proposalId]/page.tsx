import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repositoryBySlug, reviewVerification, type ReviewSummary } from "@vela/projection-data";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { AssertionText } from "@/components/vela/assertion-text";
import { WorkSessionRef } from "@/components/vela/work-session-ref";
import { ProposalEvidence } from "@/components/vela/proposal-evidence";
import { ProposalObjectChain } from "@/components/vela/proposal-object-chain";
import { RecordFacts, type RecordFact } from "@/components/vela/record-facts";
import { RecordHeader } from "@/components/vela/record-header";
import { DecisionBoundary, ProposedStatePreviewSection, ProposedTransition } from "@/components/vela/decision-boundary";
import { RecordId } from "@/components/vela/record-id";
import { decisionLabel, proposalTimings, WITHDRAWAL_NOTE, verificationOutcomeCounts } from "@/components/vela/proposal-ledger";
import { parseCodeParameters, parseSweepWindow } from "@/lib/claim-shape";
import { formatDate } from "@/lib/format";
import { recordTitle } from "@/lib/product-language";

/* A Proposal is a record, so it gets a record's URL.
 *
 * `?proposal=` opened a Sheet over the ledger: nothing to send a colleague,
 * nothing a crawler reaches, and everything the Sheet held was behind a click.
 *
 * The preamble is the one every per-record route in this application uses.
 * `scripts/check-budgets.mjs` fails a build whose prerender puts per-record
 * pages on disk, and eighteen Proposals clearing today's count is not the same
 * as the route being allowed to go static. */
export const dynamicParams = true;
export const dynamic = "force-static";
export const revalidate = false;
export function generateStaticParams() { return []; }

async function proposalRecord(slug: string, proposalId: string) {
  const repository = await repositoryBySlug(slug);
  const review = repository?.reviews.find((entry) => entry.proposal_id === proposalId);
  return repository && review ? { repository, review } : undefined;
}

export async function generateMetadata({ params }: PageProps<"/repositories/[slug]/proposals/[proposalId]">): Promise<Metadata> {
  const { slug, proposalId } = await params;
  const record = await proposalRecord(slug, proposalId);
  return record ? {
    title: recordTitle({ id: record.review.proposal_id, assertion: record.review.claim }),
    description: record.review.claim || record.review.target,
    alternates: { canonical: `/repositories/${slug}/proposals/${proposalId}` },
  } : {};
}

/* The parameters the assertion states, as values. Absent where the sentence is
   of another shape — an empty row would say the Proposal has no shape, which is
   a different fact from this reader being unable to read one. */
function shapeFacts(review: ReviewSummary): RecordFact[] {
  const window = parseSweepWindow(review.claim);
  if (window) {
    return [
      { label: "Window", value: <span className="font-mono tabular-nums">{window.lo}..{window.hi}</span> },
      { label: "Primes", value: <span className="font-mono tabular-nums">{window.primes}</span> },
      { label: "Max multiplicity", value: <span className="font-mono tabular-nums">{window.multiplicity}</span> },
      { label: "Argmax p", value: <span className="font-mono tabular-nums">{window.argmax}</span> },
      { label: "Residue", value: <span className="font-mono tabular-nums">{window.residue}</span> },
    ];
  }
  const code = parseCodeParameters(review.claim);
  if (code) {
    return [
      { label: "Code", value: <span className="font-mono text-title tabular-nums">[[{code.n},{code.k},{code.d}]]</span> },
      { label: "Parameters", value: <span className="font-mono tabular-nums">n = {code.n} · k = {code.k} · d = {code.d}</span> },
    ];
  }
  return [];
}


export default async function ProposalPage({ params }: PageProps<"/repositories/[slug]/proposals/[proposalId]">) {
  const { slug, proposalId } = await params;
  const record = await proposalRecord(slug, proposalId);
  if (!record) notFound();
  const { repository, review } = record;
  const shape = shapeFacts(review);
  const verification = reviewVerification(review);
  const outcomeCounts = verificationOutcomeCounts(review);
  const { passedIn, decidedIn, withdrawn } = proposalTimings(review);
  const pending = review.status === "pending_review";

  return (
    <PageShell archetype="reading" layout="reading">
      <RecordHeader
        kind="Proposal"
        titleForm="statement"
        title={<AssertionText text={review.claim || review.target} />}
        /* Two axes, two badges, each carrying the word for its own axis. */
        state={<>
          <StatusBadge axis="proposal" state={review.status}>Proposal {review.status.replaceAll("_", " ")}</StatusBadge>
          {outcomeCounts.length ? outcomeCounts.map(({ outcome, count }) => (
            <StatusBadge key={outcome} axis="verification" state={outcome}>
              {count} Verification {count === 1 ? "Record" : "Records"}: {outcome.replaceAll("_", " ")}
            </StatusBadge>
          )) : <StatusBadge axis="verification" state={verification}>verification {verification.replaceAll("_", " ")}</StatusBadge>}
          {/* Two axes, both true at once. The Proposal was accepted and stays
              accepted — the Decision was made and nothing undoes it — and the
              Claim it admitted has since been retired by a correction. A
              surface that showed only the first would tell a reader this Claim
              stands. */}
          {review.claim_retirement
            ? <StatusBadge state={review.claim_retirement}>Claim {review.claim_retirement}</StatusBadge>
            : null}
        </>}
        provenance={<>
          <span>{repository.status.repository.name}</span>
          <span>{review.kind.replaceAll(".", " ")}</span>
          <span>recorded {formatDate(review.created_at)}</span>
          {/* The badge says a correction retired this Claim; this says which
              one, and links to it. Naming the successor is what lets a reader
              follow the correction forward instead of learning only that
              something replaced this. */}
          {review.retired_by_claim_id ? (
            <span>
              {review.claim_retirement} by{" "}
              <Link
                className="font-mono underline underline-offset-2 hover:text-foreground"
                href={`/repositories/${slug}/claims/${review.retired_by_claim_id}`}
              >
                {review.retired_by_claim_id.slice(0, 20)}…
              </Link>
            </span>
          ) : null}
        </>}
      />

      <ProposedTransition
        review={review}
        repositoryName={repository.status.repository.name}
        commit={repository.source.commit}
      />

      {shape.length ? (
        <section className="mt-8" aria-labelledby="shape-heading">
          <h2 id="shape-heading" className="mb-1 text-eyebrow text-muted-foreground">Stated parameters</h2>
          <RecordFacts className="max-w-2xl" facts={shape} />
        </section>
      ) : null}

      <div className="mt-8">
        <ProposalEvidence review={review} />
      </div>

      {review.decision_packet ? <DecisionBoundary packet={review.decision_packet} /> : null}

      <section className="mt-10" aria-labelledby="decision-heading">
        <h2 id="decision-heading" className="mb-3 text-subtitle">
          {withdrawn ? "Producer withdrawal" : pending ? "Awaiting Decision" : decisionLabel(review)}
        </h2>
        <p className="max-w-[85ch] text-body">
          {withdrawn
            ? WITHDRAWAL_NOTE
            : pending
              ? "No Decision has been recorded."
              : review.decision_reason || "No Decision reason is retained."}
        </p>
        {!pending ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-muted-foreground">
            <span>{withdrawn ? "Withdrawn by producer" : review.decision_provenance.replaceAll("_", " ")}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(review.reviewed_at)}</span>
            {review.reviewed_by ? (
              <>
                <span aria-hidden>·</span>
                <RecordId value={review.reviewed_by} prefix={26} />
              </>
            ) : null}
            {review.decision_session_ref ? (
              <>
                <span aria-hidden>·</span>
                <WorkSessionRef reference={review.decision_session_ref} />
              </>
            ) : null}
            {review.decision_authority_principal_id ? (
              <>
                <span aria-hidden>·</span>
                <span>Repository authority</span>
                <RecordId value={review.decision_authority_principal_id} prefix={22} />
              </>
            ) : null}
            {passedIn ? <><span aria-hidden>·</span><span>first pass reported in {passedIn}</span></> : null}
            {decidedIn && !withdrawn ? <><span aria-hidden>·</span><span>Decision recorded in {decidedIn}</span></> : null}
            {review.applied_event_id ? (
              <>
                <span aria-hidden>·</span>
                <span>applied as</span>
                <RecordId value={review.applied_event_id} />
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* The roots follow the evidence and the Decision rather than leading
          the page. What a reader needs first is what was claimed, who checked
          it and what the Decision covered; the exact preview is how they
          verify that afterwards. */}
      {review.proposed_state_preview
        ? <ProposedStatePreviewSection preview={review.proposed_state_preview} />
        : null}

      <section className="mt-10" aria-labelledby="objects-heading">
        <h2 id="objects-heading" className="mb-3 text-subtitle">Exact records</h2>
        <ProposalObjectChain
          review={review}
          proposalRoot={review.proposed_state_preview?.inputs?.proposal_root ?? null}
        />
      </section>
    </PageShell>
  );
}
