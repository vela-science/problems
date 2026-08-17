import { standingScopeSentence } from "@/components/vela/problem-facts";
import { currentReview } from "@/components/vela/problem-provenance";
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
  if (accepted) return { word: "Partial", basis: "open per source; scoped results accepted here" };
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
export function ProblemAnswerStrip({ state, basePath }: { state: State; basePath: string }) {
  const review = currentReview(state);
  const publicState = problemPublicState(state);
  const accepted = state.claims.filter((claim) => ["accepted", "accepted_with_conditions"].includes(String(claim.standing)));
  const scope = standingScopeSentence(state);
  const records = review?.verification_records ?? [];
  const understanding = accepted.length
    ? <>{accepted.length} accepted {accepted.length === 1 ? "Contribution" : "Contributions"}.{scope ? ` ${scope}` : ""}</>
    : state.claims.length
      ? `${state.claims.length} retained ${state.claims.length === 1 ? "Contribution" : "Contributions"}; none is currently accepted.`
    : publicState.word === "Resolved"
      ? "The source records a solution; no Contribution here reflects it yet."
      : "No Contribution to this Problem has been accepted here.";
  const outcomes = records.reduce<Record<string, number>>((counts, record) => {
    const outcome = record.outcome ?? "not reported";
    counts[outcome] = (counts[outcome] ?? 0) + 1;
    return counts;
  }, {});
  const outcomeSummary = Object.entries(outcomes).map(([outcome, count]) => `${count} ${outcome.replaceAll("_", " ")}`).join(" · ");
  const evidence = review
    ? `${outcomeSummary || "No scoped check retained"}${state.sourceAudits.length ? " · source publishes its own audit" : ""}`
    : state.claims.length
      ? "The current Contribution has no retained check"
      : state.sourceAudits.length
        ? "Source publishes its own audit; nothing checked here"
        : "No scoped check retained here";
  const remains = publicState.word === "Contested"
    ? "Current Contributions require reconciliation or correction."
    : publicState.word === "Resolved"
      ? accepted.length && scope?.includes("not to this Problem")
        ? "The source marks the question resolved; retained evidence here remains narrower."
        : "The source records no unresolved question; the evidence here may still have a narrower scope."
      : accepted.length
        ? "The source still marks the Problem open beyond the accepted scope."
        : "The source question remains open; no accepted Contribution is retained here.";
  return <dl className="mt-6 grid overflow-hidden rounded-xl border bg-background/70 text-meta shadow-xs sm:grid-cols-2 lg:grid-cols-[minmax(9rem,.7fr)_minmax(0,1.35fr)_minmax(0,.8fr)_minmax(0,1fr)_minmax(8rem,.6fr)]">
    <div className="min-w-0 border-b border-r-0 bg-muted/35 p-4 sm:border-r lg:border-b-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">Problem state</dt>
      <dd className="mt-1.5">
        <span className="inline-flex items-center gap-2 text-label font-medium"><span aria-hidden className={`size-2 rounded-full ${STATE_DOT[publicState.word]}`} />{publicState.word}</span>
        <span className="mt-1 block text-micro text-muted-foreground">{publicState.basis}</span>
      </dd>
    </div>
    <div className="min-w-0 border-b p-4 sm:border-r lg:border-b-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">What is known</dt>
      <dd className="mt-1.5 line-clamp-3 text-compact [overflow-wrap:anywhere]">{understanding}</dd>
    </div>
    <div className="min-w-0 border-b p-4 sm:border-r lg:border-b-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">Evidence strength</dt>
      <dd className="mt-1.5 text-compact">{evidence}</dd>
    </div>
    <div className="min-w-0 border-b p-4 sm:border-r sm:border-b-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">What remains open</dt>
      <dd className="mt-1.5 text-compact">{remains}</dd>
    </div>
    <div className="min-w-0 p-4">
      <dt className="text-eyebrow uppercase text-muted-foreground">Next</dt>
      <dd className="mt-1.5 flex flex-col items-start gap-1 text-compact">
        <Link className="underline underline-offset-4" href={`${basePath}?view=evidence`}>Read Evidence</Link>
        <Link className="underline underline-offset-4" href={`${basePath}?view=work#prior-work`}>Check prior work</Link>
        <Link className="underline underline-offset-4" href={`${basePath}?view=work#add-contribution`}>Add contribution</Link>
      </dd>
    </div>
  </dl>;
}
import Link from "next/link";
