import { currentReview } from "@/components/vela/problem-provenance";
import { exactResultLimitation } from "@/components/vela/problem-overview-reference";
import { resolveProblemStatement, statementParagraphs } from "@/lib/problem-statement";
import type { ReachStop } from "@/components/vela/reach";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* The reach axis, defined once.
 *
 * Overview and Work both answer "how far has this record travelled", and a
 * second copy of the derivation is how the two would drift into disagreeing
 * about the same Problem. The stages are facts the projection holds, in the
 * order a record acquires them; none of them is inferred from another. */
export function problemReachStops(state: State): ReachStop[] {
  const { question } = statementParagraphs(resolveProblemStatement(state));
  const formal = state.sources?.occurrences?.filter((occurrence) => occurrence.formal) ?? [];
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  return [
    { label: "Source", reached: true, detail: state.problem.source_id.replace(/^source:/u, "") },
    { label: "Statement", reached: Boolean(question), detail: question ? "Retained" : "Not retained" },
    { label: "Formal", reached: formal.length > 0, detail: formal.length ? `${formal.length} retained` : "None associated" },
    { label: "Work", reached: checks.length > 0, detail: checks.length ? `${checks.length} check${checks.length === 1 ? "" : "s"}` : "None recorded" },
    { label: "Decision", reached: Boolean(review), detail: review ? (review.status?.replaceAll("_", " ") || "Recorded") : "None here" },
  ];
}

/* Why the track stops where it does. Three readings, and none of them claims
   the question was reached: the accepted Claim that reaches its question is a
   Problem this product would no longer call open. */
export function problemReachCaption(state: State): string {
  const review = currentReview(state);
  if (!review) return "No Repository has decided on this question here, so the record stops short of it.";
  const current = (state.claims ?? []).find((claim) => claim.id === state.currentClaimId) ?? null;
  const limitation = current ? exactResultLimitation(current.assertion) : null;
  return limitation
    ? "The accepted scope sits inside the question, and does not reach it."
    : "The accepted Claim records no limitation on its own scope, so this page cannot say how far it reaches.";
}
