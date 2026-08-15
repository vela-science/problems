import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon as ArrowRight, Activity01Icon, WorkIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { PageHero, PageSection, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { StateGlyph } from "@vela/ui/vela/state-glyph";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { ProblemFacts } from "@/components/vela/problem-facts";
import { ScientificChangeFeed } from "@/components/vela/scientific-change-feed";
import { featuredProblemStates, recentScientificChanges } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Home",
  description: "A live view of scientific Problems, current State, and exact retained changes across Vela.",
};

export default async function HomePage() {
  const [catalog, activity] = await Promise.all([featuredProblemStates(), recentScientificChanges(6)]);
  const states = catalog.filter((entry): entry is typeof entry & { state: NonNullable<typeof entry.state> } => Boolean(entry.state));
  const assessed = states.filter(({ state }) => state.claims.length > 0).length;
  const lead = states.find(({ feature }) => feature.problem === "321") ?? states[0];

  return <PageShell archetype="problem">
    <PageHero density="compact" className="isolate lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.42fr)] lg:items-end lg:gap-12">
      <div>
        <p className="text-eyebrow uppercase text-muted-foreground">Problems.science</p>
        <h1 className="mt-3 max-w-4xl text-display">Find a scientific Problem. See what is known. Contribute.</h1>
        <p className="typeset typeset-compact mt-4 max-w-2xl text-muted-foreground">Start with the question. Current State, evidence, source-owned work, and shared activity stay connected without being collapsed into one status.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/problems" />}>Browse Problems <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/work" />}>Contribute</Button>
        </div>
      </div>
      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-6 text-meta lg:mt-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <div><dt className="text-muted-foreground">Problems in focus</dt><dd className="mt-1 font-mono text-subtitle tabular-nums">{states.length}</dd></div>
        <div><dt className="text-muted-foreground">Locally assessed</dt><dd className="mt-1 font-mono text-subtitle tabular-nums">{assessed}</dd></div>
        <div className="col-span-2"><dt className="text-muted-foreground">Where to begin</dt><dd className="mt-1 text-label"><Link href="/problems" className="underline decoration-border underline-offset-4 hover:decoration-current">Choose a Problem and open its Workspace</Link></dd></div>
      </dl>
    </PageHero>

    <PageSection className="grid gap-10 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.65fr)]">
      <div>
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-eyebrow uppercase text-muted-foreground">Start here</p><h2 className="mt-1 text-title">Problems needing attention</h2></div>
          <Link href="/problems" className="text-meta font-medium underline-offset-4 hover:underline">All Problems</Link>
        </div>
        {lead ? <article className="mt-6">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{lead.feature.field?.name ?? lead.feature.topics[0]?.name ?? "Unclassified Topic"}</Badge><span className="text-meta text-muted-foreground">{lead.feature.collection?.name ?? "Unclassified collection"}</span></div>
          <Link href={lead.feature.canonicalPath ?? "/problems"} className="group mt-4 grid gap-5 focus-visible:outline-2 focus-visible:outline-offset-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto]">
            <div className="flex items-start gap-3"><StateGlyph className="mt-1" standing={lead.state.claims[0]?.standing ?? "unassessed"} verification="not_attempted" /><span className="font-mono text-title">{lead.feature.problem}</span></div>
            <div><p className="text-eyebrow uppercase text-muted-foreground">{lead.feature.theme}</p><h3 className="mt-2 max-w-[70ch] text-title leading-snug"><ScientificText text={decodeHtmlEntities(lead.state.problem.statement?.trim() || lead.state.source.summary?.trim() || lead.state.source.title)} /></h3></div>
            <HugeiconsIcon icon={ArrowRight} aria-hidden className="mt-1 size-5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <ProblemFacts state={lead.state} className="mt-6" />
        </article> : null}

        <ItemGroup className="mt-6 gap-0 divide-y">
          {states.filter((entry) => entry !== lead).slice(0, 4).map(({ feature, state }) => <Item key={`${feature.repository}/${feature.problem}`} render={<Link href={feature.canonicalPath ?? "/problems"} />} className="group rounded-none border-0 px-0 py-5">
            <ItemMedia className="w-20 self-start"><StateGlyph standing={state.claims[0]?.standing ?? "unassessed"} verification="not_attempted" /><span className="font-mono text-label">{feature.problem}</span></ItemMedia>
            <ItemContent><ItemTitle className="line-clamp-none text-label"><ScientificText text={decodeHtmlEntities(state.problem.statement?.trim() || state.source.summary?.trim() || state.source.title)} /></ItemTitle><ItemDescription className="line-clamp-none">{feature.field?.name ?? feature.topics[0]?.name ?? "Unclassified Topic"} · {state.problem.source_count} exact {state.problem.source_count === 1 ? "source" : "sources"}</ItemDescription></ItemContent>
            <ItemActions><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" /></ItemActions>
          </Item>)}
        </ItemGroup>
      </div>

      <aside>
        <div className="flex items-end justify-between gap-4"><div><p className="text-eyebrow uppercase text-muted-foreground">Scientific State</p><h2 className="mt-1 text-title">Latest State history</h2></div><Link href="/activity" className="text-meta font-medium underline-offset-4 hover:underline">Full history</Link></div>
        <ScientificChangeFeed changes={activity} compact />
      </aside>
    </PageSection>

    <PageSection as="nav" aria-label="Explore the network" className="grid rounded-xl bg-muted/30 px-4 md:grid-cols-3">
      {[
        { href: "/work", icon: WorkIcon, title: "Contribute", detail: "prepare a bounded direct Submission" },
        { href: "/activity", icon: Activity01Icon, title: "State history", detail: `${activity.length} recent retained records` },
      ].map((item) => <Link key={item.href} href={item.href} className="group flex items-center gap-4 border-b px-2 py-6 transition-colors last:border-b-0 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 md:border-b-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0 md:last:pr-0"><HugeiconsIcon icon={item.icon} aria-hidden className="size-5" /><span><span className="block text-subtitle">{item.title}</span><span className="mt-1 block text-meta text-muted-foreground">{item.detail}</span></span><HugeiconsIcon icon={ArrowRight} aria-hidden className="ml-auto size-4 transition-transform duration-200 group-hover:translate-x-1" /></Link>)}
    </PageSection>
  </PageShell>;
}
