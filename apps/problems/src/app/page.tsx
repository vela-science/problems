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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@vela/ui/components/item";
import { PageHero, PageSection, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificChangeFeed } from "@/components/vela/scientific-change-feed";
import { StatementText } from "@/components/vela/statement-text";
import { discoveredProblems, recentScientificChanges, type ProblemDiscovery } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Find scientific problems and contribute evidence",
  description: "Find scientific problems, understand the evidence around them, and contribute proofs, computations, datasets, reviews, corrections, and other results.",
};

const COLLECTION_PATH = "/problems/erdos-problems";

function problemStatement(problem: ProblemDiscovery) {
  const formal = problem.record.statement_kind === "formal";
  const statement = formal
    ? problem.record.label?.trim() || `Erdős problem ${problem.problem}`
    : problem.record.statement || problem.record.label?.trim() || `Erdős problem ${problem.problem}`;
  return <StatementText statement={statement} kind={formal ? "label" : problem.record.statement_kind} />;
}

export default async function HomePage() {
  const [catalog, activity] = await Promise.all([discoveredProblems(), recentScientificChanges(5)]);
  const assessed = catalog
    .filter((problem) => problem.record.local_standing)
    .sort((left, right) => (right.record.local_assessed_at ?? "").localeCompare(left.record.local_assessed_at ?? ""));
  const open = catalog.filter((problem) => problem.record.declared_status === "open");
  const publishedCount = catalog.length.toLocaleString();

  return <PageShell archetype="default">
    <PageHero density="compact" className="isolate">
      <div className="max-w-4xl">
        <p className="text-eyebrow uppercase text-muted-foreground">Problems.science</p>
        <h1 className="mt-3 text-display text-balance">Find a problem. See what is known. Add evidence.</h1>
        <p className="mt-4 max-w-2xl text-body text-pretty text-muted-foreground">
          Find scientific questions, understand the evidence around them, and contribute proofs,
          computations, datasets, reviews, corrections, and other results.
        </p>

        <form action={COLLECTION_PATH} method="get" aria-label="Find a problem" className="mt-7 max-w-2xl">
          <label htmlFor="home-problem-search" className="mb-2 block text-label font-medium">Find a problem</label>
          <InputGroup className="h-12 bg-background shadow-xs">
            <InputGroupAddon><HugeiconsIcon icon={Search} aria-hidden /></InputGroupAddon>
            <InputGroupInput
              id="home-problem-search"
              name="q"
              type="search"
              maxLength={200}
              placeholder="Number or topic"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="submit" variant="secondary" className="h-9 px-4">Search</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/problems" />}>
            Browse problems <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
          </Button>
          <Button size="lg" nativeButton={false} variant="outline" render={<Link href="/contribute" />}>
            Add a contribution
          </Button>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2 border-t pt-5 text-meta sm:flex-row sm:items-baseline sm:gap-3">
        <span className="font-medium text-foreground">Available today</span>
        <span className="text-muted-foreground">
          One published collection with {publishedCount} questions:
          {" "}<Link href={COLLECTION_PATH} className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-current">Erdős Problems</Link>.
        </span>
      </div>
    </PageHero>

    <PageSection aria-labelledby="start-here-heading" className="mt-12">
      <div className="max-w-2xl">
        <p className="text-eyebrow uppercase text-muted-foreground">Start here</p>
        <h2 id="start-here-heading" className="mt-1 text-title">From question to contribution</h2>
      </div>
      <ol className="mt-5 divide-y md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
        {[
          {
            href: COLLECTION_PATH,
            title: "Choose a question",
            detail: "Search by number, topic, or wording.",
          },
          {
            href: assessed[0]?.canonicalPath ? `${assessed[0].canonicalPath}?view=evidence` : COLLECTION_PATH,
            title: "Read what is known",
            detail: "Review evidence, prior work, and what remains open.",
          },
          {
            href: "/contribute",
            title: "Add a contribution",
            detail: "Share a result, correction, review, dataset, or computation.",
          },
        ].map((step, index) => <li key={step.title} className="min-w-0">
          <Link href={step.href} className="group flex min-h-28 items-start gap-4 px-1 py-5 focus-visible:outline-2 focus-visible:outline-offset-4 md:px-6 md:first:pl-0 md:last:pr-0">
            <span aria-hidden className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background font-mono text-meta tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-label font-medium">
                {step.title}
                <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </span>
              <span className="mt-1 block max-w-[32ch] text-meta text-muted-foreground">{step.detail}</span>
            </span>
          </Link>
        </li>)}
      </ol>
    </PageSection>

    <PageSection className="grid gap-12 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,.7fr)] xl:gap-16">
      <div className="min-w-0">
        <div>
          <p className="text-eyebrow uppercase text-muted-foreground">Published collection</p>
          <h2 className="mt-1 text-title">Browse what is available</h2>
        </div>

        <article className="mt-5 border-y py-6">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-subtitle">Erdős Problems</h3>
                <Badge variant="secondary">Published</Badge>
              </div>
              <p className="mt-2 max-w-[68ch] text-body text-muted-foreground">
                A source-owned collection of questions posed and curated by Paul Erdős and collaborators.
                Problem numbers are local to this collection.
              </p>
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-meta">
                <div className="flex gap-1.5"><dt className="text-muted-foreground">Questions</dt><dd className="font-mono tabular-nums">{publishedCount}</dd></div>
                <div className="flex gap-1.5"><dt className="text-muted-foreground">Listed as open by source</dt><dd className="font-mono tabular-nums">{open.length.toLocaleString()}</dd></div>
                <div className="flex gap-1.5"><dt className="text-muted-foreground">With reviewed evidence</dt><dd className="font-mono tabular-nums">{assessed.length.toLocaleString()}</dd></div>
              </dl>
            </div>
            <Button nativeButton={false} variant="outline" render={<Link href={COLLECTION_PATH} />}>
              Browse collection <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
            </Button>
          </div>
        </article>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow uppercase text-muted-foreground">Current starting points</p>
            <h2 className="mt-1 text-title">Problems with reviewed evidence</h2>
          </div>
          <Link href={COLLECTION_PATH} className="shrink-0 text-meta font-medium underline-offset-4 hover:underline">All problems</Link>
        </div>
        <p className="mt-2 max-w-2xl text-meta text-muted-foreground">
          These Problems have an assessed contribution. That does not by itself mean the whole question is resolved.
        </p>

        {assessed.length ? <ItemGroup className="mt-4 gap-0 divide-y">
          {assessed.slice(0, 4).map((problem) => <Item
            key={`${problem.repository}/${problem.problem}`}
            render={<Link href={`${problem.canonicalPath ?? COLLECTION_PATH}?view=evidence`} />}
            className="group rounded-none border-0 px-0 py-5"
          >
            <ItemMedia className="w-16 self-start font-mono text-meta tabular-nums text-muted-foreground">#{problem.problem}</ItemMedia>
            <ItemContent>
              <ItemTitle className="line-clamp-none text-label">{problemStatement(problem)}</ItemTitle>
              <ItemDescription className="line-clamp-none">
                Erdős Problems · {problem.field?.name ?? problem.topics[0]?.name ?? "Topic not yet classified"} · reviewed evidence available
              </ItemDescription>
            </ItemContent>
            <ItemActions><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" /></ItemActions>
          </Item>)}
        </ItemGroup> : <p className="mt-5 border-y py-6 text-body text-muted-foreground">No Problem has reviewed evidence in this release yet.</p>}
      </div>

      <aside className="min-w-0" aria-labelledby="recently-updated-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow uppercase text-muted-foreground">Activity</p>
            <h2 id="recently-updated-heading" className="mt-1 text-title">Recently updated</h2>
          </div>
          <Link href="/activity" className="shrink-0 text-meta font-medium underline-offset-4 hover:underline">All updates</Link>
        </div>
        <p className="mt-2 text-meta text-muted-foreground">Changes retained by the published scientific sources.</p>
        {activity.length
          ? <ScientificChangeFeed changes={activity} compact plainLanguage />
          : <p className="mt-5 border-y py-6 text-body text-muted-foreground">No recent source updates are available.</p>}
      </aside>
    </PageSection>

    <PageSection as="nav" aria-label="Contribute work" className="border-y py-0">
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
