import type { Metadata } from "next";
import Link from "next/link";
import { Activity01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { NetworkFacts } from "@vela/ui/vela/network-facts";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificChangeFeed } from "@/components/vela/scientific-change-feed";
import { recentScientificChanges } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "State history", description: "Exact State changes and ordinary Repository commits, kept distinct from Workspace activity." };

type View = "all" | "transitions" | "commits";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [query, activity] = await Promise.all([searchParams, recentScientificChanges(120)]);
  const view: View = query.view === "transitions" || query.view === "commits" ? query.view : "all";
  const filtered = activity.filter(({ commit }) => view === "all" || (view === "transitions" ? Boolean(commit.transition) : !commit.transition));
  const transitions = activity.filter(({ commit }) => commit.transition).length;
  const repositories = new Set(activity.map(({ repository }) => repository.slug)).size;

  return <PageShell archetype="history">
    <PageHero className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-end"><div><div className="flex items-center gap-2"><HugeiconsIcon icon={Activity01Icon} aria-hidden className="size-5" /><p className="text-eyebrow uppercase text-muted-foreground">Retained scientific changes</p></div><h1 className="mt-3 text-display">State history</h1><p className="typeset typeset-compact mt-4 max-w-2xl text-muted-foreground">A typed history of exact scientific State. State changes remain distinct from ordinary Repository commits; neither is presented as human acceptance by itself.</p></div><p className="text-meta text-muted-foreground"><span className="font-medium text-foreground">Workspace activity is not mixed into this feed.</span> Hosted notes, attempts, and requests remain inside their Workspace until a separate activity lane is backed by retained records.</p></PageHero>
    <NetworkFacts className="mt-6 sm:grid-cols-3" facts={[
      { label: "Retained history", value: activity.length, detail: "current State window" },
      { label: "State changes", value: transitions, detail: "typed separately" },
      { label: "Repositories", value: repositories, detail: "in this feed" },
    ]} />
    <nav aria-label="State history views" className="mt-8 flex flex-wrap gap-2">{([ ["all", "Entire State history"], ["transitions", "State changes"], ["commits", "Repository commits"] ] as const).map(([value, label]) => <Button key={value} size="sm" variant={view === value ? "default" : "outline"} nativeButton={false} render={<Link href={value === "all" ? "/activity" : `/activity?view=${value}`} />}>{label}</Button>)}</nav>
    <PageSection aria-labelledby="activity-feed"><PageSectionHeader><h2 id="activity-feed" className="text-title">Recent State history</h2><span className="font-mono text-meta text-muted-foreground">{filtered.length} records</span></PageSectionHeader><ScientificChangeFeed changes={filtered} /></PageSection>
  </PageShell>;
}
