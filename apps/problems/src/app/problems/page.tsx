import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight01Icon as ArrowRight, Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { CollectionDistribution } from "@/components/vela/collection-distribution";
import { ProblemQuestionRow } from "@/components/vela/problem-question-row";
import { discoveredProblems, problemDiscoveryCollections, problemStatePreviews } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Problems",
  description: "Browse the scientific Problem collections published on problems.science.",
  alternates: { canonical: "/problems" },
};

const COLLECTION_PATH = "/problems/erdos-problems";
const LEGACY_DIRECTORY_KEYS = new Set([
  "view", "domain", "hub", "collection", "field", "topic", "q", "status",
  "standing", "source", "repository", "formalized", "exact_id", "coverage", "page",
]);

type SearchValue = string | string[] | undefined;

function retainedDirectoryQuery(searchParams: Record<string, SearchValue>): string {
  const retained = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    if (!LEGACY_DIRECTORY_KEYS.has(key)) continue;
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      if (value) retained.append(key, value.slice(0, 256));
    }
  }
  return retained.toString();
}

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const query = retainedDirectoryQuery(await searchParams);
  if (query) redirect(`${COLLECTION_PATH}?${query}`);

  const catalog = await discoveredProblems();
  const collections = problemDiscoveryCollections(catalog);
  const collection = collections.find(({ key }) => key === "erdos-problems");
  const assessed = catalog
    .filter(({ record }) => record.local_standing)
    .sort((left, right) => left.problem.localeCompare(right.problem, undefined, { numeric: true }));
  const open = catalog
    .filter(({ record }) => record.declared_status === "open" && !record.local_standing)
    .sort((left, right) => left.problem.localeCompare(right.problem, undefined, { numeric: true }));
  const previews = await problemStatePreviews([...assessed, ...open].slice(0, 6));
  const collectionCount = collection?.problemCount ?? catalog.length;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Problems",
    url: "https://problems.science/problems",
    description: "The Problem collections published by problems.science.",
    hasPart: collection ? [{
      "@type": "CollectionPage",
      name: collection.name,
      url: `https://problems.science${COLLECTION_PATH}`,
      numberOfItems: collectionCount,
    }] : [],
  };

  return <PageShell archetype="problem">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <PageHero density="compact" className="vela-product-hero flex flex-wrap items-end justify-between gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-display">Problems</h1><Badge variant="secondary">1 published collection</Badge></div>
        <p className="mt-2 max-w-2xl text-body text-muted-foreground">Browse source-owned scientific questions, then inspect their Results, Sources, Work, and History.</p>
      </div>
      <Button nativeButton={false} variant="outline" render={<Link href="/search" />}>Search problems</Button>
    </PageHero>

    <PageSection aria-label="Published Problem collections" className="pt-5">
      <article className="vela-object-surface overflow-hidden lg:grid lg:grid-cols-[minmax(17rem,.58fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col justify-between gap-6 border-b p-5 lg:border-b-0 lg:border-r lg:p-6">
          <div>
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-accent text-primary"><HugeiconsIcon icon={Folder01Icon} aria-hidden className="size-5" /></span><div><h2 className="text-title">Erdős Problems</h2><p className="mt-0.5 text-meta text-muted-foreground">Published collection · {collectionCount.toLocaleString()} questions</p></div></div>
            <p className="mt-5 max-w-xl text-compact text-muted-foreground">The current release contains one collection: {collectionCount.toLocaleString()} Erdős problems. Problem numbers are meaningful only inside this collection.</p>
          </div>
          <Button className="w-fit" nativeButton={false} render={<Link href={COLLECTION_PATH} />}>Browse Erdős Problems <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button>
        </div>
        <div className="bg-[var(--vela-surface-sunken)] p-5 lg:p-6"><CollectionDistribution problems={catalog} compact /></div>
      </article>
    </PageSection>

    <PageSection aria-labelledby="starting-points">
      <PageSectionHeader className="border-b pb-3">
        <div>
          <h2 id="starting-points" className="text-title">Starting points</h2>
          <p className="mt-1 text-meta text-muted-foreground">Reviewed Results first, then open questions with retained formal material.</p>
        </div>
        <Link href={COLLECTION_PATH} className="text-meta font-medium underline-offset-4 hover:underline">Full collection</Link>
      </PageSectionHeader>
      {previews.length ? <ul className="mt-2 divide-y">
        {previews.map(({ discovery, state }) => <ProblemQuestionRow
          key={`${discovery.repository}/${discovery.problem}`}
          state={state}
          number={discovery.problem}
          collectionLabel="Erdős problem"
          href={discovery.canonicalPath ?? COLLECTION_PATH}
        />)}
      </ul> : <p className="mt-4 border-y py-6 text-body text-muted-foreground">No Problem in this release has a retained question to preview.</p>}
    </PageSection>
  </PageShell>;
}
