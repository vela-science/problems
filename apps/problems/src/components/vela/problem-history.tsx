import { Button } from "@vela/ui/components/button";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@vela/ui/components/empty";
import { RootFact } from "@/components/vela/root-fact";
import { RecordId } from "@/components/vela/record-id";
import { CorrectionComparison } from "@/components/vela/correction-comparison";
import { FrontierTimeline, type FrontierTimelineData } from "@/components/vela/frontier-timeline";
import { Actor, Performer } from "@/components/vela/actor";
import { formatDate } from "@/lib/format";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { Disclosure } from "@/components/vela/disclosure";

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
export function ProblemHistory({ state, frontier }: {
  state: State;
  /* Frontier movement is a separate reader that is not wired yet. The prop
     defaults to absent so this page renders unchanged until the integration
     commit maps the reader's output onto FrontierTimelineData. */
  frontier?: FrontierTimelineData;
}) {
  const corrections = state.claims.flatMap((claim) => correctionRelations(claim).map((relation) => ({ claim, relation })));
  return <>
    <section aria-labelledby="proposed-changes-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="proposed-changes-heading" className="text-title">Result history</h2><p className="mt-1 text-meta text-muted-foreground">Published changes, performers, checks, and later corrections.</p></div>{state.reviews.length ? <span className="text-meta text-muted-foreground">{state.reviews.length} {state.reviews.length === 1 ? "event" : "events"}</span> : null}</div>
      {state.reviews.length ? <ol className="relative mt-6 space-y-0 before:absolute before:bottom-5 before:left-[.9375rem] before:top-5 before:w-px before:bg-border">
        {state.reviews.map((review) => <li key={review.proposal_id} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
          <span aria-hidden className="relative z-10 mt-4 size-8 rounded-full border-8 border-background bg-status-evidence ring-1 ring-border forced-colors:border-2" />
          <article className="vela-object-surface vela-object-row min-w-0 overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
              {review.producer_package?.producer_actor
                ? <Performer name={review.producer_package.producer_actor} kind="agent" performerId={review.producer_package.producer_actor} detail="Submitted by" />
                : <p className="text-meta text-muted-foreground">Submitter not recorded</p>}
              <time dateTime={review.reviewed_at ?? review.created_at ?? undefined} className="text-meta text-muted-foreground">{formatDate(review.reviewed_at ?? review.created_at)}</time>
            </header>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge axis="proposal" state={review.status}>{review.status.replaceAll("_", " ")}</StatusBadge>{review.verification_record_count ? <span className="text-meta text-muted-foreground">{review.verification_record_count} {review.verification_record_count === 1 ? "check" : "checks"}</span> : null}</div>
              <p className="mt-3 text-label font-semibold">{review.status === "accepted" ? "Accepted here" : `Decision: ${review.status.replaceAll("_", " ")}`}</p>
              {review.claim_retirement ? <p className="mt-1 text-meta text-muted-foreground">The Result was later {review.claim_retirement}.</p> : null}
              {review.reviewed_by ? <div className="mt-3 text-meta text-muted-foreground">Decision recorded by <Actor name={review.reviewed_by} kind={review.decision_actor_class} performerId={review.reviewed_by} className="ms-1 align-middle" /></div> : null}
              <a href={`/repositories/${state.repositorySlug}/proposals/${review.proposal_id}`} className="mt-3 inline-block text-meta font-semibold text-primary underline-offset-4 hover:underline">Open change details <span className="sr-only"><RecordId value={review.proposal_id} copy={false} /></span></a>
            </div>
          </article>
        </li>)}
      </ol> : <Empty className="mt-5 border border-dashed">
        <EmptyHeader>
          <EmptyTitle>No result history yet</EmptyTitle>
          <EmptyDescription>No proposed change is retained for this Problem, so there is nothing to show a decision on.</EmptyDescription>
        </EmptyHeader>
      </Empty>}
    </section>

    <section aria-labelledby="correction-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="correction-heading" className="text-title">Correction history</h2>{corrections.length ? <span className="text-meta text-muted-foreground">{corrections.length} exact {corrections.length === 1 ? "relation" : "relations"}</span> : null}</div>
      {corrections.length ? <div className="mt-5 space-y-4">{corrections.map(({ claim, relation }) => {
        const predecessor = state.claims.find((candidate) => candidate.id === relation.target_claim_id);
        const isCurrent = claim.id === state.currentClaimId;
        return <article key={`${claim.id}:${relation.kind}:${relation.target_claim_id}`} className="vela-object-surface overflow-hidden">{/* The twin clamped previews that used to sit here were a third rendering
      of the same two assertions, above a full comparison of them. The diff
      below says what changed; the panes inside it still hold both in full. */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-3">
        <StatusBadge tone="caution">{relation.kind}</StatusBadge>
        <span className="text-meta text-muted-foreground">{isCurrent ? "produced the current Result" : "produced a later version"}</span>
      </div>{predecessor ? <div className="p-4"><CorrectionComparison kind={relation.kind as "corrects" | "supersedes"} before={predecessor.assertion} after={claim.assertion} /></div> : <div className="p-4"><p className="text-compact text-muted-foreground">The {relation.kind === "corrects" ? "corrected" : "superseded"} Result record is not retained in this release.</p></div>}<Disclosure className="border-t px-4 py-3 text-meta" summaryClassName="font-medium" summary="Exact identities"><div className="mt-3 flex flex-wrap items-center gap-2"><RecordId value={relation.target_claim_id} /><span aria-hidden>→</span><RecordId value={claim.id} /></div></Disclosure></article>;
      })}</div> : <div className="mt-5 rounded-lg border border-dashed p-5"><p className="text-label font-medium">No correction history</p></div>}
    </section>

    {frontier ? <FrontierTimeline states={frontier.states} gaps={frontier.gaps} /> : null}

    <Disclosure
      className="border-y py-1"
      summaryClassName="min-h-14 gap-4 py-3"
      summary={<span className="text-label font-medium">Technical details</span>}
      meta="Exact roots, source, and retained record identifiers"
    >
      <section aria-labelledby="exact-provenance-heading" className="pb-6 pt-3">
      <h2 id="exact-provenance-heading" className="sr-only">Exact provenance</h2>
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
    </Disclosure>
  </>;
}
