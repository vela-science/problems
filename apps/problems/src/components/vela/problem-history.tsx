import { Button } from "@vela/ui/components/button";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { RootFact } from "@/components/vela/root-fact";
import { RecordId } from "@/components/vela/record-id";
import { formatDate } from "@/lib/format";
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

/* How this Problem's record changed: every proposed change under its own
 * status word, correction and supersession relations with predecessors
 * retained, and the exact technical provenance. This is the disclosure
 * layer, so nothing sits behind a Collapsible — the address is the
 * disclosure, and every fact below is complete HTML here. */
export function ProblemHistory({ state }: { state: State }) {
  const corrections = state.claims.flatMap((claim) => correctionRelations(claim).map((relation) => ({ claim, relation })));
  return <>
    <section aria-labelledby="proposed-changes-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="proposed-changes-heading" className="text-title">Proposed changes</h2>{state.reviews.length ? <span className="text-meta text-muted-foreground">{state.reviews.length} {state.reviews.length === 1 ? "record" : "records"}</span> : null}</div>
      {state.reviews.length ? <ul className="mt-5 space-y-2 text-compact">
        {state.reviews.map((review) => <li key={review.proposal_id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge axis="proposal" state={review.status}>{review.status.replaceAll("_", " ")}</StatusBadge>
          <a href={`/repositories/${state.repositorySlug}/proposals/${review.proposal_id}`} className="min-w-0 underline underline-offset-4"><RecordId value={review.proposal_id} copy={false} /></a>
          <span className="text-micro text-muted-foreground">{formatDate(review.reviewed_at ?? review.created_at)}</span>
        </li>)}
      </ul> : <p className="mt-4 max-w-2xl py-3 text-body text-muted-foreground">No proposed change is retained for this Problem.</p>}
    </section>

    <section aria-labelledby="correction-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="correction-heading" className="text-title">Correction history</h2>{corrections.length ? <span className="text-meta text-muted-foreground">{corrections.length} exact {corrections.length === 1 ? "relation" : "relations"}</span> : null}</div>
      {corrections.length ? <ItemGroup className="mt-5 divide-y">{corrections.map(({ claim, relation }) => <Item key={`${claim.id}:${relation.kind}:${relation.target_claim_id}`} className="items-start rounded-none px-0 py-4"><ItemContent className="gap-2"><ItemTitle className="line-clamp-none text-body font-normal">Claim {relation.kind === "corrects" ? "correction" : "supersession"}</ItemTitle><ItemDescription className="line-clamp-none flex flex-wrap items-center gap-x-2 gap-y-1"><RecordId value={claim.id} /><span>{relation.kind}</span><RecordId value={relation.target_claim_id} /></ItemDescription><p className="text-meta text-muted-foreground">The predecessor remains retained. This relation does not transport source equivalence or another Repository&apos;s Standing.</p></ItemContent></Item>)}</ItemGroup> : <p className="mt-4 max-w-2xl py-3 text-body text-muted-foreground">No correction or supersession relation is retained for the joined Claim.</p>}
    </section>

    <section aria-labelledby="exact-provenance-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="exact-provenance-heading" className="text-title">Exact provenance</h2><span className="text-meta text-muted-foreground">Roots, source, and advanced protocol record types</span></div>
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
    </section>
  </>;
}
