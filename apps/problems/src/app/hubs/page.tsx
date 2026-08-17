import { PageHero, PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon as ArrowRight, Compass01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { NetworkFacts } from "@vela/ui/vela/network-facts";
import { HubMembershipMap } from "@/components/vela/hub-membership-map";
import { discoveredProblems, problemDiscoveryHubs, problemDiscoveryScopeQuery } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hubs", description: "Collections and communities coordinating scientific Problems without conferring authority." };

export default async function HubsPage({ searchParams }: { searchParams: Promise<{ domain?: string; hub?: string }> }) {
  const query = await searchParams;
  const catalog = await discoveredProblems();
  const allHubs = problemDiscoveryHubs(catalog);
  const hubs = allHubs.filter((hub) => (!query.domain || hub.domain.key === query.domain) && (!query.hub || hub.key === query.hub));
  const topics = new Set(hubs.flatMap((hub) => hub.problems.flatMap((entry) => entry.topics.map(({ key }) => key))));
  const sources = new Set(hubs.flatMap((hub) => hub.problems.flatMap((entry) => entry.record.source_ids)));
  return <PageShell archetype="problem" layout="standard">
    <PageHero><div className="max-w-3xl"><div className="flex items-center gap-2"><HugeiconsIcon icon={Compass01Icon} aria-hidden className="size-5" /><p className="text-eyebrow uppercase text-muted-foreground">Communities and collections</p></div><h1 className="mt-3 text-display">Hubs</h1><p className="typeset typeset-compact mt-4 text-muted-foreground">Hubs gather related Problems, sources, contributors, and activity. They help people coordinate and discover Work; they never create scientific authority.</p></div></PageHero>
    <NetworkFacts className="mt-8 sm:grid-cols-3" facts={[{ label: "Hubs", value: hubs.length, detail: "explicit source profiles" }, { label: "Topics", value: topics.size, detail: "flat source vocabulary" }, { label: "Sources", value: sources.size, detail: "exact observed origins" }]} />
    <div className="mt-12 space-y-16">{hubs.map((hub) => <section key={hub.key} className="grid gap-8 rounded-xl bg-muted/30 p-6 lg:grid-cols-[minmax(16rem,.55fr)_minmax(24rem,1fr)] lg:items-center"><div><p className="text-eyebrow uppercase text-muted-foreground">{hub.domain.name} · Hub · coordination only</p><h2 className="mt-2 text-title">{hub.name}</h2><p className="typeset typeset-compact mt-3 text-muted-foreground">{hub.problems.length} source-native Problems linked by an explicit discovery profile. Membership is a coordination lens, not a ruling.</p><Button className="mt-5" nativeButton={false} variant="outline" render={<Link href={{ pathname: `/problems/${hub.problems[0]?.collection?.key ?? "erdos-problems"}`, query: problemDiscoveryScopeQuery({ domain: hub.domain.key, hub: hub.key }) }} />}>Explore this Hub <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button></div><HubMembershipMap name={hub.name} problems={hub.problems} /></section>)}</div>
  </PageShell>;
}
