import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { StatementText } from "@/components/vela/statement-text";
import { CollectionDistribution } from "@/components/vela/collection-distribution";
import { discoveredProblems, problemDiscoveryCollections, type ProblemDiscovery } from "@/lib/scientific-state";

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

function readableProblemLabel(problem: ProblemDiscovery): string {
  const record = problem.record;
  if (record.statement_kind === "prose" && record.statement?.trim()) return record.statement;
  return record.label?.trim() || `Erdős problem ${problem.problem}`;
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
  const startingPoints = [...assessed, ...open].slice(0, 5);
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
    <PageHero className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.44fr)] lg:items-end">
      <div>
        <p className="text-eyebrow uppercase text-muted-foreground">1 published Problem collection</p>
        <h1 className="mt-3 text-display">Problems</h1>
        <p className="typeset typeset-compact mt-4 max-w-2xl text-muted-foreground">
          The current release contains one collection: {collectionCount.toLocaleString()} Erdős problems. Problem numbers are meaningful only inside that collection.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href={COLLECTION_PATH} />}>
            Browse Erdős Problems <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/search" />}>Search problems</Button>
        </div>
      </div>
      <div className="vela-evidence-surface rounded-xl px-5 py-5">
        <p className="text-eyebrow uppercase text-muted-foreground">Current release</p>
        <p className="mt-2 text-title">Erdős Problems</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-meta">
          <div><dt className="text-muted-foreground">Problems</dt><dd className="mt-1 font-mono text-label">{collectionCount.toLocaleString()}</dd></div>
          <div><dt className="text-muted-foreground">Reviewed evidence</dt><dd className="mt-1 font-mono text-label">{assessed.length.toLocaleString()}</dd></div>
        </dl>
        <p className="mt-4 text-meta text-muted-foreground">Formal libraries, papers, datasets, and research tools may support these Problems as sources or evidence. They do not become separate Problem collections.</p>
      </div>
    </PageHero>

    <PageSection aria-label="Erdős Problems collection coverage">
      <CollectionDistribution problems={catalog} />
    </PageSection>

    <PageSection aria-labelledby="published-collections">
      <PageSectionHeader>
        <div>
          <p className="text-eyebrow uppercase text-muted-foreground">Published collections</p>
          <h2 id="published-collections" className="mt-1 text-title">One source-owned directory</h2>
        </div>
      </PageSectionHeader>
      <Link href={COLLECTION_PATH} className="group mt-6 grid gap-5 border-y py-6 focus-visible:outline-2 focus-visible:outline-offset-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p className="text-title group-hover:underline">Erdős Problems</p>
          <p className="mt-2 max-w-[68ch] text-body text-muted-foreground">Source-owned questions with stable collection-local numbers, Topics, status declarations, and contextual Contributions.</p>
        </div>
        <div className="flex items-center gap-4 text-meta text-muted-foreground">
          <span>{collectionCount.toLocaleString()} Problems</span>
          <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </Link>
    </PageSection>

    <PageSection aria-labelledby="starting-points">
      <PageSectionHeader>
        <div>
          <p className="text-eyebrow uppercase text-muted-foreground">Current starting points</p>
          <h2 id="starting-points" className="mt-1 text-title">Reviewed and open Erdős problems</h2>
        </div>
        <Link href={COLLECTION_PATH} className="text-meta font-medium underline-offset-4 hover:underline">Full collection</Link>
      </PageSectionHeader>
      <ul className="mt-4">
        {startingPoints.map((problem) => <li key={`${problem.repository}/${problem.problem}`} className="border-t py-5 first:border-t-0">
          <Link href={problem.canonicalPath ?? COLLECTION_PATH} className="group block focus-visible:outline-2 focus-visible:outline-offset-4">
            <p className="text-eyebrow uppercase text-muted-foreground">Erdős Problems · #{problem.problem}</p>
            <StatementText statement={readableProblemLabel(problem)} kind={problem.record.statement_kind === "formal" ? "label" : problem.record.statement_kind} className="mt-1 block max-w-[72ch] text-label leading-snug group-hover:underline" />
            <p className="mt-1.5 text-meta text-muted-foreground">{problem.record.declared_status}{problem.record.local_standing ? ` · reviewed Contribution ${problem.record.local_standing.replaceAll("_", " ")}` : " · no reviewed Contribution here yet"}</p>
          </Link>
        </li>)}
      </ul>
    </PageSection>
  </PageShell>;
}
