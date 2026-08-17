import { ProblemSourceFacts } from "@/components/vela/problem-source-facts";
import { ProblemSources } from "@/components/vela/problem-sources";
import { FormalConjecturesAudit } from "@/components/vela/formal-conjectures-audit";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* Everything the sources themselves publish about this Problem: declared
 * facts, retained statement texts, the coverage and occurrence matrix, and
 * the source's own audit. A source review keeps its own heading here and
 * never sits under Vela checks — it is a source-published fact, and placement
 * is what enforces that instead of a disclaimer. */
export function ProblemSourcesView({ state }: { state: State }) {
  return <>
    <section aria-labelledby="source-facts-heading">
      <h2 id="source-facts-heading" className="text-title">Source-declared facts</h2>
      <ProblemSourceFacts
        record={state.problem}
        locator={state.locator}
        ledgerHref={(name, value) => `/problems?${new URLSearchParams({ [name]: value })}`}
        className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-muted-foreground"
      />
    </section>

    <ProblemSources sources={state.sources} />
    <FormalConjecturesAudit records={state.sourceAudits} />
  </>;
}
