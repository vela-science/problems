import type { ReviewSummary } from "@vela/projection-data";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { RecordId } from "@/components/vela/record-id";
import { ReviewProvenance } from "@/components/vela/review-provenance";
import { formatDate } from "@/lib/format";

/* What was asked, what was checked, and what the check refuses to establish.
 *
 * All three have been in the projection since the Verification Record was
 * written and none has been on a screen. The product's whole argument is that a
 * passing verifier is not an acceptance, and the verifier itself says so, in
 * its own words, per record. Printing those words is a stronger statement of it
 * than any sentence this repository could write above the ledger — and it is
 * checkable, which an authored explanation is not.
 *
 * The scope sentence sits beside the Claim on the record page on purpose. On
 * `vpr_a8f8cb7709e55c5f` the Claim says a 307-tile family and the verifier says
 * it replayed a 306-tile checker: a real, retained discrepancy that a reader
 * can only find when the two sentences are in one viewport. */

export function ProposalEvidence({ review }: { review: ReviewSummary }) {
  const records = review.verification_records ?? [];
  const requirements = review.producer_package?.verification_requirements ?? [];
  const producer = review.producer_package?.producer_actor;
  const limits = [...new Set(records.flatMap((record) => record.does_not_establish ?? []))];

  return (
    <section aria-labelledby="evidence-heading">
      <h2 id="evidence-heading" className="mb-3 text-subtitle">Evidence</h2>

      {requirements.length ? (
        <div className="mb-6">
          <h3 className="text-eyebrow uppercase text-muted-foreground">Declared by the producer</h3>
          <ol className="mt-1.5 max-w-[85ch] list-decimal space-y-1.5 pl-5 text-compact">
            {requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}
          </ol>
        </div>
      ) : null}

      {records.length ? (
        <ItemGroup className="divide-y">
          {records.map((record) => {
            const independent = record.independent_of ?? [];
            const shared = record.shared_dependencies ?? [];
            return (
              <Item
                key={record.verification_record_id}
                data-verification-record-id={record.verification_record_id}
                className="items-start rounded-none px-0 py-4"
              >
                <ItemContent className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ItemTitle>Verification Record</ItemTitle>
                    <StatusBadge state={record.outcome}>verification {record.outcome}</StatusBadge>
                  </div>
                  {record.property ? (
                    <ItemDescription className="mt-1 line-clamp-none max-w-[85ch] text-compact text-foreground">
                      {record.property}
                    </ItemDescription>
                  ) : null}
                  <div className="mt-2">
                    <ReviewProvenance record={record} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-muted-foreground">
                    <span>{formatDate(record.completed_at)}</span>
                    <RecordId value={record.verification_record_id} />
                  </div>
                  <p className="mt-1 text-micro text-muted-foreground">
                    {independent.length
                      ? `Declared independent of ${independent.join(", ")}.`
                      : shared.length
                        ? "Declared independent of nothing."
                        : "No independence declared."}
                    {producer ? ` Produced by ${producer}.` : ""}
                  </p>
                  {/* The declaration's other half. A record naming what it
                      shares with the producer is making the more informative
                      statement of the two, and dropping it let the surface
                      read as though independence were simply unaddressed.
                      Verbatim, and counted, because a reader weighing a Check
                      needs the specific dependency rather than a summary. */}
                  {shared.length ? (
                    <div className="mt-1">
                      <p className="text-micro text-muted-foreground">
                        {shared.length === 1 ? "Discloses one shared dependency" : `Discloses ${shared.length} shared dependencies`} with the work it checks:
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-micro text-muted-foreground">
                        {shared.map((dependency) => <li key={dependency}>{dependency}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </ItemContent>
              </Item>
            );
          })}
        </ItemGroup>
      ) : (
        <p className="max-w-[85ch] text-compact text-muted-foreground">
          No Verification Record is retained for this Proposal.
        </p>
      )}

      {limits.length ? (
        <div className="mt-6">
          <h3 className="text-eyebrow uppercase text-muted-foreground">Not established</h3>
          {/* A verifier wrote these, so they read as prose. A badge or a colour
              here would turn a scope statement into a status. */}
          <ul className="mt-1.5 max-w-[85ch] list-disc space-y-1.5 pl-5 text-compact text-muted-foreground">
            {limits.map((limit) => <li key={limit}>{limit}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
