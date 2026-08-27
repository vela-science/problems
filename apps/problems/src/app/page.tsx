import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight01Icon as ArrowRight,
  BookOpen01Icon,
  CheckmarkCircle01Icon,
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
import { HomeStatePanel, type StateEntry } from "@/components/vela/home-state-panel";
import { CollectionCoverageBar, collectionCoverage } from "@/components/vela/collection-coverage-bar";
import { compactResultLimitation, exactResultHeadline } from "@/components/vela/problem-overview-reference";
import { currentReview } from "@/components/vela/problem-provenance";
import { discoveredProblems, problemDiscoveryCollections, problemStatePreviews } from "@/lib/scientific-state";
import { formalConjecturesCollection } from "@vela/projection-data";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import styles from "./home-brand.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Open problems and the evidence around them",
  description: "Find scientific problems, understand the evidence around them, and contribute proofs, computations, datasets, reviews, corrections, and other results.",
};

const COLLECTION_PATH = "/problems/erdos-problems";
const FORMAL_COLLECTION_PATH = "/problems/formal-conjectures";

/* Home's dominant object is what this place has admitted.
 *
 * Home used to be `/problems` with fewer rows: the same title, the same lead,
 * the same search field, then the same two collections and the same Erdős
 * questions — except `/problems` does all of it better and sits directly
 * beneath Home in the sidebar. No amount of restyling fixes two pages with one
 * job.
 *
 * `/problems` owns browsing and never renders a Result. So Home owns the other
 * half: what has actually been accepted here, and the scope each Result does
 * not settle — the one claim a catalogue cannot make.
 *
 * The composition is the shadcn.io `hero-split-commit-graph` anatomy — a
 * contained entry card, one large claim and its actions on the left, the
 * working instrument on the right — over the masked SVG ground from
 * `hero-centered-line-grid-bg`. Both blocks fill their instrument with
 * invented data; every value here is read from the projection. */

/* What this place does, in three lines a newcomer can check on the page. Not a
   restatement of the lead: each names something the instrument beside it shows. */
const PROMISES = [
  "Every Problem keeps its exact sources",
  "Every Result names what it does not settle",
  "Every Decision is attributable and replayable",
];

function SectionLink({ href, children, label }: { href: Route; children: React.ReactNode; label?: string }) {
  return <Link
    href={href}
    aria-label={label}
    className="inline-flex min-h-6 shrink-0 items-center gap-1 text-meta font-medium text-primary underline-offset-4 hover:underline"
  >
    {children}
    <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-3.5" />
  </Link>;
}

function CollectionCard({ href, icon, name, detail, badge }: {
  href: Route;
  icon: typeof BookOpen01Icon;
  name: string;
  detail: string;
  badge: string;
}) {
  return <Item className="vela-object-row h-full items-start gap-4 rounded-lg border p-5" render={<Link href={href} />}>
    <ItemMedia className="size-9 rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={icon} aria-hidden className="size-4" /></ItemMedia>
    <ItemContent>
      <ItemTitle className="line-clamp-none flex-wrap gap-2 text-compact font-semibold group-hover/item:text-primary">
        {name} <Badge variant="secondary" className="font-normal">{badge}</Badge>
      </ItemTitle>
      <ItemDescription className="line-clamp-none text-meta">{detail}</ItemDescription>
    </ItemContent>
    <ItemActions className="self-center">
      <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/item:translate-x-0.5" />
    </ItemActions>
  </Item>;
}

export default async function HomePage() {
  const catalog = await discoveredProblems();
  const assessed = catalog
    .filter((problem) => problem.record.local_standing)
    .sort((left, right) => (right.record.local_assessed_at ?? "").localeCompare(left.record.local_assessed_at ?? ""));

  const collections = problemDiscoveryCollections(catalog);
  const erdos = collections.find((collection) => collection.key === "erdos-problems") ?? collections[0] ?? null;
  const formalCount = formalConjecturesCollection.data.items.length;

  /* The topic entries are the collection's own most-populated Topics — a
     source-native vocabulary the projection already carries, so Home invents no
     taxonomy — and `/problems/erdos-problems` really filters on this key. */
  const entries = (erdos?.topics ?? []).slice(0, 5);

  const resolvedPreviews = await problemStatePreviews(assessed.slice(0, 4));
  const reviewed = resolvedPreviews
    .filter(({ state }) => currentReview(state))
    .sort((left, right) => (
      (currentReview(right.state)?.reviewed_at ?? "").localeCompare(currentReview(left.state)?.reviewed_at ?? "")
    ))
    .slice(0, 3);

  const stateEntries: StateEntry[] = reviewed.flatMap(({ discovery, state }) => {
    const result = state.claims.find((claim) => claim.id === state.currentClaimId);
    if (!result) return [];
    return [{
      number: discovery.problem,
      href: `${discovery.canonicalPath ?? COLLECTION_PATH}/results`,
      headline: exactResultHeadline(result.assertion) ?? result.assertion,
      limitation: compactResultLimitation(result.assertion),
      reviewedAt: currentReview(state)?.reviewed_at ?? null,
    }];
  });

  const repositoryName = reviewed[0]?.state.repositoryName ?? "This Repository";
  const root = catalog[0]?.releaseRoot ?? null;

  return <PageShell archetype="default">
    <PageHero density="compact" className={styles.hero}>
      <div className={styles.card}>
        {/* Graph paper, radially faded. A quiet ground for an instrument, and
            the one texture that is unmistakably not data: no line here encodes
            a retained relationship. */}
        <svg aria-hidden className={styles.ground} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="home-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#home-grid)" />
        </svg>

        <div className={styles.grid}>
          <div className="min-w-0">
            <p className={styles.pill}>
              <span aria-hidden className="size-1.5 rounded-full bg-status-progress" />
              <span>{catalog.length.toLocaleString()} published Problems</span>
              <span aria-hidden className="text-muted-foreground/50">·</span>
              <span>{formalCount} rights-reviewed formalizations</span>
              <span aria-hidden className="text-muted-foreground/50">·</span>
              {/* The number a newcomer most needs and was least likely to
                  find. It lived in a collection card halfway down the page,
                  where "2 with an accepted Result" reads as a detail rather
                  than as the shape of the whole release. */}
              <span>{assessed.length} with reviewed evidence</span>
            </p>

            <h1 className={styles.title}>Open problems and the evidence around them</h1>
            <p className={styles.lead}>
              Find a scientific question, read what is known, and add a result.
            </p>

            <ul className="mt-6 space-y-2.5">
              {PROMISES.map((promise) => <li key={promise} className="flex items-start gap-2.5">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} aria-hidden className="mt-0.5 size-4 shrink-0 text-status-progress" />
                <span className="text-meta text-foreground">{promise}</span>
              </li>)}
            </ul>

            <form action="/search" method="get" aria-label="Find a problem" className="mt-7">
              <label htmlFor="home-problem-search" className="sr-only">Find a problem</label>
              <InputGroup className="h-13 border-input bg-[var(--vela-surface-raised)] shadow-[var(--vela-shadow-raised)] focus-within:border-primary">
                <InputGroupAddon><HugeiconsIcon icon={Search} aria-hidden className="size-5" /></InputGroupAddon>
                <InputGroupInput
                  id="home-problem-search"
                  name="q"
                  type="search"
                  maxLength={200}
                  placeholder="Find a problem"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton type="submit" variant="secondary" className="h-9 px-4">Search</InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>

            {entries.length ? <nav aria-label="Start with a topic" className="mt-3.5 flex flex-wrap items-center gap-2">
              {entries.map((topic) => <Link
                key={topic.key}
                href={`${COLLECTION_PATH}?topic=${encodeURIComponent(topic.key)}` as Route}
                aria-label={`${topic.name}, ${topic.problemCount.toLocaleString()} Problems`}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 text-meta text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {topic.name}
                <span className="font-mono tabular-nums text-muted-foreground">{topic.problemCount.toLocaleString()}</span>
              </Link>)}
            </nav> : null}

            <div className="mt-7 flex flex-wrap gap-3">
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

          {stateEntries.length ? <HomeStatePanel
            entries={stateEntries}
            repositoryName={repositoryName}
            root={root}
            openCount={catalog.length - assessed.length}
          /> : <Empty className="rounded-xl border bg-card">
            <EmptyHeader>
              <EmptyTitle>No Result has been accepted here yet</EmptyTitle>
              <EmptyDescription>Problems remain readable, and their sources remain browsable, before any Result is admitted.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button nativeButton={false} variant="outline" size="sm" render={<Link href="/problems" />}>Browse every Problem</Button>
            </EmptyContent>
          </Empty>}
        </div>
      </div>
    </PageHero>

    <PageSection className="grid gap-10">
      <section aria-labelledby="collections-heading" className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b pb-3">
          <div className="min-w-0">
            <h2 id="collections-heading" className="text-title">Published collections</h2>
            <p className="mt-1.5 max-w-2xl text-meta text-muted-foreground">
              Collection names qualify local identifiers; inclusion does not determine scientific truth.
            </p>
          </div>
          <SectionLink href="/problems">Compare collections</SectionLink>
        </div>
        {/* A count is skimmed; a proportion is not. Two of 1,217 is the
            honest shape of this release, and a reader who meets a page of
            rows with nothing in the Result column deserves to have seen it. */}
        <div className="mt-5 rounded-lg border p-5">
          <CollectionCoverageBar coverage={collectionCoverage(catalog)} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <CollectionCard
            href={COLLECTION_PATH}
            icon={BookOpen01Icon}
            name="Erdős Problems"
            badge="Published collection"
            detail={`${catalog.length.toLocaleString()} numbered Problems · ${assessed.length} with an accepted Result`}
          />
          <CollectionCard
            href={FORMAL_COLLECTION_PATH}
            icon={CodeIcon}
            name="Formal Conjectures"
            badge="Published subset"
            detail={`${formalCount} rights-reviewed Lean declaration occurrences`}
          />
        </div>
      </section>

      {/* The one claim a newcomer cannot check by reading rows, stated once and
          linked rather than diagrammed. A green check is not acceptance. */}
      <p className="max-w-3xl text-body text-muted-foreground">
        A Submission is producer input and a check is one scoped report. Neither changes what
        this place holds to be true.{" "}
        <Link href="/about" className="font-medium text-foreground underline underline-offset-4">
          How a Result is accepted
        </Link>
      </p>
    </PageSection>
  </PageShell>;
}
