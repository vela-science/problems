import type { Metadata } from "next";
import { Suspense } from "react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { allRepositories, projectionManifest } from "@vela/projection-data";
import { SearchResults } from "@/components/controllers/search-results";
import { LedgerSkeleton, ToolbarSkeleton } from "@/components/vela/route-skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@vela/ui/components/collapsible";
import { PageHero, PageShell } from "@vela/ui/vela/page-shell";
import { publishedProblemCollections } from "@/lib/published-problem-collections";

export const metadata: Metadata = {
  title: "Search",
  description: "Find published scientific Problems, Results, sources, and supporting repository records.",
  alternates: { canonical: "/search" },
};

export default async function SearchPage() {
  const [release, repositories] = await Promise.all([projectionManifest(), allRepositories()]);
  return (
    <PageShell archetype="data" layout="canvas" className="flex flex-col gap-6">
      <PageHero density="compact" className="vela-data-hero">
        <div className="flex items-center gap-2"><HugeiconsIcon icon={Search01Icon} aria-hidden className="size-5 text-primary" /><p className="text-eyebrow uppercase text-muted-foreground">Global discovery</p></div>
        <h1 className="mt-2 text-display">Search</h1>
        <p className="mt-2 max-w-2xl text-body text-muted-foreground">Find a Problem by its question, collection number, Result, or source.</p>
      </PageHero>
      <Suspense fallback={<div role="status" aria-label="Loading search controls" className="flex flex-col gap-6"><ToolbarSkeleton controls={4} /><LedgerSkeleton rows={6} /></div>}><SearchResults projectionRoot={release.release_root} repositories={repositories.map((repository) => repository.slug)} problemCollections={publishedProblemCollections} /></Suspense>
      <Collapsible className="rounded-lg border"><CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2 text-compact font-medium">Exact search provenance<span className="font-mono text-meta text-muted-foreground">{release.release_root.slice(0, 20)}…</span></CollapsibleTrigger><CollapsibleContent className="border-t px-3 py-3 font-mono text-meta break-all text-muted-foreground">{release.release_root}</CollapsibleContent></Collapsible>
    </PageShell>
  );
}
