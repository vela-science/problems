import Link from "next/link";
import {
  AlertCircleIcon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  MinusSignCircleIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@vela/ui/components/item";
import { AssertionText } from "@/components/vela/assertion-text";
import { Performer } from "@/components/vela/actor";
import { Attribution, checkIndependence } from "@/components/vela/attribution";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@vela/ui/components/empty";
import { FormalConjecturesAudit } from "@/components/vela/formal-conjectures-audit";
import { formalFilePath } from "@/components/vela/formal-statement-card";
import { ProblemFiles, type FileEntry } from "@/components/vela/problem-files";
import { WhatIsKnown } from "@/components/vela/problem-known";
import { ProblemEvidence } from "@/components/vela/problem-evidence";
import type { FrontierTimelineData } from "@/components/vela/frontier-timeline";
import { ProblemHistory } from "@/components/vela/problem-history";
import { currentReview } from "@/components/vela/problem-provenance";
import type { ProblemResearchView } from "@/components/vela/problem-state";
import { formatAgo, formatDate } from "@/lib/format";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { Disclosure } from "@/components/vela/disclosure";

type State = NonNullable<ScientificProblemState>;
type SourceOccurrence = State["sources"]["occurrences"][number];
type SourceStatement = State["sources"]["statements"][number];

function humanize(value: string | null | undefined, fallback = "Not recorded") {
  return value?.replaceAll("_", " ") || fallback;
}

function outcomeLabel(outcome: string) {
  return ({ pass: "Passed", fail: "Failed", error: "Error", inconclusive: "Inconclusive" } as Record<string, string>)[outcome] ?? humanize(outcome);
}

function sourceRelationLabel(relation: string | null | undefined) {
  if (relation === "formal_statement_reference") return "Formal declaration";
  return humanize(relation, "Source link");
}

function checkPresentation(outcome: string) {
  if (outcome === "pass") return { icon: CheckmarkCircle01Icon, className: "bg-status-progress/15 text-status-progress" };
  if (outcome === "fail") return { icon: CancelCircleIcon, className: "bg-destructive/10 text-destructive" };
  if (outcome === "error") return { icon: AlertCircleIcon, className: "bg-status-caution/15 text-status-caution" };
  return { icon: MinusSignCircleIcon, className: "bg-muted text-muted-foreground" };
}

function CurrentResult({ state, basePath }: { state: State; basePath: string }) {
  const claim = state.claims.find((candidate) => candidate.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const disclosing = checks.filter((check) => (check.shared_dependencies ?? []).length).length;
  const producer = review?.producer_package?.producer_actor ?? null;
  const reviewedAt = review?.reviewed_at ?? null;

  if (!claim) return <WhatIsKnown state={state} basePath={basePath} />;

  const sourceBindings = claim.source_bindings ?? [];
  return <section aria-labelledby="current-result-heading">
    <h2 id="current-result-heading" className="text-title">Current result</h2>

    <div className="vela-object-surface mt-5 overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="capitalize" variant={claim.standing === "accepted" ? "default" : "secondary"}>{humanize(claim.standing)}</Badge>
          <span className="text-compact font-medium">Result</span>
          <span className="text-meta text-muted-foreground">{claim.created ? formatAgo(claim.created) : "date not recorded"}</span>
        </div>
        {producer ? <Performer className="max-w-full" name={producer} kind="agent" performerId={producer} detail={[review?.producer_package?.replayability, review?.producer_package?.requested_change_kind].filter(Boolean).map((value) => humanize(value)).join(" · ") || "Submitted by"} /> : null}
      </header>

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 p-5 sm:p-7">
          {/* Unclamped. This is the accepted Result's own assertion — the subject of
              the page — and `line-clamp-4` cut a 782-character assertion at four
              lines with no expand control and no link to the full text beside
              it. An ellipsis is not a reading of exact scientific state. The
              measure already caps the line length; the card has the height. */}
          <p className="max-w-[78ch] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-8"><AssertionText text={claim.assertion} /></p>
          {review?.producer_package?.submitted_at ? <p className="mt-5 text-meta text-muted-foreground">Submitted <time dateTime={review.producer_package.submitted_at}>{formatDate(review.producer_package.submitted_at)}</time></p> : null}

          <section aria-labelledby="checks-heading" className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b pb-2">
              <h3 id="checks-heading" className="text-subtitle">Checks</h3>
              {/* Not a score. Checks answer different questions and do not
                  combine into one verdict.
                  Declaring independence and disclosing a shared dependency are
                  separate facts, and a check can do both — these two declare
                  independence of the submitting agent while sharing its model
                  provider. Counting only checks that did both would have
                  reported "0 independent of the submitter", which is false of
                  a record that names the submitter in `independent_of`. The
                  disclosure is the more informative half, so it is the one
                  counted. */}
              <p className="text-meta text-muted-foreground">
                {checks.length} {checks.length === 1 ? "check" : "checks"}
                {disclosing ? <> · {disclosing === checks.length && checks.length > 1 ? "each discloses" : `${disclosing} ${disclosing === 1 ? "discloses" : "disclose"}`} a shared dependency with the work</> : null}
              </p>
            </div>
            {checks.length ? <ItemGroup className="gap-0 divide-y">{checks.map((check) => {
              const presentation = checkPresentation(check.outcome);
              const independence = checkIndependence(check);
              return <Item key={check.verification_record_id} className="vela-object-row items-start rounded-md border-0 px-2 py-4">
                <ItemMedia variant="icon" data-check-outcome={check.outcome} className={`mt-0.5 size-8 rounded-full ${presentation.className}`}><HugeiconsIcon icon={presentation.icon} aria-hidden /></ItemMedia>
                <ItemContent>
                  <ItemTitle className="line-clamp-none">{humanize(check.property, "Scoped check")}</ItemTitle>
                  <div className="text-meta"><Attribution record={check} producer={producer} /></div>
                  {/* What a check does not establish is the half a reader is
                      most likely to assume away, so it is stated rather than
                      disclosed. A pass that is silent about its limits reads
                      as a pass without any. */}
                  {check.does_not_establish?.length ? <p className="mt-2 max-w-[72ch] rounded-md bg-status-caution/8 px-2.5 py-2 text-micro leading-5 text-muted-foreground"><span className="font-medium text-foreground">Does not establish:</span> {check.does_not_establish.join(" ")}</p> : null}
                </ItemContent>
                {/* A Badge is `shrink-0 whitespace-nowrap`, and these two are
                    long ("Independent · 1 shared"). Beside the content on a
                    narrow row they took the width and left the check's own
                    title and attribution in a 35px column. `Item` already
                    wraps, so below `sm` the badges take their own line and the
                    content gets the row back. */}
                <ItemActions className="w-full flex-row flex-wrap justify-start gap-1.5 sm:w-auto sm:flex-col sm:items-end">
                  <Badge variant={check.outcome === "pass" ? "default" : "outline"}>{outcomeLabel(check.outcome)}</Badge>
                  <Badge variant="outline" className={independence.className}>{independence.label}</Badge>
                </ItemActions>
              </Item>;
            })}</ItemGroup> : <Empty className="border-0 py-6">
              <EmptyHeader>
                <EmptyTitle>No check is retained</EmptyTitle>
                <EmptyDescription>This result was accepted without a scoped check recorded against it here.</EmptyDescription>
              </EmptyHeader>
            </Empty>}
          </section>

          <section aria-labelledby="source-bindings-heading" className="mt-7">
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <h3 id="source-bindings-heading" className="text-subtitle">Linked sources</h3>
              <Badge variant="outline">{sourceBindings.length}</Badge>
            </div>
            {sourceBindings.length ? <ItemGroup className="gap-0 divide-y">{sourceBindings.map((binding) => {
              const occurrence = state.sources.occurrences.find((candidate) => candidate.source_id === binding.source_id && candidate.native_id === binding.native_id);
              return <Item key={binding.binding_id} className="vela-object-row items-start rounded-md border-0 px-2 py-4">
                <ItemMedia variant="icon" className="mt-0.5 size-8 rounded-md bg-status-evidence/10 text-status-evidence"><HugeiconsIcon icon={SourceCodeIcon} aria-hidden /></ItemMedia>
                <ItemContent>
                  <ItemTitle className="line-clamp-none">{occurrence?.source_label ?? binding.source_id}</ItemTitle>
                  <ItemDescription className="vela-exact-text line-clamp-none font-mono text-micro">{binding.native_id}</ItemDescription>
                  <p className="text-micro text-muted-foreground">{sourceRelationLabel(binding.relation_kind)} · {humanize(binding.translation_disposition, "mapping not resolved")} · no authority effect</p>
                </ItemContent>
                <ItemActions><span className="hidden text-micro text-muted-foreground sm:inline">{sourceRelationLabel(binding.relation_kind)}</span></ItemActions>
              </Item>;
            })}</ItemGroup> : <Empty className="border-0 py-6">
              <EmptyHeader>
                <EmptyTitle>No source is linked</EmptyTitle>
                <EmptyDescription>Nothing in this release ties this result to an exact declaration or revision.</EmptyDescription>
              </EmptyHeader>
            </Empty>}
          </section>
        </div>

        <aside aria-label="Result details" className="border-t bg-muted/10 xl:border-l xl:border-t-0">
          <dl className="divide-y">
            <div className="px-5 py-4"><dt className="text-micro text-muted-foreground">Decision here</dt><dd className="mt-1 flex flex-wrap items-center gap-2 text-compact font-medium"><span>{review ? humanize(review.status) : "None"}</span>{review?.decision_actor_class ? <Badge variant="outline">{review.decision_actor_class}</Badge> : null}</dd>{reviewedAt ? <dd className="mt-1 text-micro text-muted-foreground">Recorded in {state.repositoryName} · {formatDate(reviewedAt)}</dd> : null}</div>
            <div className="px-5 py-4"><dt className="text-micro text-muted-foreground">Verification</dt><dd className="mt-1 text-compact font-medium">{checks.length} scoped {checks.length === 1 ? "check" : "checks"}</dd><dd className="mt-1 text-micro text-muted-foreground">Independence and limits are declared per check.</dd></div>
            <div className="px-5 py-4"><dt className="text-micro text-muted-foreground">Source code</dt><dd className="mt-1 text-compact font-medium">Not recorded in a checkable form</dd><dd className="mt-1 text-micro text-muted-foreground">The result may name commits, but this page does not check that they exist, or that they were merged.</dd></div>
            <div className="px-5 py-4"><dt className="text-micro text-muted-foreground">Links to formal statements</dt><dd className="mt-1 text-compact font-medium">{sourceBindings.length ? `${sourceBindings.length} exact ${sourceBindings.length === 1 ? "reference" : "references"}` : "None recorded"}</dd><dd className="mt-1 text-micro text-muted-foreground">A link does not mean the source project accepted the result, nor that it was accepted here.</dd></div>
            <div className="px-5 py-4"><dt className="text-micro text-muted-foreground">Result</dt><dd className="mt-1 text-compact font-medium">{humanize(claim.assertion_type, "Research result")} · {claim.evidence_count ?? 0} {(claim.evidence_count ?? 0) === 1 ? "evidence item" : "evidence items"}</dd></div>
          </dl>
          <div className="space-y-2 border-t p-4">
            <Button className="w-full" nativeButton={false} size="sm" render={<Link href={`/repositories/${state.repositorySlug}/claims/${encodeURIComponent(claim.id)}`} />}>Open result</Button>
            {review ? <Button className="w-full" nativeButton={false} size="sm" variant="outline" render={<Link href={`/repositories/${state.repositorySlug}/proposals/${review.proposal_id}`} />}>Review and decision</Button> : null}
            <Button className="w-full" nativeButton={false} size="sm" variant="ghost" render={<Link href={`${basePath}/sources?`} />}>Browse sources</Button>
          </div>
        </aside>
      </div>
    </div>

    <Disclosure className="mt-4 rounded-lg border px-4 py-3 text-meta" summaryClassName="font-medium" summary="Technical details"><dl className="mt-3 grid gap-x-6 gap-y-2 text-micro sm:grid-cols-2"><div><dt className="text-muted-foreground">Canonical source</dt><dd className="font-mono break-all">{state.source.source_id} · {state.source.native_id}</dd></div><div><dt className="text-muted-foreground">Problem record</dt><dd className="font-mono break-all">{state.anchor.problemRecordRoot}</dd></div><div><dt className="text-muted-foreground">Contribution</dt><dd className="font-mono break-all">{claim.id}</dd></div>{review ? <div><dt className="text-muted-foreground">Proposed change</dt><dd className="font-mono break-all">{review.proposal_id}</dd></div> : null}<div><dt className="text-muted-foreground">Projection</dt><dd className="font-mono break-all">{state.anchor.projectionReleaseRoot}</dd></div><div><dt className="text-muted-foreground">Source commit</dt><dd className="font-mono break-all">{state.anchor.sourceCommit}</dd></div></dl></Disclosure>
  </section>;
}

function ResearchFiles({ state, basePath, selectedFile, selectedDeclaration }: { state: State; basePath: string; selectedFile?: string; selectedDeclaration?: string }) {
  const formal = state.sources.occurrences.filter((occurrence) => occurrence.formal && occurrence.summary?.trim());
  const files = new Map<string, SourceOccurrence[]>();
  for (const occurrence of formal) {
    const path = formalFilePath(occurrence) ?? `${occurrence.source_label}/retained-declarations`;
    files.set(path, [...(files.get(path) ?? []), occurrence]);
  }
  const formalKeys = new Set(formal.map((occurrence) => occurrence.occurrence_key));
  const excerptGroups = new Map<string, SourceStatement[]>();
  for (const statement of state.sources.statements.filter((candidate) => !formalKeys.has(candidate.occurrence_key))) {
    const occurrence = state.sources.occurrences.find((candidate) => candidate.occurrence_key === statement.occurrence_key);
    const label = occurrence?.source_label ?? statement.source_id.replace(/^source:/u, "");
    const path = `Retained excerpts/${label}`;
    excerptGroups.set(path, [...(excerptGroups.get(path) ?? []), statement]);
  }
  const entries: FileEntry[] = [
    ...[...files.entries()].map(([path, records]) => ({ kind: "formal" as const, path, records })),
    ...[...excerptGroups.entries()].map(([path, records]) => ({ kind: "statements" as const, path, records })),
  ].sort((left, right) => left.path.localeCompare(right.path));
  const recordSelector = (entry: FileEntry, record: SourceOccurrence | SourceStatement) => (
    entry.kind === "formal" ? (record as SourceOccurrence).native_id : (record as SourceStatement).statement_id
  );
  const selectedByRecord = selectedDeclaration
    ? entries.find((entry) => entry.records.some((record) => (
        recordSelector(entry, record) === selectedDeclaration
        || ("occurrence_key" in record && record.occurrence_key === selectedDeclaration)
      )))
    : null;
  const selected = selectedByRecord ?? entries.find((entry) => entry.path === selectedFile) ?? entries[0] ?? null;
  const activeRecord = selected?.records.find((record) => (
    recordSelector(selected, record) === selectedDeclaration
    || ("occurrence_key" in record && record.occurrence_key === selectedDeclaration)
  )) ?? selected?.records[0] ?? null;

  return <ProblemFiles
    state={state}
    basePath={basePath}
    entries={entries}
    selected={selected}
    activeRecord={activeRecord}
    activeKey={activeRecord && selected ? recordSelector(selected, activeRecord) : null}
  />;
}

export function ProblemResearch({ state, basePath, view, selectedFile, selectedDeclaration, frontier }: { state: State; basePath: string; view: ProblemResearchView; selectedFile?: string; selectedDeclaration?: string; frontier?: FrontierTimelineData }) {
  return <>
    {/* Every tool gets the page. Contributions and History were capped at
        `max-w-5xl` inside a canvas shell, so they stranded a third of the
        viewport while Files beside them ran full width — the same Problem
        appeared to change page size when a reader switched tools. Reading
        measure belongs to the prose that needs it, and the assertion, the
        checks and the spine each already carry their own. */}
    <div className={`min-w-0 ${view === "contributions" || view === "timeline" ? "space-y-12" : ""}`}>
      {view === "map" ? <CurrentResult state={state} basePath={basePath} /> : null}
      {view === "contributions" ? <><CurrentResult state={state} basePath={basePath} /><ProblemEvidence state={state} /></> : null}
      {view === "files" ? <ResearchFiles state={state} basePath={basePath} selectedFile={selectedFile} selectedDeclaration={selectedDeclaration} /> : null}
      {view === "timeline" ? <>
        <ProblemHistory state={state} frontier={frontier} />
        {/* Upstream review of the source material itself. For a Problem with
            no Contribution, this is the only change record that exists — and
            it is where a semantic defect in a merged, approved pull request
            becomes visible. It is source-reported, never a Vela Decision. */}
        <FormalConjecturesAudit records={state.sourceAudits} />
      </> : null}
    </div>
  </>;
}
