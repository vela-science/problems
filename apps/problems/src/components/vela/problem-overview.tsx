import Link from "next/link";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { StateGlyph } from "@vela/ui/vela/state-glyph";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { AssertionText } from "@/components/vela/assertion-text";
import { Docstring, FormalStatementCard } from "@/components/vela/formal-statement-card";
import { ProvenanceSummary } from "@/components/vela/provenance-summary";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* The default surface: the reader's questions, in the reader's order — what is
 * asked, what this Repository holds, and what to do next. Record-tier material
 * (roots, record ids, verification detail, occurrence tables, audit bodies,
 * correction relations) never renders here; it lives at its own address under
 * the Record and Sources views, and this surface may summarize it in one line
 * with a link. That sentence is what keeps the provenance wall from regrowing. */
export function ProblemOverview({ state, basePath }: { state: State; basePath: string }) {
  /* A Problem opens with what it asks, and a Lean declaration does not say
     that to most readers.

     Selection follows the form the resolver derives from each Source's
     declared role, which the statement row carries. Where no prose is
     retained the page says so and links upstream: `source:erdos-problems`
     declares `statement_retention: "locator_only"`, so the natural-language
     statement is deliberately not retained here and the locator is the whole
     of what this release may show. */
  const question = state.sources.statements.find((statement) => statement.statement_form === "prose") ?? null;
  /* Where the catalogue may not retain its prose, the formal library often
     retains its authors' own docstring — LaTeX prose, Apache-licensed,
     already in the projection. Base declarations sort first (native_id
     order), so the statement leads and its variants stay under Sources. The
     occurrence's association status travels with the text: a shared number
     is navigation, not identity, and the caption says which one this is. */
  const formalOccurrences = state.sources.occurrences.filter((occurrence) => occurrence.formal && occurrence.summary?.trim());
  const primaryFormal = formalOccurrences.find((occurrence) => occurrence.formal?.docstring) ?? formalOccurrences[0] ?? null;
  return <>
    <section aria-labelledby="question-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="question-heading" className="text-title">Question</h2>{question ? <span className="text-meta text-muted-foreground">Source-authored statement</span> : primaryFormal ? <span className="text-meta text-muted-foreground">As formalized by {primaryFormal.source_label}</span> : null}</div>
      {question ? <><p className="mt-5 max-w-[90ch] text-body leading-7"><ScientificText text={question.text} /></p><p className="mt-3 text-micro text-muted-foreground">Retained from <span className="font-medium text-foreground">{question.source_id}</span>. This is readable source text, not a Vela Claim or a statement-equivalence judgment.</p></> : primaryFormal ? <div className="mt-5 min-w-0">
        {primaryFormal.formal?.docstring ? <Docstring text={primaryFormal.formal.docstring} className="mb-5" /> : null}
        <FormalStatementCard occurrence={primaryFormal} showDocstring={false} />
        <p className="mt-3 text-micro text-muted-foreground">
          The formalizers&apos; own wording and notation, retained from <span className="font-medium text-foreground">{primaryFormal.source_id}</span>
          {primaryFormal.occurrence_status === "candidate_number_link" ? <> and associated with this Problem by its shared number only; statement identity is not established.</> : <>; not the catalogue&apos;s own text.</>}
          {formalOccurrences.length > 1 ? <> {formalOccurrences.length - 1} more {formalOccurrences.length === 2 ? "declaration" : "declarations"} under Sources.</> : null}
        </p>
      </div> : <div className="mt-5 max-w-[76ch] py-2">
        <p className="font-medium">No natural-language question is retained in this release.</p>
        {state.locator ? <p className="mt-2 text-meta"><a href={state.locator} className="underline underline-offset-4">Open the upstream source</a></p> : null}
      </div>}
    </section>

    <section aria-labelledby="current-state-heading">
      {/* The two axes themselves ride in the hero strip; this section owns
          the caption that keeps them apart and the Claims the Standing
          ranges over. */}
      <h2 id="current-state-heading" className="text-title">Current State</h2>
      {/* The one home of the rule the two axes obey; the strip shows the
          axes, and no other line on this screen restates their separation. */}
      <p className="mt-4 max-w-[76ch] text-compact text-muted-foreground">Source status is publisher-declared. Repository-local Standing applies only to the exact Claim below; it does not mean this Problem is proved or resolved.</p>
      {/* A count chip reading zero says "this failed"; a heading with no count
          says "nothing here yet", which is what is true. */}
      <div className="mt-7 flex flex-wrap items-end justify-between gap-3"><h3 className="text-subtitle">Local Claims</h3>{state.claims.length ? <span className="text-meta text-muted-foreground">{state.claims.length} local {state.claims.length === 1 ? "Claim" : "Claims"}</span> : null}</div>
      {state.claims.length ? <ItemGroup className="mt-5 gap-1">{state.claims.map((claim) => <Item key={claim.id} className="items-start rounded-lg border-0 px-3 py-5 hover:bg-muted/30">
        <ItemMedia className="pt-1"><StateGlyph standing={claim.standing} verification="not_attempted" /></ItemMedia>
        <ItemContent className="gap-2">
          <ItemTitle className="line-clamp-none text-body font-normal [overflow-wrap:anywhere]"><AssertionText text={claim.assertion} /></ItemTitle>
          {/* No middot. These are three flex items of different kinds — a
              Standing token, the axis it belongs to, and a qualifier — and the
              gap is what separates flex items; a middot joins inline facts of
              one kind on one line. It was written as a leading "· current
              Claim", so at 390px the third item wrapped and the line opened
              with a bare middot. */}
          <ItemDescription className="line-clamp-none flex flex-wrap items-center gap-x-3 gap-y-1.5"><Badge variant={claim.standing === "accepted" ? "default" : "secondary"}>{claim.standing.replaceAll("_", " ")}</Badge><span>Repository-local Standing</span>{claim.id === state.currentClaimId ? <span>current Claim</span> : null}</ItemDescription>
          {claim.source_bindings?.length ? <div className="mt-1 text-meta text-muted-foreground">
            <p>{claim.source_bindings.length} exact reviewed source {claim.source_bindings.length === 1 ? "occurrence" : "occurrences"}</p>
            <ul className="mt-1 space-y-1 font-mono text-micro [overflow-wrap:anywhere]">
              {claim.source_bindings.map((binding) => <li key={binding.binding_id}>{binding.source_id} · {binding.native_id} · {binding.relation_kind?.replaceAll("_", " ") ?? "canonical occurrence"}</li>)}
            </ul>
          </div> : null}
        </ItemContent>
      </Item>)}</ItemGroup> : <div className="mt-4 max-w-2xl py-3">
        {/* Exactly true on all 1,217 pages, including the two the Repository
            has in fact assessed: a Claim reaches a Problem only through the
            subject its record declares, and none declares one yet. "This
            Repository publishes no Claim about this Problem" reads as a
            statement about the science, and the ledger falsifies it in one
            click. */}
        <p className="font-medium">No Claim in this release names this Problem as its subject.</p>
        <p className="mt-1 text-meta text-muted-foreground">This Repository has admitted Claims; a record reaches a Problem only through the subject it declares.</p>
        <p className="mt-2 text-meta"><Link href={`/repositories/${state.repositorySlug}/claims`} className="underline underline-offset-4">Open the Claim ledger</Link></p>
      </div>}
    </section>

    <ProvenanceSummary state={state} basePath={basePath} />

    <section aria-labelledby="next-contribution-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="next-contribution-heading" className="text-title">Next contribution</h2><Button nativeButton={false} render={<Link href={`${basePath}?view=workspace`} />}>Open Workspace</Button></div>
      <p className="mt-4 max-w-[70ch] text-body text-muted-foreground">{state.repository.status.actions.work.note}</p>
      <p className="mt-3 max-w-[70ch] text-meta text-muted-foreground">Open Workspace to assemble the packet in the browser. The CLI command runs in the source Repository checkout. <Link href="/contribute" className="underline underline-offset-4">How contribution works</Link></p>
      <code className="mt-3 block w-fit max-w-full rounded bg-command px-2 py-1 font-mono text-micro break-all text-command-foreground">{state.repository.status.actions.work.command}</code>
    </section>
  </>;
}
