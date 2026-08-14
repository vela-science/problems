import Link from "next/link";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FormalConjecturesAuditRecord } from "@vela/projection-data";
import {
  formalConjecturesAuditProjection,
  formalConjecturesAuditProjectionRoot,
} from "@vela/projection-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { publicProblemPathFromContext } from "@vela/projection-data/problem-public-route-context";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@vela/ui/components/collapsible";
import { RootFact } from "@/components/vela/root-fact";

function words(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function outcomeVariant(outcome: FormalConjecturesAuditRecord["checks"][number]["outcome"]) {
  if (outcome === "fail") return "destructive" as const;
  if (outcome === "pass") return "secondary" as const;
  return "outline" as const;
}

function AuditRecord({ record }: { record: FormalConjecturesAuditRecord }) {
  const state = record.observed_pull_request_state;
  return <article className="min-w-0 border-t border-border/65 py-7 first:border-t-0 first:pt-0 last:pb-0" aria-labelledby={`audit-${record.fixture_id}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        <p className="font-mono text-micro text-muted-foreground">Formal Conjectures PR #{record.pull_request.number}</p>
        <h3 id={`audit-${record.fixture_id}`} className="mt-1 text-subtitle [overflow-wrap:anywhere]">{record.changed_paths[0]}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">PR {words(state.state).toLowerCase()}</Badge>
        <Badge variant="outline">review {words(state.review_decision).toLowerCase()}</Badge>
        <Badge variant="secondary">source audit: {words(record.advisory_disposition)}</Badge>
      </div>
    </div>

    <div className="mt-5 space-y-5">
      {record.checks.map((check) => <div key={check.id} className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="flex flex-wrap content-start gap-2">
          <Badge variant={outcomeVariant(check.outcome)}>{check.outcome}</Badge>
          <span className="pt-1 font-mono text-micro text-muted-foreground">{check.kind}</span>
        </div>
        <div>
          <p className="text-label">{words(check.property)}</p>
          <p className="mt-1 max-w-[78ch] text-body leading-6 text-muted-foreground">{check.statement}</p>
          {check.witness ? <p className="mt-2 max-w-[78ch] text-meta leading-5">Witness: {check.witness}</p> : null}
          {check.conditions.map((condition) => <p key={condition} className="mt-2 max-w-[78ch] text-meta leading-5">Condition: {condition}</p>)}
          <p className="mt-2 max-w-[78ch] text-meta leading-5 text-muted-foreground">Limit: {check.limitations.join(" ")}</p>
        </div>
      </div>)}
    </div>

    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Button className="min-h-11" nativeButton={false} variant="outline" render={<a href={record.pull_request.url} />}>Open upstream PR</Button>
      {record.problem_ref ? <Button className="min-h-11" nativeButton={false} variant="ghost" render={<Link href={publicProblemPathFromContext("math", String(record.problem_ref.problem_number))} />}>Open Problem {record.problem_ref.problem_number}</Button> : null}
      <span className="font-mono text-micro text-muted-foreground">head {record.head.commit_oid.slice(0, 10)}</span>
    </div>

    <Collapsible className="group/audit mt-5">
      <CollapsibleTrigger className="flex min-h-11 items-center gap-2 text-left text-label focus-visible:outline-2 focus-visible:outline-offset-4">
        <span>Exact source roots</span>
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden className="size-4 transition-transform duration-200 group-data-open/audit:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-open:animate-in data-open:fade-in data-closed:animate-out data-closed:fade-out">
        <dl className="grid gap-3 pt-3 sm:grid-cols-2">
          <RootFact label="Audit record" value={record.root} />
          <RootFact label="Audit core" value={record.core_root} />
          <RootFact label="Audit observation" value={record.observation_root} />
          <RootFact label="Source head" value={record.head.commit_oid} />
        </dl>
      </CollapsibleContent>
    </Collapsible>
  </article>;
}

export function FormalConjecturesAudit({
  records,
  completeInventory = false,
}: {
  records: FormalConjecturesAuditRecord[];
  completeInventory?: boolean;
}) {
  if (!records.length) return null;
  return <section aria-labelledby="source-review-heading">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h2 id="source-review-heading" className="text-title">Source review</h2>
      <span className="text-meta text-muted-foreground">{completeInventory ? "Complete five-record audit inventory" : `${records.length} exact matching record${records.length === 1 ? "" : "s"}`}</span>
    </div>
    <p className="mt-4 max-w-3xl text-body leading-6 text-muted-foreground">
      Native pull-request state, mechanical checks, semantic findings, and artifact availability are separate source facts. None is a Vela Verification, Decision, or change to Math Standing.
    </p>
    <div className="mt-7">{records.map((record) => <AuditRecord key={record.fixture_id} record={record} />)}</div>
    <div className="mt-7 rounded-lg bg-muted/25 p-4">
      <p className="text-label">Read-only projection · authority effect none</p>
      <p className="mt-1 text-meta leading-5 text-muted-foreground">Approval and merge remain upstream PR state. A passing build does not establish semantic fidelity. An unavailable artifact identity is not a proof failure.</p>
      <p className="mt-3 text-meta leading-5 text-muted-foreground">
        Adapter conformance {formalConjecturesAuditProjection.conformance.requirement_ids.length} / 9: exact source revision, bounded complete reads, typed roots, custody, implementation identity, reconstructibility, unsupported-state refusal, rights, and lifecycle semantics.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RootFact label="Web read projection" value={formalConjecturesAuditProjectionRoot} />
        <RootFact label="Math source projection" value={formalConjecturesAuditProjection.math_projection.projection_root} />
        <RootFact label="Adapter profile" value={formalConjecturesAuditProjection.conformance.profile_root} />
        <RootFact label="Adapter contract" value={formalConjecturesAuditProjection.conformance.contract_root} />
      </div>
      <div className="mt-4"><Button className="min-h-11" nativeButton={false} variant="outline" render={<a href={formalConjecturesAuditProjection.math_projection.public_locator} />}>Inspect exact Math projection</Button></div>
      {!completeInventory ? <div className="mt-3"><Button className="min-h-11" nativeButton={false} variant="ghost" render={<Link href="/sources/source%3Aformal-conjectures-pr-audit" />}>View complete five-record source audit</Button></div> : null}
    </div>
  </section>;
}
