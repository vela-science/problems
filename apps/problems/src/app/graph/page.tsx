import type { Metadata } from "next";
import { Suspense } from "react";
import { allRepositories, projectionManifest } from "@vela/projection-data";
import { RepositoryGraph } from "@/components/controllers/repository-graph";
import { RouteTitle } from "@/components/vela/route-title";
import { ToolbarSkeleton } from "@/components/vela/route-skeleton";
import { Skeleton } from "@vela/ui/components/skeleton";
import { PageShell } from "@vela/ui/vela/page-shell";

/* Not "complete". TERMINOLOGY.md bans that word unqualified, and it was
   unqualified over a graph holding zero nodes. */
export const metadata: Metadata = { title: "Relationship graph", description: "Explore published relationships among Problems, Contributions, evidence, checks, and sources.", alternates: { canonical: "/graph" } };

export default async function GraphIndexPage() {
  const [repositories, manifest] = await Promise.all([allRepositories(), projectionManifest()]);
  const graphed = repositories.filter((repository) => repository.graph);
  /* The first published repository, not a named one. This searched for `erdos`
     and fell back to `graphed[0]` — the search has not matched since the four
     subject repositories were consolidated, so only the fallback ever ran. */
  const first = graphed[0];
  return <PageShell archetype="data" layout="canvas" className="flex flex-col gap-6">
    <RouteTitle title="Relationship graph" scope="Published scientific relationships" />
    <section className="overflow-hidden rounded-lg border" aria-label="Research topology"><Suspense fallback={<div role="status" aria-label="Loading graph controls"><div className="border-b p-4"><ToolbarSkeleton controls={4} /></div><Skeleton className="h-[34rem] w-full rounded-none" /></div>}><RepositoryGraph root={manifest.release_root} initialRepository={first?.slug ?? ""} repositories={graphed.map((repository) => repository.slug)} /></Suspense></section>
  </PageShell>;
}
