import type { Metadata } from "next";
import { Suspense } from "react";
import { allRepositories, projectionManifest } from "@vela/projection-data";
import { RepositoryGraph } from "@/components/controllers/repository-graph";
import { ToolbarSkeleton } from "@/components/vela/route-skeleton";
import { Skeleton } from "@vela/ui/components/skeleton";
import { PageShell } from "@vela/ui/vela/page-shell";
import { RouteTitle } from "@/components/vela/route-title";

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
    <RouteTitle title="Research map" />
    <section className="vela-object-surface overflow-hidden" aria-label="Research topology"><Suspense fallback={<div role="status" aria-label="Loading graph controls"><div className="border-b p-4"><ToolbarSkeleton controls={4} /></div><div className="grid min-h-[34rem] md:grid-cols-[24rem_minmax(0,1fr)]"><div className="space-y-3 border-b p-4 md:border-b-0 md:border-r">{[0, 1, 2, 3, 4].map((row) => <div key={row} className="flex items-start gap-3"><Skeleton className="size-8 shrink-0 rounded-md" /><div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /></div></div>)}</div><Skeleton className="h-full min-h-72 rounded-none" /></div></div>}><RepositoryGraph root={manifest.release_root} initialRepository={first?.slug ?? ""} repositories={graphed.map((repository) => repository.slug)} /></Suspense></section>
  </PageShell>;
}
