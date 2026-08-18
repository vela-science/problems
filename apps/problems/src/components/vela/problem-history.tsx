import { Button } from "@vela/ui/components/button";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { RootFact } from "@/components/vela/root-fact";
import { RecordId } from "@/components/vela/record-id";
import { CorrectionComparison } from "@/components/vela/correction-comparison";
import { Actor, Performer } from "@/components/vela/actor";
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
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="proposed-changes-heading" className="text-title">Result history</h2><p className="mt-1 text-meta text-muted-foreground">Published changes, performers, checks, and later corrections.</p></div>{state.reviews.length ? <span className="text-meta text-muted-foreground">{state.reviews.length} {state.reviews.length === 1 ? "event" : "events"}</span> : null}</div>
      {state.reviews.length ? <ol className="relative mt-6 space-y-0 before:absolute before:bottom-5 before:left-[.9375rem] before:top-5 before:w-px before:bg-border">
        {state.reviews.map((review) => <li key={review.proposal_id} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
          <span aria-hidden className="relative z-10 mt-4 size-8 rounded-full border-8 border-background bg-status-evidence ring-1 ring-border forced-colors:border-2" />
          <article className="vela-object-surface vela-object-row min-w-0 overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
              {review.producer_package?.producer_actor
                ? <Performer name={review.producer_package.producer_actor} detail="Result performer" />
                : <p className="text-meta text-muted-foreground">Result performer not retained</p>}
              <time dateTime={review.reviewed_at ?? review.created_at ?? undefined} className="text-meta text-muted-foreground">{formatDate(review.reviewed_at ?? review.created_at)}</time>
            </header>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge axis="proposal" state={review.status}>{review.status.replaceAll("_", " ")}</StatusBadge>{review.verification_record_count ? <span className="text-meta text-muted-foreground">{review.verification_record_count} {review.verification_record_count === 1 ? "check" : "checks"}</span> : null}</div>
              <p className="mt-3 text-label font-semibold">{review.status === "accepted" ? "Repository accepted this Result" : `Repository change ${review.status.replaceAll("_", " ")}`}</p>
              {review.claim_retirement ? <p className="mt-1 text-meta text-muted-foreground">The Result was later {review.claim_retirement}.</p> : null}
              {review.reviewed_by ? <div className="mt-3 text-meta text-muted-foreground">Decision recorded by <Actor name={review.reviewed_by} kind={review.decision_actor_class} className="ms-1 align-middle" /></div> : null}
              <a href={`/repositories/${state.repositorySlug}/proposals/${review.proposal_id}`} className="mt-3 inline-block text-meta font-semibold text-primary underline-offset-4 hover:underline">Open change details <span className="sr-only"><RecordId value={review.proposal_id} copy={false} /></span></a>
            </div>
          </article>
        </li>)}
      </ol> : <div className="mt-5 rounded-lg border border-dashed p-5"><p className="text-label font-medium">No Result history yet</p><p className="mt-1 text-meta text-muted-foreground">No proposed change is retained for this Problem.</p></div>}
    </section>

    <section aria-labelledby="correction-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="correction-heading" className="text-title">Correction history</h2>{corrections.length ? <span className="text-meta text-muted-foreground">{corrections.length} exact {corrections.length === 1 ? "relation" : "relations"}</span> : null}</div>
      {corrections.length ? <div className="mt-5 space-y-4">{corrections.map(({ claim, relation }) => {
        const predecessor = state.claims.find((candidate) => candidate.id === relation.target_claim_id);
        const isCurrent = claim.id === state.currentClaimId;
        return <article key={`${claim.id}:${relation.kind}:${relation.target_claim_id}`} className="vela-object-surface overflow-hidden"><div className="grid items-stretch sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)]"><div className="p-4"><p className="text-meta font-medium text-muted-foreground">Previous Result</p>{predecessor ? <p className="mt-2 line-clamp-3 text-compact">{predecessor.assertion}</p> : <p className="mt-2 text-compact text-muted-foreground">Statement not retained here</p>}</div><div className="grid place-items-center border-y bg-muted/20 px-2 py-3 text-center sm:border-x sm:border-y-0"><StatusBadge tone="caution">{relation.kind}</StatusBadge><span aria-hidden className="mt-1 text-muted-foreground">→</span></div><div className="p-4"><p className="text-meta font-medium text-muted-foreground">{isCurrent ? "Current Result" : "Later version"}</p><p className="mt-2 line-clamp-3 text-compact">{claim.assertion}</p></div></div>{predecessor ? <div className="border-t p-4"><CorrectionComparison kind={relation.kind as "corrects" | "supersedes"} before={predecessor.assertion} after={claim.assertion} /></div> : null}<details className="border-t px-4 py-3 text-meta"><summary className="cursor-pointer font-medium">Exact identities</summary><div className="mt-3 flex flex-wrap items-center gap-2"><RecordId value={relation.target_claim_id} /><span aria-hidden>→</span><RecordId value={claim.id} /></div></details></article>;
      })}</div> : <div className="mt-5 rounded-lg border border-dashed p-5"><p className="text-label font-medium">No correction history</p></div>}
    </section>

    <details className="group border-y py-1">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2"><span><span aria-hidden className="mr-2 inline-block transition-transform group-open:rotate-90">›</span><span className="text-label font-medium">Technical details</span></span><span className="text-meta text-muted-foreground">Exact roots, source, and retained record identifiers</span></summary>
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
    </details>
  </>;
}
