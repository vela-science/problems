import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { allRepositories, repositoryBySlug, projectionManifest } from "@vela/projection-data";
import { RepositoryGraph } from "@/components/controllers/repository-graph";
import { RouteTitle } from "@/components/vela/route-title";
import { ToolbarSkeleton } from "@/components/vela/route-skeleton";
import { Skeleton } from "@vela/ui/components/skeleton";

export const dynamicParams = false;
export async function generateStaticParams() { return (await allRepositories()).filter((repository) => repository.graph).map((repository) => ({ slug: repository.slug })); }

export async function generateMetadata({ params }: PageProps<"/repositories/[slug]/graph">): Promise<Metadata> {
  const { slug } = await params;
  const repository = await repositoryBySlug(slug);
  return repository
    ? {
        title: `${repository.status.repository.name}: graph`,
        description: `Published relationships among the exact records retained by the ${repository.status.repository.name} repository.`,
        alternates: { canonical: `/repositories/${slug}/graph` },
      }
    : {};
}

/* This used to redirect to `/graph?repository=<slug>`, which emptied the
   breadcrumb. It renders in place instead, so the Repository's own navigation
   survives — which, until the sidebar gained a Repository group, meant the
   breadcrumb alone. The "repository tab bar" this comment used to name has
   never existed in this codebase; `repository-nav.tsx` is on the banned list
   at scripts/check-problems-design-system.mjs. */
export default async function RepositoryGraphPage({ params }: PageProps<"/repositories/[slug]/graph">) {
  const { slug } = await params;
  const [repository, manifest] = await Promise.all([repositoryBySlug(slug), projectionManifest()]);
  if (!repository?.graph) notFound();
  return (
    <PageShell archetype="data" layout="canvas">
      <RouteTitle title={`${repository.status.repository.name}: graph`} />
      <section className="mt-6 overflow-hidden rounded-lg border" aria-label={`${repository.status.repository.name} research topology`}>
        <Suspense fallback={<div role="status" aria-label="Loading graph controls"><div className="border-b p-4"><ToolbarSkeleton controls={3} /></div><Skeleton className="h-[34rem] w-full rounded-none" /></div>}>
          <RepositoryGraph root={manifest.release_root} initialRepository={repository.slug} repositories={[repository.slug]} scoped />
        </Suspense>
      </section>
      <p className="mt-5 max-w-[70ch] text-meta text-muted-foreground">
        {repository.graph.node_count.toLocaleString()} nodes and {repository.graph.edge_count.toLocaleString()} relationships are retained for this repository. Open the cross-repository map from Explore when a comparison spans more than one.
      </p>
    </PageShell>
  );
}
