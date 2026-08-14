import Link from "next/link";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@vela/ui/components/collapsible";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { StateGlyph } from "@vela/ui/vela/state-glyph";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { RootFact } from "@/components/vela/root-fact";
import { RecordId } from "@/components/vela/record-id";
import { ProblemFacts } from "@/components/vela/problem-facts";
import { ProblemSourceFacts } from "@/components/vela/problem-source-facts";
import { ProblemSources } from "@/components/vela/problem-sources";
import { FormalConjecturesAudit } from "@/components/vela/formal-conjectures-audit";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

function correctionRelations(claim: State["claims"][number]) {
  const record = claim.record && typeof claim.record === "object"
    ? claim.record as { relations?: unknown }
    : null;
  return Array.isArray(record?.relations)
    ? record.relations.filter((relation): relation is { kind: string; target_claim_id: string } => (
        relation !== null
        && typeof relation === "object"
        && ["corrects", "supersedes"].includes(String((relation as { kind?: unknown }).kind))
        && typeof (relation as { target_claim_id?: unknown }).target_claim_id === "string"
      ))
    : [];
}

export function ProblemState({ state, basePath }: { state: State; basePath?: string }) {
  const decisions = state.reviews.filter((review) => (
    review.decision_provenance !== "pending" && review.decision_provenance !== "producer_withdrawal"
  ));
  const checks = state.reviews.flatMap((review) => (review.verification_records ?? []).map((record) => ({
    ...record,
    proposal_id: review.proposal_id,
  })));
  const corrections = state.claims.flatMap((claim) => correctionRelations(claim).map((relation) => ({ claim, relation })));
  const question = state.sources.statements.find((statement) => statement.source_id === "source:vibemathed") ?? state.sources.statements[0];
  return <div className="mt-8 max-w-5xl space-y-12">
    <section aria-labelledby="question-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="question-heading" className="text-title">Question</h2>{question ? <span className="text-meta text-muted-foreground">Source-authored statement</span> : null}</div>
      {question ? <><p className="mt-5 max-w-[90ch] text-body leading-7"><ScientificText text={question.text} /></p><p className="mt-3 text-micro text-muted-foreground">Retained from <span className="font-medium text-foreground">{question.source_id}</span>. This is readable source text, not a Vela Claim or a statement-equivalence judgment.</p></> : <div className="mt-5 max-w-2xl py-2"><p className="font-medium">No natural-language question is retained in this release.</p>{state.locator ? <p className="mt-2 text-meta"><a href={state.locator} className="underline underline-offset-4">Open the upstream source</a></p> : null}</div>}
    </section>

    <section aria-labelledby="current-state-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="current-state-heading" className="text-title">Current State</h2><span className="text-meta text-muted-foreground">Source status and Local Standing remain separate</span></div>
      <ProblemFacts state={state} className="mt-5" />
      <p className="mt-4 max-w-[76ch] text-compact text-muted-foreground">Source status is publisher-declared. Repository-local Standing applies only to the exact Claim below; it does not mean this Problem is proved or resolved.</p>
      {/* A count chip reading zero says "this failed"; a heading with no count
          says "nothing here yet", which is what is true. */}
      <div className="mt-7 flex flex-wrap items-end justify-between gap-3"><h3 className="text-subtitle">Local Claims</h3>{state.claims.length ? <span className="text-meta text-muted-foreground">{state.claims.length} local {state.claims.length === 1 ? "Claim" : "Claims"}</span> : null}</div>
      {state.claims.length ? <ItemGroup className="mt-5 gap-1">{state.claims.map((claim) => <Item key={claim.id} className="items-start rounded-lg border-0 px-3 py-5 hover:bg-muted/30">
        <ItemMedia className="pt-1"><StateGlyph standing={claim.standing} verification="not_attempted" /></ItemMedia>
        <ItemContent className="gap-2">
          <ItemTitle className="line-clamp-none text-body font-normal">{claim.assertion}</ItemTitle>
          <ItemDescription className="line-clamp-none flex flex-wrap items-center gap-2"><Badge variant={claim.standing === "accepted" ? "default" : "secondary"}>{claim.standing.replaceAll("_", " ")}</Badge><span>Repository-local Standing</span>{claim.id === state.currentClaimId ? <span>· current Claim</span> : null}</ItemDescription>
          {claim.source_bindings?.length ? <div className="mt-1 text-meta text-muted-foreground">
            <p>{claim.source_bindings.length} exact reviewed source {claim.source_bindings.length === 1 ? "occurrence" : "occurrences"}</p>
            <ul className="mt-1 space-y-1 font-mono text-micro">
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
      <p className="mt-5 text-meta"><Link href={`${basePath ?? `/p/${state.repositorySlug}/${state.problem.problem}`}?mode=work`} className="font-medium underline underline-offset-4">Next: open the Workspace to prepare a bounded Submission</Link></p>
    </section>

    {/* These were behind a closed Collapsible, and Base UI keeps closed content
        out of the DOM, so the one part of this page that is never empty never
        rendered: Erdős 321 retains seven source statements and eight
        occurrences, 887 four and five. What a Problem says is not a detail to
        disclose — for the 1,215 Problems this Repository has admitted nothing
        about, it is the whole page. Exact roots stay in the disclosure below. */}
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

    <section aria-labelledby="checks-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="checks-heading" className="text-title">Checks</h2>{checks.length ? <span className="text-meta text-muted-foreground">{checks.length} scoped {checks.length === 1 ? "Verification Record" : "Verification Records"}</span> : null}</div>
      {checks.length ? <ItemGroup className="mt-5 divide-y">{checks.map((check) => <Item key={check.verification_record_id} className="items-start rounded-none px-0 py-4"><ItemContent className="gap-2">
        <div className="flex flex-wrap items-center gap-2"><ItemTitle className="line-clamp-none text-body font-normal">{check.property ?? "Scoped verification"}</ItemTitle><StatusBadge axis="verification" state={check.outcome}>verification {check.outcome.replaceAll("_", " ")}</StatusBadge></div>
        <ItemDescription className="line-clamp-none">Attributed to {check.verifier_actor}. A Check reports this scope and does not decide Standing.</ItemDescription>
        {(check.does_not_establish ?? []).length ? <ul className="list-disc space-y-1 pl-5 text-micro text-muted-foreground">{check.does_not_establish!.map((limit) => <li key={limit}>{limit}</li>)}</ul> : null}
        <p className="text-micro"><Link href={`/repositories/${state.repositorySlug}/proposals/${check.proposal_id}`} className="underline underline-offset-4">Open the proposed change and exact Verification Record</Link></p>
      </ItemContent></Item>)}</ItemGroup> : <p className="mt-4 max-w-2xl py-3 text-body text-muted-foreground">No scoped Verification Record is retained for the joined Claim.</p>}
    </section>

    <section aria-labelledby="decisions-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="decisions-heading" className="text-title">Decisions</h2>{decisions.length ? <span className="text-meta text-muted-foreground">{decisions.length} recorded</span> : null}</div>
      {decisions.length ? <ItemGroup className="mt-5 gap-1">{decisions.map((decision) => <Item key={decision.proposal_id} className="items-start rounded-lg border-0 px-3 py-5 hover:bg-muted/30"><ItemContent className="gap-2"><div className="flex flex-wrap items-center gap-2"><Badge variant={decision.status === "accepted" ? "default" : "secondary"}>{decision.status.replaceAll("_", " ")}</Badge><span className="text-micro text-muted-foreground">Proposed change</span></div><ItemTitle className="line-clamp-none text-body font-normal">{decision.claim || decision.target}</ItemTitle><ItemDescription className="line-clamp-none">{decision.decision_reason ?? "A Decision is retained without a projected reason."}</ItemDescription><p className="text-micro text-muted-foreground">{decision.decision_actor_class === "agent" ? "Agent Decision" : decision.decision_actor_class === "human" ? "Human Decision" : "Attributed Decision"} · {decision.decision_provenance.replaceAll("_", " ")}{decision.reviewed_by ? <> · performer <RecordId value={decision.reviewed_by} prefix={24} copy={false} /></> : null}</p>{decision.decision_authority_principal_id ? <p className="text-micro text-muted-foreground">Repository authority <RecordId value={decision.decision_authority_principal_id} prefix={24} copy={false} /></p> : null}</ItemContent></Item>)}</ItemGroup> : <p className="mt-4 max-w-2xl py-3 text-body text-muted-foreground">No Decision is retained for this Problem. Checks and source labels do not fill that role.</p>}
    </section>

    <section aria-labelledby="correction-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="correction-heading" className="text-title">Correction history</h2>{corrections.length ? <span className="text-meta text-muted-foreground">{corrections.length} exact {corrections.length === 1 ? "relation" : "relations"}</span> : null}</div>
      {corrections.length ? <ItemGroup className="mt-5 divide-y">{corrections.map(({ claim, relation }) => <Item key={`${claim.id}:${relation.kind}:${relation.target_claim_id}`} className="items-start rounded-none px-0 py-4"><ItemContent className="gap-2"><ItemTitle className="line-clamp-none text-body font-normal">Claim {relation.kind === "corrects" ? "correction" : "supersession"}</ItemTitle><ItemDescription className="line-clamp-none flex flex-wrap items-center gap-x-2 gap-y-1"><RecordId value={claim.id} /><span>{relation.kind}</span><RecordId value={relation.target_claim_id} /></ItemDescription><p className="text-meta text-muted-foreground">The predecessor remains retained. This relation does not transport source equivalence or another Repository&apos;s Standing.</p></ItemContent></Item>)}</ItemGroup> : <p className="mt-4 max-w-2xl py-3 text-body text-muted-foreground">No correction or supersession relation is retained for the joined Claim.</p>}
    </section>

    <section aria-labelledby="next-contribution-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="next-contribution-heading" className="text-title">Next contribution</h2><Button nativeButton={false} render={<Link href={`${basePath ?? `/p/${state.repositorySlug}/${state.problem.problem}`}?mode=work`} />}>Open Workspace</Button></div>
      <p className="mt-4 max-w-[70ch] text-body text-muted-foreground">{state.repository.status.actions.work.note}</p>
      <p className="mt-3 max-w-[70ch] text-meta text-muted-foreground">The Repository publishes no central ranked queue. Work stays source-owned until an exact bounded Submission is prepared.</p>
      <p className="mt-3 max-w-[70ch] text-meta text-muted-foreground">Open Workspace to assemble the packet in the browser. The CLI command runs in the source Repository checkout.</p>
      <code className="mt-3 block w-fit max-w-full rounded bg-command px-2 py-1 font-mono text-micro break-all text-command-foreground">{state.repository.status.actions.work.command}</code>
    </section>

    <Collapsible className="group/exact rounded-xl bg-muted/25 px-5 py-5 sm:px-6">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4">
        <span><span className="block text-subtitle">Exact provenance</span><span className="mt-1 block text-meta text-muted-foreground">Roots, source, and advanced protocol record types</span></span>
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden className="size-5 transition-transform duration-200 group-data-open/exact:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-open:animate-in data-open:fade-in data-open:slide-in-from-top-1 data-closed:animate-out data-closed:fade-out data-closed:slide-out-to-top-1">
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <dl className="space-y-3">
          <RootFact label="Problem row" value={state.source.row_root} />
          <RootFact label="Metadata" value={state.source.metadata_root} />
          <RootFact label="Observation" value={state.source.observation_root} />
          {state.source.content_root ? <RootFact label="Content" value={state.source.content_root} /> : null}
        </dl>
        <dl className="space-y-3">
          <RootFact label="Repository" value={state.anchor.repositoryRoot} />
          <RootFact label="Projection" value={state.anchor.projectionReleaseRoot} />
          <RootFact label="Source commit" value={state.anchor.sourceCommit} />
        </dl>
      </div>
      {state.claims.flatMap((claim) => claim.source_bindings ?? []).length ? <div className="mt-6 border-t pt-5"><p className="text-label">Exact Claim-to-Problem Bindings</p><div className="mt-3 grid gap-5 sm:grid-cols-2">{state.claims.flatMap((claim) => (claim.source_bindings ?? []).map((binding) => <dl key={binding.binding_id} className="space-y-2"><RootFact label="Binding" value={binding.binding_root} /><RootFact label="Native record" value={binding.native_record_root} /><RootFact label="Content" value={binding.content_root} /><p className="text-micro text-muted-foreground">Mapping: {binding.relation_kind?.replaceAll("_", " ") ?? "canonical occurrence"} · translation unresolved · authority effect none</p></dl>))}</div></div> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        {state.locator ? <Button nativeButton={false} variant="outline" render={<a href={state.locator} />}>Upstream source</Button> : null}
        <Button nativeButton={false} variant="outline" render={<a href={`/repositories/${state.repositorySlug}/problems/${state.problem.problem}`} />}>Inspect records</Button>
        <Button nativeButton={false} variant="outline" render={<a href={`/problems.json?${new URLSearchParams({ root: state.anchor.projectionReleaseRoot, resolver: state.sources.resolver_root, source: state.source.source_id, native_id: state.source.native_id, kind: state.source.native_kind })}`} />}>Source JSON</Button>
      </div>
      </CollapsibleContent>
    </Collapsible>
  </div>;
}
