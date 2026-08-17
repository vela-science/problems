import { ProblemOverview } from "@/components/vela/problem-overview";
import { ProblemSourcesView } from "@/components/vela/problem-sources-view";
import { ProblemRecord } from "@/components/vela/problem-record";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

export type ProblemStateView = "overview" | "sources" | "record";

/* One Problem, three sibling public surfaces, each complete HTML at its own
 * URL. This dispatcher is the stable entry the page and its tests hold onto;
 * the surfaces own their content:
 *
 *   overview  the reader's answers — question, current State, next action
 *   sources   what the sources themselves publish, and their own audit
 *   record    full provenance, corrections, exact roots — the disclosure tier
 *
 * A sibling surface is not progressive disclosure: nothing is DOM-hidden, so
 * the rule that a closed disclosure is deletion is satisfied by address, not
 * by a Collapsible. */
export function ProblemState({ state, basePath, view = "overview" }: {
  state: State;
  basePath: string;
  view?: ProblemStateView;
}) {
  return <div className="mt-8 max-w-5xl space-y-12">
    {view === "overview" ? <ProblemOverview state={state} basePath={basePath} /> : null}
    {view === "sources" ? <ProblemSourcesView state={state} /> : null}
    {view === "record" ? <ProblemRecord state={state} /> : null}
  </div>;
}
