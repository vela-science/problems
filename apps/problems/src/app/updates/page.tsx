import type { Metadata } from "next";
import { Activity01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificChangeFeed } from "@/components/vela/scientific-change-feed";
import { recentScientificChanges } from "@/lib/scientific-state";
import type { Route } from "next";
import { FilterChips } from "@/components/vela/filter-chips";
import Link from "next/link";
import { Button } from "@vela/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Updates",
  description: "Follow changes to scientific state and the repository updates that produced them.",
  alternates: { canonical: "/updates" },
};

type View = "all" | "transitions" | "commits";

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [query, activity] = await Promise.all([searchParams, recentScientificChanges(120)]);
  const view: View = query.view === "transitions" || query.view === "commits" ? query.view : "all";
  const filtered = activity.filter(({ commit }) => view === "all" || (view === "transitions" ? Boolean(commit.transition) : !commit.transition));
  const transitions = activity.filter(({ commit }) => commit.transition).length;
  const commits = activity.length - transitions;

  return <PageShell archetype="history">
    <PageHero className="vela-history-hero grid gap-7 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-end"><div><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-accent text-primary"><HugeiconsIcon icon={Activity01Icon} aria-hidden className="size-5" /></span><h1 className="text-display">Updates</h1></div><p className="mt-3 max-w-2xl text-body text-muted-foreground">Scientific changes and the repository updates that produced them.</p></div><p className="text-meta text-muted-foreground">Drafts and workspace notes remain in My work until they become a published Result.</p></PageHero>
    <figure className="mt-6 border-y py-5" aria-labelledby="updates-composition-heading">
      <figcaption id="updates-composition-heading" className="text-label font-medium">What changed in this published history</figcaption>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted forced-colors:border" aria-hidden>
        {transitions ? <span className="bg-status-evidence" style={{ width: `${activity.length ? (transitions / activity.length) * 100 : 0}%` }} /> : null}
        {commits ? <span className="bg-muted-foreground/45" style={{ width: `${activity.length ? (commits / activity.length) * 100 : 0}%` }} /> : null}
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-meta">
        <div className="flex items-center gap-2"><span aria-hidden className="size-2 rounded-full bg-status-evidence forced-colors:border" /><dt>Scientific state changes</dt><dd className="font-mono text-muted-foreground">{transitions}</dd></div>
        <div className="flex items-center gap-2"><span aria-hidden className="size-2 rounded-full bg-muted-foreground/45 forced-colors:border" /><dt>Repository updates</dt><dd className="font-mono text-muted-foreground">{commits}</dd></div>
        <div className="text-muted-foreground"><dt className="sr-only">Total updates</dt><dd>{activity.length} total</dd></div>
      </dl>
    </figure>
    <FilterChips
      className="mt-8"
      label="Updates views"
      chips={([["all", "All history"], ["transitions", "State changes"], ["commits", "Repository commits"]] as const).map(([value, label]) => ({
        key: value,
        label,
        active: view === value,
        href: (value === "all" ? "/updates" : `/updates?view=${value}`) as Route,
      }))}
    />
    <PageSection aria-labelledby="activity-feed" className="vela-object-surface p-5"><PageSectionHeader><h2 id="activity-feed" className="text-title">Recent updates</h2><span className="font-mono text-meta text-muted-foreground">{filtered.length} updates</span></PageSectionHeader>{filtered.length ? <ScientificChangeFeed changes={filtered} /> : <Empty className="border-0">
      <EmptyHeader>
        <EmptyTitle>{view === "all" ? "No update is published in this release" : `No ${view === "transitions" ? "state change" : "repository commit"} is published in this release`}</EmptyTitle>
        {/* The list rendered an empty <ol> that still painted its connector
            rail, under a header reading "0 updates" — an absence drawn as if
            it were a timeline. */}
        <EmptyDescription>{view === "all" ? "Published history begins when a Repository records its first change." : "Other kinds of update may still be published — clear the filter to see the full history."}</EmptyDescription>
      </EmptyHeader>
      {view === "all" ? null : <EmptyContent><Button nativeButton={false} variant="outline" size="sm" render={<Link href="/updates" />}>Show all history</Button></EmptyContent>}
    </Empty>}</PageSection>
  </PageShell>;
}
