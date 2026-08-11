import Link from "next/link";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { ExactRoot } from "@/components/exact-root";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

export function ProblemState({ state, dossier, dossierRepository }: { state: State; dossier?: string; dossierRepository?: string }) {
  return <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div className="space-y-10">
      <section aria-labelledby="statement-heading">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Source statement</Badge><Badge variant="secondary">{state.problem.declared_status}</Badge>{state.problem.formalized ? <Badge>formalized</Badge> : null}</div>
        <h2 id="statement-heading" className="sr-only">Problem statement</h2>
        {state.problem.statement
          ? <div className="mt-5 text-display"><ScientificText text={decodeHtmlEntities(state.problem.statement)} /></div>
          : <div className="mt-5 border-l-2 border-foreground pl-4"><p className="text-title">{state.source.title}</p><p className="mt-2 text-body text-muted-foreground">The projection retains the exact source record, metadata, and locator but does not mirror statement prose for this source. Open the upstream record for the complete statement.</p></div>}
        <dl className="mt-6 grid gap-4 border-y py-5 text-meta sm:grid-cols-3">
          <div><dt className="text-eyebrow uppercase text-muted-foreground">Repository</dt><dd className="mt-1 font-medium">{state.repositoryName}</dd></div>
          <div><dt className="text-eyebrow uppercase text-muted-foreground">Sources</dt><dd className="mt-1 font-medium">{state.problem.source_count}</dd></div>
          <div><dt className="text-eyebrow uppercase text-muted-foreground">Open targets</dt><dd className="mt-1 font-medium">{state.problem.offer_count}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="standing-heading">
        <h2 id="standing-heading" className="text-title">Repository Standing</h2>
        <p className="mt-2 max-w-prose text-body text-muted-foreground">This is the authority-bearing state read from Observatory. Work mode cannot write it.</p>
        {state.claims.length ? <ul className="mt-4 divide-y border-y">{state.claims.map((claim) => <li key={claim.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div><p className="font-mono text-meta break-all">{claim.id}</p><p className="mt-1 text-body">{claim.assertion}</p></div><Badge variant={claim.standing === "accepted" ? "default" : "secondary"}>{claim.standing}</Badge></li>)}</ul> : <div className="mt-4 border border-dashed p-5"><p className="font-medium">No Claim admitted here.</p><p className="mt-1 text-meta text-muted-foreground">The source Problem exists exactly; absence of local Standing is represented rather than inferred.</p></div>}
      </section>

      <section aria-labelledby="source-heading">
        <h2 id="source-heading" className="text-title">Exact source observation</h2>
        <p className="mt-2 max-w-prose text-body text-muted-foreground">The Problem is bound to a retained source-native record at this projection root. No page-local parser or index reconstructed it.</p>
        <dl className="mt-5 space-y-3 border p-4 sm:p-5">
          <ExactRoot label="Problem row" value={state.source.row_root} />
          <ExactRoot label="Metadata" value={state.source.metadata_root} />
          <ExactRoot label="Observation" value={state.source.observation_root} />
          {state.source.content_root ? <ExactRoot label="Content" value={state.source.content_root} /> : null}
        </dl>
        {state.locator ? <Button className="mt-4" nativeButton={false} variant="outline" render={<a href={state.locator} />}>Open upstream source</Button> : null}
      </section>
    </div>

    <aside className="space-y-6 lg:sticky lg:top-20 lg:h-fit">
      <section className="border p-4">
        <p className="text-eyebrow uppercase text-muted-foreground">Exact anchor</p>
        <dl className="mt-4 space-y-4">
          <div><dt className="text-meta text-muted-foreground">Repository root</dt><dd className="mt-1 break-all font-mono text-micro">{state.anchor.repositoryRoot}</dd></div>
          <div><dt className="text-meta text-muted-foreground">Projection root</dt><dd className="mt-1 break-all font-mono text-micro">{state.anchor.projectionReleaseRoot}</dd></div>
          <div><dt className="text-meta text-muted-foreground">Source commit</dt><dd className="mt-1 break-all font-mono text-micro">{state.anchor.sourceCommit}</dd></div>
        </dl>
      </section>
      <section className="border-l-2 border-foreground pl-4">
        <p className="font-medium">Continue in exact context</p>
        <div className="mt-3 grid gap-2 text-meta">
          <Link className="underline underline-offset-4" href={`/p/${state.repositorySlug}/${state.problem.problem}?mode=work`}>Start or resume work</Link>
          <a className="underline underline-offset-4" href={`https://app.vela.space/repositories/${state.repositorySlug}/problems/${state.problem.problem}`}>Inspect in Observatory</a>
          {dossier ? <a className="underline underline-offset-4" href={`https://app.vela.space/repositories/${dossierRepository ?? state.repositorySlug}/dossiers/${dossier}`}>Read grounded Dossier</a> : null}
        </div>
      </section>
    </aside>
  </div>;
}
