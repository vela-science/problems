import Link from "next/link";
import {
  AlertCircleIcon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  GitForkIcon,
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
import { FormalConjecturesAudit } from "@/components/vela/formal-conjectures-audit";
import { formalFilePath } from "@/components/vela/formal-statement-card";
import { ProblemFiles, type FileEntry } from "@/components/vela/problem-files";
import { WhatIsKnown } from "@/components/vela/problem-known";
import { ProblemEvidence } from "@/components/vela/problem-evidence";
import { ProblemHistory } from "@/components/vela/problem-history";
import { currentReview } from "@/components/vela/problem-provenance";
import type { ProblemResearchView } from "@/components/vela/problem-state";
import { formatAgo, formatDate } from "@/lib/format";
import type { ScientificProblemState } from "@/lib/scientific-state";

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

function CurrentContribution({ state, basePath }: { state: State; basePath: string }) {
  const claim = state.claims.find((candidate) => candidate.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const producer = review?.producer_package?.producer_actor ?? null;
  const reviewedAt = review?.reviewed_at ?? null;

  if (!claim) return <WhatIsKnown state={state} basePath={basePath} />;

  const sourceBindings = claim.source_bindings ?? [];
  return <section aria-labelledby="current-contribution-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="current-contribution-heading" className="text-title">Current contribution</h2>
      <Button nativeButton={false} size="sm" variant="outline" render={<Link href={`/graph?repository=${state.repositorySlug}&lens=research&node=${encodeURIComponent(claim.id)}`} />}>
        <HugeiconsIcon icon={GitForkIcon} aria-hidden /> Open map
      </Button>
    </div>

    <div className="mt-5 overflow-hidden rounded-xl border bg-background">
      <header className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-3 sm:px-5">
        <Badge className="capitalize" variant={claim.standing === "accepted" ? "default" : "secondary"}>{humanize(claim.standing)}</Badge>
        <span className="text-compact font-medium">Contribution</span>
        <span className="text-meta text-muted-foreground">{claim.created ? formatAgo(claim.created) : "date not recorded"}</span>
      </header>

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 p-5 sm:p-7">
          <p className="line-clamp-4 max-w-[78ch] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-8"><AssertionText text={claim.assertion} /></p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-meta text-muted-foreground">
            {producer ? <span>Submitted by <strong className="font-medium text-foreground">{producer}</strong></span> : null}
            {review?.producer_package?.submitted_at ? <time dateTime={review.producer_package.submitted_at}>{formatDate(review.producer_package.submitted_at)}</time> : null}
          </div>

          <section aria-labelledby="checks-heading" className="mt-8">
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <h3 id="checks-heading" className="text-subtitle">Checks</h3>
              <Badge variant="outline">{checks.length} {checks.length === 1 ? "check" : "checks"}</Badge>
            </div>
            {checks.length ? <ItemGroup className="gap-0 divide-y">{checks.map((check) => {
              const reviewer = check.reviewer_display_name || check.verifier_actor;
              const method = [check.reviewer_provider, check.reviewer_version].filter(Boolean).join(" · ");
              const presentation = checkPresentation(check.outcome);
              return <Item key={check.verification_record_id} className="items-start rounded-none border-0 px-0 py-4">
                <ItemMedia variant="icon" data-check-outcome={check.outcome} className={`mt-0.5 size-8 rounded-full ${presentation.className}`}><HugeiconsIcon icon={presentation.icon} aria-hidden /></ItemMedia>
                <ItemContent>
                  <ItemTitle className="line-clamp-none">{humanize(check.property, "Scoped check")}</ItemTitle>
                  <ItemDescription className="line-clamp-none">{reviewer}{method ? ` · ${method}` : ""}</ItemDescription>
                  {check.does_not_establish?.length ? <details className="text-micro text-muted-foreground"><summary className="w-fit cursor-pointer font-medium text-foreground">Limits</summary><p className="mt-1 max-w-[72ch]">{check.does_not_establish.join("; ")}</p></details> : null}
                </ItemContent>
                <ItemActions><Badge variant={check.outcome === "pass" ? "default" : "outline"}>{outcomeLabel(check.outcome)}</Badge></ItemActions>
              </Item>;
            })}</ItemGroup> : <p className="py-5 text-compact text-muted-foreground">No check is retained for this contribution.</p>}
          </section>

          <section aria-labelledby="source-bindings-heading" className="mt-7">
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <h3 id="source-bindings-heading" className="text-subtitle">Linked sources</h3>
              <Badge variant="outline">{sourceBindings.length}</Badge>
            </div>
            {sourceBindings.length ? <ItemGroup className="gap-0 divide-y">{sourceBindings.map((binding) => {
              const occurrence = state.sources.occurrences.find((candidate) => candidate.source_id === binding.source_id && candidate.native_id === binding.native_id);
              return <Item key={binding.binding_id} className="items-start rounded-none border-0 px-0 py-4">
                <ItemMedia variant="icon" className="mt-0.5 size-8 rounded-md bg-status-evidence/10 text-status-evidence"><HugeiconsIcon icon={SourceCodeIcon} aria-hidden /></ItemMedia>
                <ItemContent>
                  <ItemTitle className="line-clamp-none">{occurrence?.source_label ?? binding.source_id}</ItemTitle>
                  <ItemDescription className="line-clamp-none font-mono text-micro">{binding.native_id}</ItemDescription>
                </ItemContent>
                <ItemActions><span className="hidden text-micro text-muted-foreground sm:inline">{sourceRelationLabel(binding.relation_kind)}</span></ItemActions>
              </Item>;
            })}</ItemGroup> : <p className="py-5 text-compact text-muted-foreground">No exact source binding is retained.</p>}
          </section>
        </div>

        <aside aria-label="Contribution details" className="border-t bg-muted/10 xl:border-l xl:border-t-0">
          <dl className="divide-y">
            <div className="px-5 py-4"><dt className="text-micro text-muted-foreground">Result type</dt><dd className="mt-1 text-compact font-medium">{humanize(claim.assertion_type, "Research result")}</dd></div>
            <div className="px-5 py-4"><dt className="text-micro text-muted-foreground">Evidence</dt><dd className="mt-1 text-compact font-medium">{claim.evidence_count ?? 0} {(claim.evidence_count ?? 0) === 1 ? "item" : "items"}</dd></div>
            <div className="px-5 py-4"><dt className="text-micro text-muted-foreground">Decision</dt><dd className="mt-1 flex flex-wrap items-center gap-2 text-compact font-medium"><span>{review ? humanize(review.status) : "None"}</span>{review?.decision_actor_class ? <Badge variant="outline">{review.decision_actor_class}</Badge> : null}</dd>{reviewedAt ? <dd className="mt-1 text-micro text-muted-foreground">{formatDate(reviewedAt)}</dd> : null}</div>
            <div className="px-5 py-4"><dt className="text-micro text-muted-foreground">Revision</dt><dd className="mt-1 text-compact font-medium">{claim.revision ?? "Not recorded"}</dd></div>
            <div className="px-5 py-4"><dt className="text-micro text-muted-foreground">Current in</dt><dd className="mt-1 text-compact font-medium">{state.repositoryName}</dd></div>
          </dl>
          <div className="space-y-2 border-t p-4">
            <Button className="w-full" nativeButton={false} size="sm" render={<Link href={`/repositories/${state.repositorySlug}/claims/${encodeURIComponent(claim.id)}`} />}>Open contribution</Button>
            {review ? <Button className="w-full" nativeButton={false} size="sm" variant="outline" render={<Link href={`/repositories/${state.repositorySlug}/proposals/${review.proposal_id}`} />}>Review and decision</Button> : null}
            <Button className="w-full" nativeButton={false} size="sm" variant="ghost" render={<Link href={`${basePath}?view=files`} />}>Browse files</Button>
          </div>
        </aside>
      </div>
    </div>

    <details className="mt-4 rounded-lg border px-4 py-3 text-meta"><summary className="cursor-pointer font-medium">Technical details</summary><dl className="mt-3 grid gap-x-6 gap-y-2 text-micro sm:grid-cols-2"><div><dt className="text-muted-foreground">Canonical source</dt><dd className="font-mono break-all">{state.source.source_id} · {state.source.native_id}</dd></div><div><dt className="text-muted-foreground">Problem record</dt><dd className="font-mono break-all">{state.anchor.problemRecordRoot}</dd></div><div><dt className="text-muted-foreground">Contribution</dt><dd className="font-mono break-all">{claim.id}</dd></div>{review ? <div><dt className="text-muted-foreground">Proposed change</dt><dd className="font-mono break-all">{review.proposal_id}</dd></div> : null}<div><dt className="text-muted-foreground">Projection</dt><dd className="font-mono break-all">{state.anchor.projectionReleaseRoot}</dd></div><div><dt className="text-muted-foreground">Source commit</dt><dd className="font-mono break-all">{state.anchor.sourceCommit}</dd></div></dl></details>
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

export function ProblemResearch({ state, basePath, view, selectedFile, selectedDeclaration }: { state: State; basePath: string; view: ProblemResearchView; selectedFile?: string; selectedDeclaration?: string }) {
  return <>
    <div className={`min-w-0 ${view === "contributions" || view === "timeline" ? "max-w-5xl space-y-12" : ""}`}>
      {view === "map" ? <CurrentContribution state={state} basePath={basePath} /> : null}
      {view === "contributions" ? <><CurrentContribution state={state} basePath={basePath} /><ProblemEvidence state={state} /></> : null}
      {view === "files" ? <ResearchFiles state={state} basePath={basePath} selectedFile={selectedFile} selectedDeclaration={selectedDeclaration} /> : null}
      {view === "timeline" ? <>
        <ProblemHistory state={state} />
        {/* Upstream review of the source material itself. For a Problem with
            no Contribution, this is the only change record that exists — and
            it is where a semantic defect in a merged, approved pull request
            becomes visible. It is source-reported, never a Vela Decision. */}
        <FormalConjecturesAudit records={state.sourceAudits} />
      </> : null}
    </div>
  </>;
}
