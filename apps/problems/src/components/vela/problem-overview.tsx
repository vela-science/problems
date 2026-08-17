import Link from "next/link";
import { Button } from "@vela/ui/components/button";
import { ScientificText } from "@vela/ui/vela/scientific-text";
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

    {/* The Contributions themselves live under Evidence with their scoped
        Standing; the Overview compresses them to what was checked and what
        remains, one link each. */}
    <ProvenanceSummary state={state} basePath={basePath} />

    <section aria-labelledby="next-contribution-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="next-contribution-heading" className="text-title">Contribute</h2><Button nativeButton={false} render={<Link href={`${basePath}?view=work`} />}>Start work</Button></div>
      <p className="mt-4 max-w-[70ch] text-body text-muted-foreground">{state.repository.status.actions.work.note}</p>
      <p className="mt-3 max-w-[70ch] text-meta text-muted-foreground">Work coordinates approaches and drafts in the browser; the CLI command runs in the source Repository checkout. <Link href="/contribute" className="underline underline-offset-4">How contribution works</Link></p>
      <code className="mt-3 block w-fit max-w-full rounded bg-command px-2 py-1 font-mono text-micro break-all text-command-foreground">{state.repository.status.actions.work.command}</code>
    </section>
  </>;
}
