import Link from "next/link";
import { Badge } from "@vela/ui/components/badge";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { StateGlyph } from "@vela/ui/vela/state-glyph";
import { AssertionText } from "@/components/vela/assertion-text";
import { standingScopeSentence } from "@/components/vela/problem-facts";
import { ProblemProvenance } from "@/components/vela/problem-provenance";
import { ScientificLineage } from "@/components/vela/scientific-lineage";
import { ProblemSourceFacts } from "@/components/vela/problem-source-facts";
import { ProblemSources } from "@/components/vela/problem-sources";
import { FormalConjecturesAudit } from "@/components/vela/formal-conjectures-audit";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* Everything that supports what this Problem currently holds, in one
 * section: the Contributions themselves, who checked them and how, and the
 * sources and artifacts they rest on. Repository-local Standing renders here
 * on the exact Contribution it governs — never in the Problem's own header,
 * where it read as the status of the whole Problem. */
export function ProblemEvidence({ state }: { state: State }) {
  /* What the Standing actually ranges over — the sentence that stops a
     reference-scoped acceptance from reading as a solved conjecture. */
  const scope = standingScopeSentence(state);
  return <>
    <ScientificLineage state={state} />

    <section aria-labelledby="contributions-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="contributions-heading" className="text-title">Contributions</h2>{state.claims.length ? <span className="text-meta text-muted-foreground">{state.claims.length} {state.claims.length === 1 ? "Contribution" : "Contributions"} in current State</span> : null}</div>
      {scope ? <p className="mt-3 max-w-[76ch] text-compact text-muted-foreground">{scope}</p> : null}
      {state.claims.length ? <ItemGroup className="mt-5 gap-0 divide-y border-y">{state.claims.map((claim) => <Item key={claim.id} className="items-start rounded-none border-0 px-0 py-5">
        <ItemMedia className="pt-1"><StateGlyph standing={claim.standing} verification="not_attempted" /></ItemMedia>
        <ItemContent className="gap-2">
          <ItemTitle className="line-clamp-3 text-body font-normal leading-6 [overflow-wrap:anywhere]"><AssertionText text={claim.assertion} /></ItemTitle>
          <ItemDescription className="line-clamp-none flex flex-wrap items-center gap-x-3 gap-y-1.5"><Badge variant={claim.standing === "accepted" ? "default" : "secondary"}>{claim.standing.replaceAll("_", " ")}</Badge><span>Repository-local Standing, scoped to this exact Contribution</span>{claim.id === state.currentClaimId ? <span>current</span> : null}</ItemDescription>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-meta"><Link href={`/repositories/${state.repositorySlug}/claims/${encodeURIComponent(claim.id)}`} className="font-medium underline underline-offset-4">Open exact Contribution</Link>{claim.source_bindings?.length ? <span className="text-muted-foreground">{claim.source_bindings.length} reviewed source {claim.source_bindings.length === 1 ? "occurrence" : "occurrences"}</span> : null}</div>
          {claim.source_bindings?.length ? <details className="group mt-1 text-meta text-muted-foreground">
            <summary className="min-h-8 cursor-pointer list-none py-1 font-medium text-foreground marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2"><span aria-hidden className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>Technical scope</summary>
            <p>{claim.source_bindings.length} exact reviewed source {claim.source_bindings.length === 1 ? "occurrence" : "occurrences"}</p>
            <ul className="mt-1 space-y-1 font-mono text-micro [overflow-wrap:anywhere]">
              {claim.source_bindings.map((binding) => <li key={binding.binding_id}>{binding.source_id} · {binding.native_id} · {binding.relation_kind?.replaceAll("_", " ") ?? "canonical occurrence"}</li>)}
            </ul>
          </details> : null}
        </ItemContent>
      </Item>)}</ItemGroup> : <p className="mt-4 max-w-2xl py-3 text-body text-muted-foreground">No Contribution in this release names this Problem as its subject.</p>}
    </section>

    <ProblemProvenance state={state} />

    <section aria-labelledby="source-facts-heading">
      <h2 id="source-facts-heading" className="text-title">Source-declared facts</h2>
      <ProblemSourceFacts
        record={state.problem}
        locator={state.locator}
        ledgerHref={(name, value) => `/problems/erdos-problems?${new URLSearchParams({ [name]: value })}`}
        className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-muted-foreground"
      />
    </section>

    <ProblemSources sources={state.sources} />
    <FormalConjecturesAudit records={state.sourceAudits} />
  </>;
}
