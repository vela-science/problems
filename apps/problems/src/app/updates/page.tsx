import type { Metadata } from "next";
import { PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificChangeFeed } from "@/components/vela/scientific-change-feed";
import { recentScientificChanges } from "@/lib/scientific-state";
import type { Route } from "next";
import { FilterChips } from "@/components/vela/filter-chips";
import Link from "next/link";
import { Button } from "@vela/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import { RouteTitle } from "@/components/vela/route-title";

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
    {/* The hero carried two descriptions: the route's own, and an unrelated
        note about drafts in a 23rem right column competing with it. The app
        header already names the route, so this follows the pattern the ledger
        routes already use — the heading stays for the outline, the band goes. */}
    <RouteTitle title="Updates" />
    {/* One partition, once. A bar plus legend stated 19 / 33 / 52, then these
        chips offered the same three sets, then the section header counted them
        a third time — with the legend calling the 33 "Repository updates" and
        the chip calling them "Repository commits", so a reader had to work out
        that two names meant one set. `FilterChips` already takes a `count`,
        which is the whole figure's information in the control that acts on it.
        GitHub settles this the same way: `Open 3 / Closed 12` *is* the filter. */}
    <FilterChips
      className="mt-6"
      label="Updates views"
      chips={([["all", "All history", activity.length], ["transitions", "State changes", transitions], ["commits", "Repository commits", commits]] as const).map(([value, label, count]) => ({
        key: value,
        label,
        count,
        active: view === value,
        href: (value === "all" ? "/updates" : `/updates?view=${value}`) as Route,
      }))}
    />
    <PageSection aria-labelledby="activity-feed" className="vela-object-surface p-5"><PageSectionHeader><h2 id="activity-feed" className="text-title">Recent updates</h2></PageSectionHeader>{filtered.length ? <ScientificChangeFeed changes={filtered} /> : <Empty className="border-0">
      <EmptyHeader>
        <EmptyTitle>{view === "all" ? "No update is published in this release" : `No ${view === "transitions" ? "state change" : "repository commit"} is published in this release`}</EmptyTitle>
        {/* The list rendered an empty <ol> that still painted its connector
            rail, under a header reading "0 updates" — an absence drawn as if
            it were a timeline. */}
        <EmptyDescription>{view === "all" ? "Published history begins when a Repository records its first change." : "Other kinds of update may still be published. Clear the filter to see the full history."}</EmptyDescription>
      </EmptyHeader>
      {view === "all" ? null : <EmptyContent><Button nativeButton={false} variant="outline" size="sm" render={<Link href="/updates" />}>Show all history</Button></EmptyContent>}
    </Empty>}</PageSection>
  </PageShell>;
}
