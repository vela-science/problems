import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
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
import { HomeStatePanel, type StateEntry } from "@/components/vela/home-state-panel";
import { CollectionCoverageBar, collectionCoverage } from "@/components/vela/collection-coverage-bar";
import { compactResultLimitation, exactResultHeadline } from "@/components/vela/problem-overview-reference";
import { currentReview } from "@/components/vela/problem-provenance";
import { discoveredProblems, problemStatePreviews } from "@/lib/scientific-state";
import { formalConjecturesCollection } from "@vela/projection-data";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import styles from "./home-brand.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Start from the frontier",
  description: "Open a scientific problem and see where the work has reached: what its sources report, what has been accepted, and the scope no Result covers yet.",
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

  const formalCount = formalConjecturesCollection.data.items.length;

  /* No topic chips. They were the collection's own Topics, linking into
     `/problems/erdos-problems?topic=…` — which is to say they were a second,
     smaller copy of the faceted browse on the page directly beneath Home in the
     rail. `DESIGN.md` settles that case: "Home must not restate its headings or
     its question list — Home once did, and was a weaker copy of the page
     directly beneath it in the sidebar." Search and the Repository's admitted
     state are what Home carries that a catalogue cannot. */

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
            {/* Two facts, not three. "{n} with reviewed evidence" was added
                here when it had no other home; the coverage bar below now
                states the same number against its denominator, which is the
                stronger telling, so this one is a restatement five lines
                above it. The separators dropped their opacity modifier: at
                `/50` they measured 2.23:1 in light and 2.73:1 in dark. */}
            {/* The claim, then the inventory — in that order.
              *
              * The count used to render above the `h1`, so the first thing the
              * page said was how many rows it holds. Two of those 1,217
              * Problems carry an accepted Result, which makes a leading count a
              * statement about inventory rather than about what a reader gets.
              * It is still a real fact and it stays; it simply no longer speaks
              * first.
              *
              * "Start from the frontier" is honest on the 1,215 Problems that
              * hold no Result: a frontier at zero is still a frontier, and the
              * lead says what it is made of so the abstract word lands on
              * something exact. It claims no ranking, discovery or allocation,
              * which `PRODUCT.md` forbids the product from implying. */}
            <h1 className={styles.title}>Start from the frontier.</h1>
            <p className={styles.lead}>Open a scientific problem: what its sources report, what has been accepted, and the scope no Result covers yet.</p>
            <p className={styles.pill}>
              <span aria-hidden className="size-1.5 rounded-full bg-status-progress" />
              <span>{catalog.length.toLocaleString()} published Problems</span>
              <span aria-hidden className="text-muted-foreground">·</span>
              <span>{formalCount} rights-reviewed formalizations</span>
            </p>

            {/* Three green check-circles used to assert "Every Result names
                what it does not settle" and two more promises here. The same
                glyph in the same `--status-progress` means "this Verification
                check passed" about three hundred pixels down the same screen,
                and DESIGN.md is explicit that success and evidence colours
                encode real state only. A promise is not state, and a product
                whose whole claim is that a check's meaning is bounded by its
                scope should not spend the check's own glyph on marketing.

                The instrument beside them already proves all three: it names
                the Problem, its Result, that Result's scope, and who decided.
                The claim was redundant with its own evidence. */}
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
            {/* The heading labels the two cards below it. The sentence that
                followed — "Collection names qualify local identifiers;
                inclusion does not determine scientific truth." — is rendered
                verbatim by `/problems`, which owns these collections; Home
                linked there in the same row. */}
            <h2 id="collections-heading" className="text-title">Published collections</h2>
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
            detail={`${catalog.length.toLocaleString()} numbered Problems`}
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
        <Link href="/decisions" className="font-medium text-foreground underline underline-offset-4">
          How a Result is accepted
        </Link>
      </p>
    </PageSection>
  </PageShell>;
}
