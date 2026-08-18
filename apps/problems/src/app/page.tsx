import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight01Icon as ArrowRight,
  GitForkIcon,
  Search01Icon as Search,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@vela/ui/components/input-group";
import { PageHero, PageSection, PageShell } from "@vela/ui/vela/page-shell";
import { CollectionDistribution } from "@/components/vela/collection-distribution";
import { ProblemQuestionRow } from "@/components/vela/problem-question-row";
import { ScientificChangeFeed } from "@/components/vela/scientific-change-feed";
import { discoveredProblems, problemStatePreviews, recentScientificChanges } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Find scientific problems and contribute evidence",
  description: "Find scientific problems, understand the evidence around them, and contribute proofs, computations, datasets, reviews, corrections, and other results.",
};

const COLLECTION_PATH = "/problems/erdos-problems";

export default async function HomePage() {
  const [catalog, activity] = await Promise.all([discoveredProblems(), recentScientificChanges(5)]);
  const assessed = catalog
    .filter((problem) => problem.record.local_standing)
    .sort((left, right) => (right.record.local_assessed_at ?? "").localeCompare(left.record.local_assessed_at ?? ""));
  const openCount = catalog.filter((problem) => problem.record.declared_status === "open").length;
  const publishedCount = catalog.length.toLocaleString();

  /* Six real questions do the orientation that three steps of prose were
     doing badly. They are chosen deterministically — reviewed first, then open
     Problems the sources have formalized, which are the ones that actually
     have a question written down — so the page is stable between loads. */
  const featured = [
    ...assessed,
    ...catalog.filter((problem) => problem.record.declared_status === "open" && problem.record.formalized && !problem.record.local_standing),
  ].slice(0, 6);
  const previews = await problemStatePreviews(featured);

  return <PageShell archetype="default">
    <PageHero density="compact" className="vela-product-hero grid gap-7 lg:grid-cols-[minmax(0,44rem)_minmax(17rem,1fr)] lg:items-end lg:gap-12">
      <div>
        <h1 className="text-[clamp(1.9rem,3.5vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">Find scientific problems</h1>
        <p className="mt-3 max-w-2xl text-body text-pretty text-muted-foreground">
          Find scientific questions, understand the evidence around them, and contribute proofs,
          computations, datasets, reviews, corrections, and other results.
        </p>

        <form action={COLLECTION_PATH} method="get" aria-label="Find a problem" className="mt-7 max-w-2xl">
          <label htmlFor="home-problem-search" className="sr-only">Find a problem</label>
          <InputGroup className="h-12 border-input bg-[var(--vela-surface-raised)] shadow-[var(--vela-shadow-raised)] focus-within:border-primary">
            <InputGroupAddon><HugeiconsIcon icon={Search} aria-hidden /></InputGroupAddon>
            <InputGroupInput
              id="home-problem-search"
              name="q"
              type="search"
              maxLength={200}
              placeholder="Search by question, number, or topic"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="submit" variant="secondary" className="h-9 px-4">Search</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/problems" />}>
            Browse problems <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
          </Button>
          <Button
            size="lg"
            nativeButton={false}
            variant="outline"
            className="vela-hero-secondary-action"
            render={<Link href="/contribute" />}
          >
            Add a contribution
          </Button>
        </div>
      </div>

      <div className="vela-object-surface p-5">
        <p className="text-label font-semibold text-foreground">Available today</p>
        <p className="mt-1.5 text-compact leading-5 text-muted-foreground">
          One published collection with {publishedCount} questions.
        </p>
        <Link href={COLLECTION_PATH} className="vela-object-row mt-3 -mx-2 flex items-center gap-2 rounded-md px-2 py-2 text-compact font-semibold text-primary">
          Erdős Problems <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-3.5" />
        </Link>
      </div>
    </PageHero>

    <PageSection className="grid gap-10 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)] xl:gap-14">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-3">
          <h2 id="open-a-question-heading" className="text-title">Problems to explore</h2>
          <Link href={COLLECTION_PATH} className="shrink-0 text-meta font-medium text-primary underline-offset-4 hover:underline">All {publishedCount} problems</Link>
        </div>
        {previews.length ? <ul className="mt-2 divide-y" aria-labelledby="open-a-question-heading">
          {previews.map(({ discovery, state }) => <ProblemQuestionRow
            key={`${discovery.repository}/${discovery.problem}`}
            state={state}
            number={discovery.problem} collectionLabel="Erdős problem"
            href={discovery.canonicalPath ?? COLLECTION_PATH}
          />)}
        </ul> : <p className="border-b py-6 text-body text-muted-foreground">No Problem in this release has a retained question to preview.</p>}
      </div>

      <aside className="vela-object-surface min-w-0 p-4" aria-labelledby="recently-updated-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="recently-updated-heading" className="text-title">Recently updated</h2>
          <Link href="/activity" className="shrink-0 text-meta font-medium text-primary underline-offset-4 hover:underline">All updates</Link>
        </div>
        {activity.length
          ? <ScientificChangeFeed changes={activity} compact plainLanguage />
          : <p className="mt-5 border-y py-6 text-body text-muted-foreground">No recent source updates are available.</p>}
      </aside>
    </PageSection>

    <PageSection aria-labelledby="published-collection-heading" className="border-y py-6">
      <div className="grid gap-7 xl:grid-cols-[minmax(18rem,.75fr)_minmax(0,1.25fr)] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="published-collection-heading" className="text-title">Erdős Problems</h2>
            <Badge variant="secondary">Published</Badge>
          </div>
          <p className="mt-2 max-w-xl text-compact text-muted-foreground">{publishedCount} source-owned questions. Problem numbers are local to this collection.</p>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-meta">
            <div className="flex gap-1.5"><dt className="text-muted-foreground">Open per source</dt><dd className="font-mono tabular-nums">{openCount.toLocaleString()}</dd></div>
            <div className="flex gap-1.5"><dt className="text-muted-foreground">Reviewed Results</dt><dd className="font-mono tabular-nums">{assessed.length.toLocaleString()}</dd></div>
          </dl>
          {!assessed.length ? <p className="mt-3 text-meta text-muted-foreground">No Problem in this release has a reviewed Result yet.</p> : null}
          <Button className="mt-5" nativeButton={false} variant="outline" render={<Link href={COLLECTION_PATH} />}>Browse collection <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button>
        </div>
        <CollectionDistribution problems={catalog} compact />
      </div>
    </PageSection>

    <PageSection as="nav" aria-label="Contribute work" className="border-b border-t py-0">
      <div className="grid md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:divide-x">
        <div className="py-6 md:pr-8">
          <p className="text-subtitle">Have evidence to add?</p>
          <p className="mt-1 max-w-2xl text-meta text-muted-foreground">Start from a Problem, or inspect a GitHub codebase and continue the work locally.</p>
        </div>
        <Link href="/contribute" className="group flex min-h-20 items-center gap-3 border-t py-5 focus-visible:outline-2 focus-visible:outline-offset-2 md:border-t-0 md:px-8">
          <HugeiconsIcon icon={WorkIcon} aria-hidden className="size-5" />
          <span className="text-label font-medium">Add a contribution</span>
          <HugeiconsIcon icon={ArrowRight} aria-hidden className="ml-auto size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
        <Link href="/import" className="group flex min-h-20 items-center gap-3 border-t py-5 focus-visible:outline-2 focus-visible:outline-offset-2 md:border-t-0 md:pl-8">
          <HugeiconsIcon icon={GitForkIcon} aria-hidden className="size-5" />
          <span className="text-label font-medium">Import from GitHub</span>
          <HugeiconsIcon icon={ArrowRight} aria-hidden className="ml-auto size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </PageSection>
  </PageShell>;
}
