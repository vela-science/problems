import type { Metadata } from "next";
import { Suspense } from "react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { allRepositories, compositeSearchRoot, formalConjecturesCollectionRoot, projectionManifest } from "@vela/projection-data";
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
  const searchRoot = compositeSearchRoot(release.release_root);
  return (
    <PageShell archetype="data" className="flex flex-col gap-6">
      <PageHero density="compact" className="vela-data-hero">
        <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-accent text-primary"><HugeiconsIcon icon={Search01Icon} aria-hidden className="size-5" /></span><h1 className="text-display">Search</h1></div>
        <p className="mt-2 max-w-2xl text-body text-muted-foreground">Find a Problem by its question, collection number, Result, or source.</p>
      </PageHero>
      <Suspense fallback={<div role="status" aria-label="Loading search controls" className="flex flex-col gap-6"><ToolbarSkeleton controls={4} /><LedgerSkeleton rows={6} /></div>}><SearchResults projectionRoot={release.release_root} searchRoot={searchRoot} collectionRoot={formalConjecturesCollectionRoot} repositories={repositories.map((repository) => repository.slug)} problemCollections={publishedProblemCollections} /></Suspense>
      <Collapsible className="rounded-lg border"><CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-compact font-medium">Exact search provenance<span className="font-mono text-meta text-muted-foreground">{searchRoot.slice(0, 20)}…</span></CollapsibleTrigger><CollapsibleContent keepMounted className="border-t px-3 py-3 text-meta text-muted-foreground"><dl className="grid gap-3 sm:grid-cols-2"><div><dt>Vela projection</dt><dd className="mt-1 break-all font-mono text-micro">{release.release_root}</dd></div><div><dt>Formal Conjectures subset</dt><dd className="mt-1 break-all font-mono text-micro">{formalConjecturesCollectionRoot}</dd></div></dl></CollapsibleContent></Collapsible>
    </PageShell>
  );
}
