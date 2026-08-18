import type { Metadata } from "next";
import { Suspense } from "react";
import { GitForkIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { allRepositories, projectionManifest } from "@vela/projection-data";
import { RepositoryGraph } from "@/components/controllers/repository-graph";
import { ToolbarSkeleton } from "@/components/vela/route-skeleton";
import { Skeleton } from "@vela/ui/components/skeleton";
import { PageHero, PageShell } from "@vela/ui/vela/page-shell";

/* Not "complete". TERMINOLOGY.md bans that word unqualified, and it was
   unqualified over a graph holding zero nodes. */
export const metadata: Metadata = { title: "Research map", description: "Explore exact published relationships among Problems, Results, evidence, checks, and sources.", alternates: { canonical: "/graph" } };

export default async function GraphIndexPage() {
  const [repositories, manifest] = await Promise.all([allRepositories(), projectionManifest()]);
  const graphed = repositories.filter((repository) => repository.graph);
  /* The first published repository, not a named one. This searched for `erdos`
     and fell back to `graphed[0]` — the search has not matched since the four
     subject repositories were consolidated, so only the fallback ever ran. */
  const first = graphed[0];
  return <PageShell archetype="data" layout="canvas" className="flex flex-col gap-6">
    <PageHero density="compact" className="vela-data-hero">
      <div className="flex items-center gap-2"><HugeiconsIcon icon={GitForkIcon} aria-hidden className="size-5 text-primary" /><p className="text-eyebrow uppercase text-muted-foreground">Exact relationships</p></div>
      <h1 className="mt-2 text-display">Research map</h1>
      <p className="mt-2 max-w-2xl text-body text-muted-foreground">Choose a Problem or Result to see only the retained sources, checks, decisions, and correction links around it.</p>
    </PageHero>
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-label="Research topology"><Suspense fallback={<div role="status" aria-label="Loading graph controls"><div className="border-b p-4"><ToolbarSkeleton controls={4} /></div><Skeleton className="h-[34rem] w-full rounded-none" /></div>}><RepositoryGraph root={manifest.release_root} initialRepository={first?.slug ?? ""} repositories={graphed.map((repository) => repository.slug)} /></Suspense></section>
  </PageShell>;
}
