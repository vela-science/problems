import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight01Icon as ArrowRight,
  CodeIcon,
  GitBranchIcon,
  PuzzleIcon,
  Search01Icon as Search,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formalConjecturesCollection } from "@vela/projection-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@vela/ui/components/input-group";
import { PageHero, PageSection, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { ProblemQuestionRow } from "@/components/vela/problem-question-row";
import { discoveredProblems, problemStatePreviews } from "@/lib/scientific-state";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { statementPlainText } from "@/lib/problem-statement";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Add a contribution",
  description: "Start from a Problem, check prior work, and prepare evidence for review.",
};

const ERDOS_COLLECTION = "/problems/erdos-problems";
const FORMAL_COLLECTION = "/problems/formal-conjectures";

export default async function WorkPage() {
  const catalog = await discoveredProblems();
  const candidates = [
    ...catalog
      .filter((problem) => problem.record.local_standing)
      .sort((left, right) => (right.record.local_assessed_at ?? "").localeCompare(left.record.local_assessed_at ?? "")),
    ...catalog.filter((problem) => problem.record.declared_status === "open" && problem.record.formalized && !problem.record.local_standing),
  ].filter((problem) => problem.canonicalPath).slice(0, 3);
  const candidatePreviews = await problemStatePreviews(candidates);
  const formalCandidate = formalConjecturesCollection.data.items[0] ?? null;

  return (
    <PageShell archetype="work">
      <PageHero density="compact" className="vela-work-hero">
        <h1 className="text-display">Choose a Problem</h1>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">Open its Work view to check prior approaches, attach evidence, and prepare a Result.</p>
        <form action="/search" method="get" aria-label="Find a Problem to contribute to" className="mt-6 max-w-3xl">
          <input type="hidden" name="kind" value="problem" />
          <input type="hidden" name="intent" value="contribute" />
          <label htmlFor="contribution-problem-search" className="sr-only">Find a Problem to contribute to</label>
          <InputGroup className="h-14 border-input bg-background shadow-[var(--vela-shadow-raised)] focus-within:border-primary">
            <InputGroupAddon><HugeiconsIcon icon={Search} aria-hidden className="size-5" /></InputGroupAddon>
            <InputGroupInput id="contribution-problem-search" name="q" type="search" maxLength={200} placeholder="Search by question, collection, or number" />
            <InputGroupAddon align="inline-end"><InputGroupButton type="submit" variant="secondary" className="h-10 px-4">Find Problem</InputGroupButton></InputGroupAddon>
          </InputGroup>
        </form>
      </PageHero>

      <PageSection className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14" aria-labelledby="starting-points-heading">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
            <div><p className="text-meta text-muted-foreground">Published collections</p><h2 id="starting-points-heading" className="mt-1 text-title">Starting points</h2></div>
            <Link href="/problems" className="text-meta font-medium text-primary hover:underline">Browse all Problems</Link>
          </div>

          <section aria-labelledby="erdos-starting-points" className="mt-4">
            <div className="flex items-center justify-between gap-3 px-2 py-2">
              <h3 id="erdos-starting-points" className="flex items-center gap-2 text-label"><HugeiconsIcon icon={PuzzleIcon} aria-hidden className="size-4 text-primary" />Erdős Problems</h3>
              <Link href={ERDOS_COLLECTION} className="text-micro font-medium text-muted-foreground hover:text-foreground">View collection</Link>
            </div>
            {candidatePreviews.length ? <ul className="divide-y" aria-labelledby="erdos-starting-points">
              {candidatePreviews.map(({ discovery, state }) => <ProblemQuestionRow
                key={`${discovery.repository}/${discovery.problem}`}
                state={state}
                number={discovery.problem}
                collectionLabel="Erdős problem"
                href={`${discovery.canonicalPath}/work`}
                actionLabel="Open Work"
              />)}
            </ul> : <Empty>
              <EmptyHeader>
                <EmptyTitle>No Problem has a retained question to start from</EmptyTitle>
                <EmptyDescription>A starting point needs a source statement. Browse the collection to find one whose source retains its question.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button nativeButton={false} variant="outline" size="sm" render={<Link href="/problems" />}>Browse every Problem</Button>
              </EmptyContent>
            </Empty>}
          </section>

          {formalCandidate ? <section aria-labelledby="formal-starting-points" className="mt-6">
            <div className="flex items-center justify-between gap-3 px-2 py-2">
              <h3 id="formal-starting-points" className="flex items-center gap-2 text-label"><HugeiconsIcon icon={CodeIcon} aria-hidden className="size-4 text-primary" />Formal Conjectures</h3>
              <Link href={FORMAL_COLLECTION} className="text-micro font-medium text-muted-foreground hover:text-foreground">View collection</Link>
            </div>
            <ul aria-labelledby="formal-starting-points"><li>
              <Item className="vela-object-row -mx-2 gap-4 rounded-md px-2 py-4" render={<Link href={`${FORMAL_COLLECTION}/${formalCandidate.route_slug}/work`} aria-label={`Open Work: ${statementPlainText(formalCandidate.title)}`} />}>
                <ItemMedia aria-hidden className="size-8 rounded-md bg-primary/10 text-primary"><HugeiconsIcon icon={CodeIcon} className="size-4" /></ItemMedia>
                <ItemContent>
                  <ItemTitle className="line-clamp-none block max-w-[76ch] text-compact leading-6 group-hover/item:underline group-hover/item:decoration-border group-hover/item:underline-offset-4"><ScientificText text={formalCandidate.title} /></ItemTitle>
                  <ItemDescription className="line-clamp-none flex flex-wrap items-center gap-2 text-meta"><span>{formalCandidate.source_family}</span><Badge variant="secondary" className="h-5 capitalize">{formalCandidate.category}</Badge></ItemDescription>
                </ItemContent>
                <ItemActions className="self-start text-meta font-medium text-primary"><span className="hidden sm:inline">Open Work</span><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 transition-transform duration-150 group-hover/item:translate-x-0.5" /></ItemActions>
              </Item>
            </li></ul>
          </section> : null}
        </div>

        <aside aria-label="Other contribution paths" className="h-fit border-l pl-5">
          <h2 className="text-label">Already have work?</h2>
          <p className="mt-2 text-meta text-muted-foreground">Connect a GitHub repository or exact public commit, then attach it to a Problem.</p>
          <Button className="mt-4 w-full justify-between" variant="outline" nativeButton={false} render={<Link href="/import" />}>
            <span className="flex items-center gap-2"><HugeiconsIcon icon={GitBranchIcon} aria-hidden className="size-4" />Connect code</span><HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
          </Button>
          <p className="mt-5 border-t pt-4 text-micro text-muted-foreground">Problems keeps the draft and handoff visible. Source files, local tools, credentials, and execution stay in GitHub or your local workspace.</p>
        </aside>
      </PageSection>
    </PageShell>
  );
}
