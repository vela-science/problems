import Link from "next/link";
import { Badge } from "@vela/ui/components/badge";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { StateGlyph } from "@vela/ui/vela/state-glyph";
import { AssertionText } from "@/components/vela/assertion-text";
import { standingScopeSentence } from "@/components/vela/problem-facts";
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
  const claims = state.claims.filter((claim) => claim.id !== state.currentClaimId);
  if (!claims.length && !state.sourceAudits.length) return null;
  return <>
    {claims.length ? <section aria-labelledby="other-results-heading">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="other-results-heading" className="text-title">Other results</h2><Badge variant="outline">{claims.length}</Badge></div>
      <ItemGroup className="mt-4 gap-0 divide-y border-y">{claims.map((claim) => <Item key={claim.id} className="items-start rounded-none border-0 px-0 py-4">
        <ItemMedia className="pt-1"><StateGlyph standing={claim.standing} verification="not_attempted" /></ItemMedia>
        <ItemContent className="gap-2">
          <ItemTitle className="line-clamp-3 text-body font-normal leading-6 [overflow-wrap:anywhere]"><AssertionText text={claim.assertion} /></ItemTitle>
          <ItemDescription className="line-clamp-none flex flex-wrap items-center gap-x-2 gap-y-1.5"><Badge variant={claim.standing === "accepted" ? "default" : "secondary"}>{claim.standing.replaceAll("_", " ")}</Badge>{claim.id === state.currentClaimId ? <Badge variant="outline">current</Badge> : null}{claim.source_bindings?.length ? <span>{claim.source_bindings.length} source {claim.source_bindings.length === 1 ? "binding" : "bindings"}</span> : null}</ItemDescription>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-meta"><Link href={`/repositories/${state.repositorySlug}/claims/${encodeURIComponent(claim.id)}`} className="font-medium underline underline-offset-4">Open exact result</Link>{claim.source_bindings?.length ? <span className="text-muted-foreground">{claim.source_bindings.length} reviewed source {claim.source_bindings.length === 1 ? "occurrence" : "occurrences"}</span> : null}</div>
          {scope || claim.source_bindings?.length ? <details className="group mt-1 text-meta text-muted-foreground">
            <summary className="min-h-8 cursor-pointer list-none py-1 font-medium text-foreground marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2"><span aria-hidden className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>Technical scope</summary>
            {scope ? <p>{scope}</p> : null}
            {claim.source_bindings?.length ? <ul className="mt-1 space-y-1 font-mono text-micro [overflow-wrap:anywhere]">{claim.source_bindings.map((binding) => <li key={binding.binding_id}>{binding.source_id} · {binding.native_id} · {binding.relation_kind?.replaceAll("_", " ") ?? "canonical occurrence"}</li>)}</ul> : null}
          </details> : null}
        </ItemContent>
      </Item>)}</ItemGroup>
    </section> : null}

    {state.sourceAudits.length ? <details className="rounded-lg border px-4 py-3 text-meta"><summary className="cursor-pointer font-medium">Source audit</summary><div className="mt-5"><FormalConjecturesAudit records={state.sourceAudits} /></div></details> : null}
  </>;
}
