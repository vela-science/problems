import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight01Icon as ArrowRight,
  BookOpen01Icon,
  CodeIcon,
  Search01Icon as Search,
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
import { HomeResultRow } from "@/components/vela/home-result-row";
import { currentReview } from "@/components/vela/problem-provenance";
import { ProblemQuestionRow } from "@/components/vela/problem-question-row";
import { discoveredProblems, problemStatePreviews } from "@/lib/scientific-state";
import { formalConjecturesCollection } from "@vela/projection-data";
import { ScientificText } from "@vela/ui/vela/scientific-text";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Open problems and the evidence around them",
  description: "Find scientific problems, understand the evidence around them, and contribute proofs, computations, datasets, reviews, corrections, and other results.",
};

const COLLECTION_PATH = "/problems/erdos-problems";
const FORMAL_COLLECTION_PATH = "/problems/formal-conjectures";

export default async function HomePage() {
  const catalog = await discoveredProblems();
  const assessed = catalog
    .filter((problem) => problem.record.local_standing)
    .sort((left, right) => (right.record.local_assessed_at ?? "").localeCompare(left.record.local_assessed_at ?? ""));
  const publishedCount = catalog.length.toLocaleString();

  /* Real questions do the orientation that three steps of prose were doing
     badly. They are chosen deterministically — reviewed first, then open
     Problems the sources have formalized, which are the ones that actually
     have a question written down — so the page is stable between loads. */
  const featured = [
    ...assessed,
    ...catalog.filter((problem) => problem.record.declared_status === "open" && problem.record.formalized && !problem.record.local_standing),
  ].slice(0, 3);
  const previewDiscoveries = [...new Map(
    [...featured, ...assessed].map((problem) => [`${problem.repository}/${problem.problem}`, problem]),
  ).values()];
  const resolvedPreviews = await problemStatePreviews(previewDiscoveries);
  const previewByProblem = new Map(resolvedPreviews.map((entry) => [`${entry.discovery.repository}/${entry.discovery.problem}`, entry]));
  const featuredPreviews = featured.flatMap((problem) => {
    const entry = previewByProblem.get(`${problem.repository}/${problem.problem}`);
    return entry ? [entry] : [];
  });
  const reviewedResults = assessed.flatMap((problem) => {
    const entry = previewByProblem.get(`${problem.repository}/${problem.problem}`);
    return entry ? [entry] : [];
  }).sort((left, right) => (
    (currentReview(right.state)?.reviewed_at ?? "").localeCompare(currentReview(left.state)?.reviewed_at ?? "")
  )).slice(0, 2);

  return <PageShell archetype="default">
    <PageHero density="compact" className="vela-product-hero">
      <div className="max-w-[58rem]">
        <h1 className="max-w-[18ch] text-[clamp(2rem,4.5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-balance">Open problems and the evidence around them</h1>
        <p className="mt-4 max-w-2xl text-[clamp(1rem,1.5vw,1.125rem)] leading-7 text-pretty text-muted-foreground">
          Find a scientific question, read what is known, and add a result.
        </p>

        <form action="/search" method="get" aria-label="Find a problem" className="mt-8 max-w-3xl">
          <label htmlFor="home-problem-search" className="sr-only">Find a problem</label>
          <InputGroup className="h-14 border-input bg-[var(--vela-surface-raised)] shadow-[var(--vela-shadow-raised)] focus-within:border-primary">
            <InputGroupAddon><HugeiconsIcon icon={Search} aria-hidden className="size-5" /></InputGroupAddon>
            <InputGroupInput
              id="home-problem-search"
              name="q"
              type="search"
              maxLength={200}
              placeholder="Search Problems across published collections"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="submit" variant="secondary" className="h-10 px-4">Search</InputGroupButton>
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
            Add contribution
          </Button>
        </div>

        <div className="mt-9 max-w-3xl divide-y overflow-hidden rounded-lg border border-border">
          <Link href={COLLECTION_PATH} className="vela-object-row group flex min-w-0 items-center gap-3 px-1 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={BookOpen01Icon} aria-hidden className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-compact font-semibold">Erdős Problems</span>
              <span className="block text-meta text-muted-foreground">{publishedCount} published Problems</span>
            </span>
            <Badge variant="secondary" className="hidden sm:inline-flex">Published collection</Badge>
            <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
          <Link href={FORMAL_COLLECTION_PATH} className="vela-object-row group flex min-w-0 items-center gap-3 px-1 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={CodeIcon} aria-hidden className="size-4" /></span>
            <span className="min-w-0 flex-1"><span className="block text-compact font-semibold">Formal Conjectures</span><span className="block text-meta text-muted-foreground">{formalConjecturesCollection.data.items.length} rights-reviewed formalizations</span></span>
            <Badge variant="secondary" className="hidden sm:inline-flex">Published subset</Badge>
            <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </PageHero>

    <PageSection className="grid gap-12 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,.8fr)] xl:gap-16">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-3">
          <h2 id="open-a-question-heading" className="text-title">Problems to explore</h2>
          <Link href="/problems" className="shrink-0 text-meta font-medium text-primary underline-offset-4 hover:underline">All collections</Link>
        </div>
        {featuredPreviews.length ? <ul className="mt-2 divide-y" aria-labelledby="open-a-question-heading">
          {featuredPreviews.map(({ discovery, state }) => <ProblemQuestionRow
            key={`${discovery.repository}/${discovery.problem}`}
            state={state}
            number={discovery.problem} collectionLabel="Erdős problem"
            href={discovery.canonicalPath ?? COLLECTION_PATH}
          />)}
          {formalConjecturesCollection.data.items.slice(0, 1).map((item) => <li key={item.route_slug} className="min-w-0"><Link href={`${FORMAL_COLLECTION_PATH}/${item.route_slug}`} className="vela-object-row group -mx-2 flex min-w-0 gap-4 rounded-md px-2 py-4"><span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><HugeiconsIcon icon={CodeIcon} className="size-4" /></span><span className="min-w-0 flex-1"><span className="block max-w-[76ch] text-compact leading-6 group-hover:text-primary"><ScientificText text={item.title} /></span><span className="mt-1.5 block text-meta text-muted-foreground">Formal Conjectures · {item.source_family}</span></span><HugeiconsIcon icon={ArrowRight} aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" /></Link></li>)}
        </ul> : <p className="border-b py-6 text-body text-muted-foreground">No Problem in this release has a retained question to preview.</p>}
      </div>

      <section className="min-w-0" aria-labelledby="latest-results-heading">
        <div className="flex items-end justify-between gap-4 border-b pb-3">
          <h2 id="latest-results-heading" className="text-title">Reviewed Results</h2>
          <Link href="/activity" className="shrink-0 text-meta font-medium text-primary underline-offset-4 hover:underline">All updates</Link>
        </div>
        {reviewedResults.length ? <ul className="mt-2 divide-y" aria-labelledby="latest-results-heading">
          {reviewedResults.map(({ discovery, state }) => <HomeResultRow
            key={`${discovery.repository}/${discovery.problem}`}
            state={state}
            number={discovery.problem}
            href={discovery.canonicalPath ?? COLLECTION_PATH}
          />)}
        </ul> : <p className="border-b py-6 text-body text-muted-foreground">No reviewed Result is published in this release.</p>}
      </section>
    </PageSection>
  </PageShell>;
}
