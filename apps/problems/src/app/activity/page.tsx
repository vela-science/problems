import type { Metadata } from "next";
import Link from "next/link";
import { Activity01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificChangeFeed } from "@/components/vela/scientific-change-feed";
import { recentScientificChanges } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Updates", description: "Exact State changes and ordinary Repository commits, kept distinct from Workspace activity." };

type View = "all" | "transitions" | "commits";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [query, activity] = await Promise.all([searchParams, recentScientificChanges(120)]);
  const view: View = query.view === "transitions" || query.view === "commits" ? query.view : "all";
  const filtered = activity.filter(({ commit }) => view === "all" || (view === "transitions" ? Boolean(commit.transition) : !commit.transition));
  const transitions = activity.filter(({ commit }) => commit.transition).length;
  const commits = activity.length - transitions;

  return <PageShell archetype="history">
    <PageHero className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-end"><div><div className="flex items-center gap-2"><HugeiconsIcon icon={Activity01Icon} aria-hidden className="size-5" /><p className="text-eyebrow uppercase text-muted-foreground">Retained scientific changes</p></div><h1 className="mt-3 text-display">Updates</h1><p className="typeset typeset-compact mt-4 max-w-2xl text-muted-foreground">A typed history of exact scientific State. State changes remain distinct from ordinary Repository commits; neither is presented as human acceptance by itself.</p></div><p className="text-meta text-muted-foreground"><span className="font-medium text-foreground">Workspace activity is not mixed into this feed.</span> Hosted notes, attempts, and requests remain inside their Workspace until a separate activity lane is backed by retained records.</p></PageHero>
    <figure className="mt-6 border-y py-5" aria-labelledby="updates-composition-heading">
      <figcaption id="updates-composition-heading" className="text-label font-medium">What changed in this retained window</figcaption>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted forced-colors:border" aria-hidden>
        {transitions ? <span className="bg-status-evidence" style={{ width: `${activity.length ? (transitions / activity.length) * 100 : 0}%` }} /> : null}
        {commits ? <span className="bg-muted-foreground/45" style={{ width: `${activity.length ? (commits / activity.length) * 100 : 0}%` }} /> : null}
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-meta">
        <div className="flex items-center gap-2"><span aria-hidden className="size-2 rounded-full bg-status-evidence forced-colors:border" /><dt>Scientific state changes</dt><dd className="font-mono text-muted-foreground">{transitions}</dd></div>
        <div className="flex items-center gap-2"><span aria-hidden className="size-2 rounded-full bg-muted-foreground/45 forced-colors:border" /><dt>Repository updates</dt><dd className="font-mono text-muted-foreground">{commits}</dd></div>
        <div className="text-muted-foreground"><dt className="sr-only">Total retained updates</dt><dd>{activity.length} total</dd></div>
      </dl>
    </figure>
    <nav aria-label="Updates views" className="mt-8 flex flex-wrap gap-2">{([ ["all", "All history"], ["transitions", "State changes"], ["commits", "Repository commits"] ] as const).map(([value, label]) => <Button key={value} size="sm" variant={view === value ? "default" : "outline"} nativeButton={false} render={<Link href={value === "all" ? "/activity" : `/activity?view=${value}`} />}>{label}</Button>)}</nav>
    <PageSection aria-labelledby="activity-feed"><PageSectionHeader><h2 id="activity-feed" className="text-title">Recent updates</h2><span className="font-mono text-meta text-muted-foreground">{filtered.length} records</span></PageSectionHeader><ScientificChangeFeed changes={filtered} /></PageSection>
  </PageShell>;
}
