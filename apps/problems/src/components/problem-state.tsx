import Link from "next/link";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@vela/ui/components/collapsible";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { StateGlyph } from "@vela/ui/vela/state-glyph";
import { ExactRoot } from "@/components/exact-root";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

export function ProblemState({ state, dossier, dossierRepository }: { state: State; dossier?: string; dossierRepository?: string }) {
  return <div className="mt-10 max-w-5xl space-y-12">
    <section aria-labelledby="standing-heading">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-eyebrow uppercase text-muted-foreground">Scientific state</p><h2 id="standing-heading" className="mt-1 text-title">Current Standing</h2></div><span className="text-meta text-muted-foreground">{state.claims.length} local {state.claims.length === 1 ? "claim" : "claims"}</span></div>
      {state.claims.length ? <ItemGroup className="mt-5 gap-0 divide-y border-y">{state.claims.map((claim) => <Item key={claim.id} className="items-start rounded-none border-0 px-0 py-5">
        <ItemMedia className="pt-1"><StateGlyph standing={claim.standing} verification="not_attempted" /></ItemMedia>
        <ItemContent className="gap-2">
          <ItemTitle className="line-clamp-none text-body font-normal">{claim.assertion}</ItemTitle>
          <ItemDescription className="line-clamp-none flex flex-wrap items-center gap-2"><Badge variant={claim.standing === "accepted" ? "default" : "secondary"}>{claim.standing.replaceAll("_", " ")}</Badge><span>Repository-local Standing</span></ItemDescription>
        </ItemContent>
      </Item>)}</ItemGroup> : <div className="mt-4 border border-dashed p-5"><p className="font-medium">No local claim yet.</p><p className="mt-1 text-meta text-muted-foreground">The Problem is recorded, but this Repository has not admitted a claim about it.</p></div>}
    </section>

    <section aria-labelledby="open-work-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4"><div><p className="text-eyebrow uppercase text-muted-foreground">Next work</p><h2 id="open-work-heading" className="mt-1 text-title">Open obligations</h2></div><Button nativeButton={false} render={<Link href={`/p/${state.repositorySlug}/${state.problem.problem}?mode=work`} />}>Enter Work</Button></div>
      {state.offers.length ? <ItemGroup className="gap-0 divide-y">{state.offers.map((offer) => <Item key={offer.target_id} className="items-start rounded-none border-0 px-0 py-5">
        <ItemMedia className="w-10 self-start pt-0.5 font-mono text-meta text-muted-foreground">{offer.rank}</ItemMedia>
        <ItemContent className="gap-2">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{offer.lane}</Badge><span className="font-mono text-micro text-muted-foreground">{offer.target_id}</span></div>
          <ItemTitle className="line-clamp-none text-subtitle">{offer.title}</ItemTitle>
          <ItemDescription className="line-clamp-none max-w-[76ch]">{offer.objective}</ItemDescription>
        </ItemContent>
      </Item>)}</ItemGroup> : <p className="py-6 text-body text-muted-foreground">No bounded target is currently published for this Problem.</p>}
    </section>

    <Collapsible className="group/exact border-y py-5">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4">
        <span><span className="block text-subtitle">Exact basis</span><span className="mt-1 block text-meta text-muted-foreground">Roots, source, and advanced protocol records</span></span>
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden className="size-5 transition-transform duration-200 group-data-open/exact:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-open:animate-in data-open:fade-in data-open:slide-in-from-top-1 data-closed:animate-out data-closed:fade-out data-closed:slide-out-to-top-1">
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <dl className="space-y-3">
          <ExactRoot label="Problem row" value={state.source.row_root} />
          <ExactRoot label="Metadata" value={state.source.metadata_root} />
          <ExactRoot label="Observation" value={state.source.observation_root} />
          {state.source.content_root ? <ExactRoot label="Content" value={state.source.content_root} /> : null}
        </dl>
        <dl className="space-y-3">
          <ExactRoot label="Repository" value={state.anchor.repositoryRoot} />
          <ExactRoot label="Projection" value={state.anchor.projectionReleaseRoot} />
          <ExactRoot label="Source commit" value={state.anchor.sourceCommit} />
        </dl>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {state.locator ? <Button nativeButton={false} variant="outline" render={<a href={state.locator} />}>Upstream source</Button> : null}
        <Button nativeButton={false} variant="outline" render={<a href={`https://app.vela.space/repositories/${state.repositorySlug}/problems/${state.problem.problem}`} />}>Inspect records</Button>
        {dossier ? <Button nativeButton={false} variant="outline" render={<a href={`https://app.vela.space/repositories/${dossierRepository ?? state.repositorySlug}/dossiers/${dossier}`} />}>Read Dossier</Button> : null}
      </div>
      </CollapsibleContent>
    </Collapsible>
  </div>;
}
