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
  const current = (state.claims ?? []).find((claim) => claim.id === state.currentClaimId) ?? null;
  const activeAccepted = (state.claims ?? []).filter((claim) => ["accepted", "accepted_with_conditions"].includes(claim.standing));
  const declared = state.problem.declared_status?.toLowerCase() ?? "";
  const sourceResolved = ["solved", "proved", "disproved"].some((word) => declared.includes(word));
  if (!current && activeAccepted.length > 1) return { word: "Contested", basis: "more than one current Contribution is unresolved" };
  if (sourceResolved) return { word: "Resolved", basis: "per the source's own declaration" };
  if (current && ["accepted", "accepted_with_conditions"].includes(current.standing)) return { word: "Partial", basis: "open per source; a scoped result is current here" };
  return { word: "Open", basis: "per the source's own declaration" };
}

const STATE_DOT: Record<ProblemPublicState["word"], string> = {
  Open: "bg-muted-foreground/50",
  Partial: "bg-status-evidence",
  Resolved: "bg-status-progress",
  Contested: "bg-status-caution",
};

/* Two inline facts orient the question without creating another summary
 * section. Contribution standing and checks stay on the Contribution itself. */
export function ProblemAnswerStrip({ state }: { state: State; basePath?: string }) {
  const sourceStatus = state.problem.declared_status?.replaceAll("_", " ") || "not stated";
  const sourceResolved = ["solved", "proved", "disproved"].some((word) => sourceStatus.toLowerCase().includes(word));
  return <section aria-label="Problem state" className="min-w-0">
    <dl className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div className="flex items-center gap-2">
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${STATE_DOT[sourceResolved ? "Resolved" : "Open"]}`} />
        <dt className="text-meta text-muted-foreground">Source:</dt>
        <dd className="font-medium text-foreground">{sourceStatus}</dd>
      </div>
    </dl>
  </section>;
}
