import { ProblemOverview } from "@/components/vela/problem-overview";
import { ProblemEvidence } from "@/components/vela/problem-evidence";
import { ProblemHistory } from "@/components/vela/problem-history";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

export type ProblemStateView = "overview" | "evidence" | "history";

/* One Problem, its public surfaces, each complete HTML at its own URL. The
 * sections are the reader's model — the two public nouns are Problem and
 * Contribution, and everything else appears in context:
 *
 *   overview  the question, its state, and the next useful action
 *   evidence  Contributions, checks, attribution, sources, artifacts
 *   history   proposed changes, corrections, exact technical provenance
 *
 * (Work is the fourth surface, account-aware, rendered by the page.) A
 * sibling surface is not progressive disclosure: nothing is DOM-hidden, so
 * the rule that a closed disclosure is deletion is satisfied by address. */
export function ProblemState({ state, basePath, view = "overview" }: {
  state: State;
  basePath: string;
  view?: ProblemStateView;
}) {
  return <div className="mt-8 max-w-5xl space-y-12">
    {view === "overview" ? <ProblemOverview state={state} basePath={basePath} /> : null}
    {view === "evidence" ? <ProblemEvidence state={state} /> : null}
    {view === "history" ? <ProblemHistory state={state} /> : null}
  </div>;
}
