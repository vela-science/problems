import { RecordId } from "@/components/vela/record-id";
import { ReviewProvenance, type ReviewProvenanceRecord } from "@/components/vela/review-provenance";

/* Who or what performed a check, and what the check declines to establish.
 *
 * Both halves were already retained and both rendered on the Proposal page
 * alone, which is not the page a reader reaches. Extracting them lets the
 * Problem page say the same things in the same words rather than paraphrasing
 * a record.
 *
 * When this was introduced the Proposal page kept its own verbatim copy of
 * both blocks, so the tests passing proved only that the copy still worked —
 * not that the markup was shared. `proposal-evidence.tsx` now imports these,
 * so the two surfaces cannot drift apart without a test moving.
 *
 * Independence is a set of declared facets, not a rank. A verifier declares
 * what it was independent of and what it shared, and those are different axes
 * — actor kind, provider, context, toolchain, evidence — that no single
 * ordering summarises. Ranking them would also make actor kind read as a
 * quality grade, which it is not. */

export interface AttributionRecord extends ReviewProvenanceRecord {
  independent_of?: string[] | null;
  shared_dependencies?: string[] | null;
}

export function Attribution({ record, producer }: { record: AttributionRecord; producer?: string | null }) {
  const independent = record.independent_of ?? [];
  const shared = record.shared_dependencies ?? [];
  return (
    <div className="min-w-0">
      <ReviewProvenance record={record} />
      <p className="mt-1 text-micro text-muted-foreground">
        {independent.length
          ? `Declared independent of ${independent.join(", ")}.`
          : shared.length
            ? "Declared independent of nothing."
            : "No independence declared."}
        {producer ? ` Produced by ${producer}.` : ""}
      </p>
      {/* The declaration's other half. A record naming what it shares with the
          producer is making the more informative statement of the two, and
          dropping it let the surface read as though independence were simply
          unaddressed. Verbatim, and counted, because a reader weighing a Check
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
    </div>
  );
}

/* A verifier wrote these, so they read as prose. A badge or a colour here
   would turn a scope statement into a status. */
export function AttributionLimits({ limits, heading }: { limits: string[]; heading: string }) {
  if (!limits.length) return null;
  return (
    <div>
      <h3 className="text-eyebrow uppercase text-muted-foreground">{heading}</h3>
      <ul className="mt-1.5 max-w-[85ch] list-disc space-y-1.5 pl-5 text-compact text-muted-foreground">
        {limits.map((limit) => <li key={limit}>{limit}</li>)}
      </ul>
    </div>
  );
}

/* The performer of a Decision, kept in the Decision's own words.
 *
 * `decision_actor_class` is provenance and not a rank: an agent Decision and a
 * human Decision are the same act under the same Repository authority, and the
 * interface names which without ordering them. */
export function DecisionAttribution({ review }: {
  review: {
    decision_actor_class?: string | null;
    decision_provenance: string;
    reviewed_by?: string | null;
    decision_authority_principal_id?: string | null;
  };
}) {
  const performer = review.decision_actor_class === "agent"
    ? "Agent Decision"
    : review.decision_actor_class === "human"
      ? "Human Decision"
      : "Attributed Decision";
  return (
    <div className="text-micro text-muted-foreground">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-foreground">{performer}</span>
        <span>· {review.decision_provenance.replaceAll("_", " ")}</span>
        {review.reviewed_by ? <>· performer <RecordId value={review.reviewed_by} prefix={24} copy={false} /></> : null}
      </p>
      {review.decision_authority_principal_id ? (
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2">
          Repository authority <RecordId value={review.decision_authority_principal_id} prefix={24} copy={false} />
        </p>
      ) : null}
    </div>
  );
}
