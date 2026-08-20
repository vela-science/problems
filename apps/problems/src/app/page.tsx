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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import styles from "./home-brand.module.css";

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
    <PageHero density="compact" className={styles.hero}>
      <div className={styles.grid}>
        <div className={styles.task}>
        <h1 className={styles.title}>Open problems and the evidence around them</h1>
        <p className={styles.lead}>
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
              placeholder="Find a problem"
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

        </div>

        <div className={styles.collections}>
        <div className={styles.collectionList}>
          <Item className="vela-object-row gap-3 px-1 py-3.5" render={<Link href={COLLECTION_PATH} />}>
            <ItemMedia className="size-9 rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={BookOpen01Icon} aria-hidden className="size-4" /></ItemMedia>
            <ItemContent>
              <ItemTitle className="text-compact font-semibold">Erdős Problems</ItemTitle>
              <ItemDescription className="text-meta">{publishedCount} published Problems</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Badge variant="secondary" className="hidden sm:inline-flex">Published collection</Badge>
              <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/item:translate-x-0.5" />
            </ItemActions>
          </Item>
          <Item className="vela-object-row gap-3 px-1 py-3.5" render={<Link href={FORMAL_COLLECTION_PATH} />}>
            <ItemMedia className="size-9 rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={CodeIcon} aria-hidden className="size-4" /></ItemMedia>
            <ItemContent>
              <ItemTitle className="text-compact font-semibold">Formal Conjectures</ItemTitle>
              <ItemDescription className="text-meta">{formalConjecturesCollection.data.items.length} rights-reviewed formalizations</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Badge variant="secondary" className="hidden sm:inline-flex">Published subset</Badge>
              <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/item:translate-x-0.5" />
            </ItemActions>
          </Item>
        </div>
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
          {formalConjecturesCollection.data.items.slice(0, 1).map((item) => <li key={item.route_slug} className="min-w-0"><Item className="vela-object-row -mx-2 gap-4 rounded-md px-2 py-4" render={<Link href={`${FORMAL_COLLECTION_PATH}/${item.route_slug}`} />}><ItemMedia aria-hidden className="size-8 rounded-md bg-primary/10 text-primary"><HugeiconsIcon aria-hidden icon={CodeIcon} className="size-4" /></ItemMedia><ItemContent><ItemTitle className="line-clamp-none block max-w-[76ch] text-compact leading-6 group-hover/item:text-primary"><ScientificText text={item.title} /></ItemTitle><ItemDescription className="text-meta">Formal Conjectures · {item.source_family}</ItemDescription></ItemContent><ItemActions className="self-start"><HugeiconsIcon icon={ArrowRight} aria-hidden className="mt-1 size-4 text-muted-foreground" /></ItemActions></Item></li>)}
        </ul> : <Empty className="border-b">
          <EmptyHeader>
            <EmptyTitle>No question is ready to preview</EmptyTitle>
            <EmptyDescription>This release retains no Problem whose source statement can be shown here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} variant="outline" size="sm" render={<Link href="/problems" />}>Browse every Problem</Button>
          </EmptyContent>
        </Empty>}
      </div>

      <section className="min-w-0" aria-labelledby="latest-results-heading">
        <div className="flex items-end justify-between gap-4 border-b pb-3">
          <h2 id="latest-results-heading" className="text-title">Reviewed Results</h2>
          <Link href="/updates" className="shrink-0 text-meta font-medium text-primary underline-offset-4 hover:underline">All updates</Link>
        </div>
        {reviewedResults.length ? <ul className="mt-2 divide-y" aria-labelledby="latest-results-heading">
          {reviewedResults.map(({ discovery, state }) => <HomeResultRow
            key={`${discovery.repository}/${discovery.problem}`}
            state={state}
            number={discovery.problem}
            href={discovery.canonicalPath ?? COLLECTION_PATH}
          />)}
        </ul> : <Empty className="border-b">
          <EmptyHeader>
            <EmptyTitle>No Result has been accepted here yet</EmptyTitle>
            <EmptyDescription>Problems remain readable, and their sources remain browsable, before any Result is admitted.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} variant="outline" size="sm" render={<Link href="/problems" />}>Browse every Problem</Button>
          </EmptyContent>
        </Empty>}
      </section>
    </PageSection>
  </PageShell>;
}
