import { AssertionText } from "@/components/vela/assertion-text";
import { currentReview } from "@/components/vela/problem-provenance";
import { formatDate } from "@/lib/format";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* The Problem's own state, one public axis with its basis stated beside it.
 * Repository-local Standing is deliberately absent here: it governs exact
 * Contributions and renders on them under Evidence. This word is about the
 * Problem, and its derivation is from facts the page already shows:
 *
 *   Contested  a Contribution here was corrected, superseded, or retracted,
 *              or current Contributions disagree
 *   Resolved   the source itself declares the problem solved or disproved
 *   Partial    the source leaves it open and a Contribution is accepted here
 *   Open       the source leaves it open and nothing is accepted here
 */
export type ProblemPublicState = {
  word: "Open" | "Partial" | "Resolved" | "Contested";
  basis: string;
};

export function problemPublicState(state: State): ProblemPublicState {
  const standings: string[] = (state.claims ?? []).map((claim) => claim.standing);
  const disturbed = standings.some((standing) => ["corrected", "superseded", "retracted"].includes(standing));
  const accepted = standings.some((standing) => standing === "accepted" || standing === "accepted_with_conditions");
  const declared = state.problem.declared_status?.toLowerCase() ?? "";
  const sourceResolved = ["solved", "proved", "disproved"].some((word) => declared.includes(word));
  if (disturbed && new Set(standings).size > 1) return { word: "Contested", basis: "a Contribution here was corrected or withdrawn" };
  if (sourceResolved) return { word: "Resolved", basis: "per the source's own declaration" };
  if (accepted) return { word: "Partial", basis: "open per source; bounded results accepted here" };
  return { word: "Open", basis: "per the source's own declaration" };
}

const STATE_DOT: Record<ProblemPublicState["word"], string> = {
  Open: "bg-muted-foreground/50",
  Partial: "bg-status-evidence",
  Resolved: "bg-status-progress",
  Contested: "bg-status-caution",
};

/* Header facts a first-time visitor can parse before learning the protocol:
 * what state the Problem is in, what is currently understood, how strong the
 * checking is, and when it last changed. Each cell is one line derived from
 * loaded data; the detail lives one tab away. */
export function ProblemAnswerStrip({ state }: { state: State }) {
  const review = currentReview(state);
  const publicState = problemPublicState(state);
  const current = state.claims.find((claim) => claim.id === state.currentClaimId) ?? state.claims[0] ?? null;
  const records = review?.verification_records ?? [];
  const understanding = current
    ? <AssertionText text={current.assertion} />
    : publicState.word === "Resolved"
      ? "The source records a solution; no Contribution here reflects it yet."
      : "No Contribution to this Problem has been accepted here.";
  const evidence = review
    ? `${records.length || "No"} scoped verification ${records.length === 1 ? "pass" : "passes"}${state.sourceAudits.length ? " · source publishes its own audit" : ""}`
    : state.claims.length
      ? "No Verification Record is retained for the current Contribution"
      : state.sourceAudits.length
        ? "Source publishes its own audit; nothing checked here"
        : "Nothing checked by this Repository";
  const updated = review?.reviewed_at ?? review?.created_at ?? state.problem.local_assessed_at ?? null;
  return <dl className="mt-6 grid gap-x-6 gap-y-4 border-y py-4 text-meta sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1fr)_auto]">
    <div className="min-w-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">Problem state</dt>
      <dd className="mt-1.5">
        <span className="inline-flex items-center gap-2 text-label font-medium"><span aria-hidden className={`size-2 rounded-full ${STATE_DOT[publicState.word]}`} />{publicState.word}</span>
        <span className="mt-1 block text-micro text-muted-foreground">{publicState.basis}</span>
      </dd>
    </div>
    <div className="min-w-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">Current understanding</dt>
      <dd className="mt-1.5 line-clamp-3 text-compact [overflow-wrap:anywhere]">{understanding}</dd>
    </div>
    <div className="min-w-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">Evidence</dt>
      <dd className="mt-1.5 text-compact">{evidence}</dd>
    </div>
    <div className="min-w-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">Updated</dt>
      <dd className="mt-1.5 text-compact tabular-nums">{updated ? formatDate(updated) : "No local change recorded"}</dd>
    </div>
  </dl>;
}
