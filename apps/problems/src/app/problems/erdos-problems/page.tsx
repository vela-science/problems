import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity01Icon,
  ArrowRight01Icon as ArrowRight,
  Compass01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@vela/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vela/ui/components/table";
import { Input } from "@vela/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@vela/ui/components/select";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { StatementText } from "@/components/vela/statement-text";
import { paragraphsOf } from "@/lib/problem-statement";
import { CollectionDistribution } from "@/components/vela/collection-distribution";
import { CollectionCoverageBar, collectionCoverage } from "@/components/vela/collection-coverage-bar";
import { isJustTheName } from "@/lib/problem-label";
import { statementPlainText } from "@/lib/problem-statement";
import { structuredDataScript } from "@/lib/structured-data";
import { SourceCorpusMap } from "@/components/vela/source-corpus-map";
import { ProblemSourceCoverage } from "@/components/vela/problem-source-coverage";
import { LedgerPager } from "@/components/vela/ledger-pager";
import { ScientificChangeFeed } from "@/components/vela/scientific-change-feed";
import { Disclosure } from "@/components/vela/disclosure";
import {
  discoveredProblems,
  observedSourceCorpusMap,
  problemDiscoveryCollections,
  problemDiscoveryScopeQuery,
  problemSourceObservationCoverage,
  recentScientificChanges,
  reviewedProblemSourceCoverage,
  type ProblemDiscovery,
  problemStatementIndex,
  problemStatementKey,
  type ProblemStatementIndex,
} from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Erdős Problems",
  description: "Browse 1,217 Erdős problems, then inspect source status, current Repository state, and supporting evidence.",
  alternates: { canonical: "/problems/erdos-problems" },
};

type Query = {
  view?: string;
  domain?: string;
  hub?: string;
  collection?: string;
  field?: string;
  topic?: string;
  q?: string;
  status?: string;
  standing?: string;
  source?: string;
  repository?: string;
  formalized?: string;
  exact_id?: string;
  coverage?: string;
  sort?: string;
  page?: string;
};

const PAGE_SIZE = 48;
const optionLabel = (value: string) => value.replaceAll(/[-_]/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
const selectItems = (allLabel: string, entries: ReadonlyArray<readonly [string, string]>) => Object.fromEntries([
  ["all", allLabel],
  ...entries,
]);

/* The statement is the row.
 *
 * Every other element earns its place by varying. Four did not: the collection
 * badge (the route already identifies this collection, so it printed on all
 * 1,217 rows), the
 * contribution path (a hard-coded literal), the Local Standing caption ("not
 * assessed" on 1,215 of 1,217), and the topic list, which the eyebrow and
 * `theme` computed identically and printed twice. What is left is the number,
 * the question, and the handful of facts that differ between two rows.
 *
 * The heading used to be the source-owned label, on the reasoning that the
 * alternative was Lean and a directory should not be a wall of implementation
 * syntax. That reasoning held while the label was the only readable text
 * available. It is not: the retaining sources publish the question in prose,
 * and a directory of 1,217 rows reading "Erdős problem 412" is not scannable
 * either — it is 1,217 rows a reader cannot choose between. The written
 * question leads, and the label stands only where no source wrote one. */
function ProblemRows({ problems, statements }: {
  problems: ProblemDiscovery[];
  statements: ProblemStatementIndex;
}) {
  if (!problems.length) {
    /* Cause, then one action — DESIGN.md:410. A bare paragraph could state the
       cause but had nowhere to put the recovery. */
    return <Empty className="border-0">
      <EmptyHeader>
        <EmptyTitle>No Problems match this view</EmptyTitle>
        <EmptyDescription>Every filter is combined, so narrowing on several at once can leave nothing.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} size="sm" variant="outline" render={<Link href={COLLECTION_PATH} />}>Clear filters</Button>
      </EmptyContent>
    </Empty>;
  }
  /* A table, because it is one.
   *
   * This was a grid of divs whose six-track column template was written twice —
   * once on the header row and once on every data row — and kept in sync by
   * hand. Nothing in the app carried table semantics: `role="table"`, `"row"`
   * and `"columnheader"` appeared zero times, so no assistive technology could
   * relate a cell to its column. `Table` owns the template once and brings its
   * own horizontal scroll container, which DESIGN.md:424 requires of wide
   * material — "within their own instrument, never the document".
   *
   * The narrow columns reveal on the *container's* width, not the viewport's.
   * Keyed to `sm:` they appeared at a 640px viewport, but the rail takes ~250px
   * before this table sees any of it: at 768 the four state columns claimed
   * 343px and left the question 60px, so the page's own subject got 12% of the
   * width. Below the threshold their values ride the compact line under the
   * question instead, which is the same switch seen from the other side.
   *
   * The question cell is `max-w-0` so it flexes into whatever the fixed columns
   * leave, and `whitespace-normal` because `TableCell` ships `nowrap`: with the
   * overflow guard below, `nowrap` clipped the statement mid-formula on 18 of
   * 48 rows at 1440 and every row at 375, with no ellipsis, which traded a
   * layout bug for a silent data-loss one. Wrapping lets the
   * `overflow-wrap: anywhere` this codebase already sets do the work, and only
   * an unbreakable formula reaches the guard. The measure and overflow guard sit
   * on a span inside the anchor
   * rather than on the anchor: an `overflow-hidden` anchor would clip its own
   * `after:inset-0`, and the stretched link is the row's click target. Without
   * that guard a single unbreakable KaTeX box set a 1333px min-content floor in
   * a 1166px container and pushed the state columns out of view. */
  return <div className="vela-object-surface @container/directory mt-3 overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-14">Number</TableHead>
          <TableHead>Question</TableHead>
          <TableHead className="hidden w-28 @2xl/directory:table-cell">Source says</TableHead>
          <TableHead className="hidden w-24 @2xl/directory:table-cell">Formal</TableHead>
          <TableHead className="hidden w-32 @2xl/directory:table-cell">Result here</TableHead>
          <TableHead className="w-8"><span className="sr-only">Open</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {problems.map((problem) => {
          const record = problem.record;
          const kind = record.statement_kind;
          const readableLabel = record.label?.trim() || (kind === "formal" ? `Problem ${problem.problem}` : record.statement) || `Problem ${problem.problem}`;
          const key = problemStatementKey(problem);
          const written = key ? statements[key] : undefined;
          const question = written ? paragraphsOf(written.text)[0] ?? "" : "";
          /* Spoken, not typeset: the row's own cell renders the question as
             MathML, but an `aria-label` replaces the cell rather than adding to
             it, so a raw one announced "backslash subseteq backslash brace". */
          const rowName = statementPlainText(question || readableLabel);
          const solved = ["solved", "proved", "disproved"].includes(record.declared_status);
          return <TableRow key={`${problem.repository}/${problem.problem}`} className="group relative">
            <TableCell className="align-baseline font-mono text-meta tabular-nums text-muted-foreground">#{problem.problem}</TableCell>
            <TableCell className="max-w-0 align-baseline whitespace-normal">
              {/* One stretched link per row: a table row cannot be wrapped in an
                  anchor, and a link per cell would put six of them in the tab
                  order for one destination. */}
              <Link
                aria-label={rowName}
                href={problem.canonicalPath ?? "/problems"}
                className="block text-label leading-snug after:absolute after:inset-0 group-hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
              >
                {/* A Problem with no retained statement used to show its own name
                    — "Erdős problem 2" — in the Question column, which reads as a
                    question that happens to be uninformative rather than as an
                    absence. Testing the field is not enough: these rows carry the
                    generated name as their label, so the test is whether the text
                    on offer IS the name. */}
                <span className="block max-w-[74ch] overflow-hidden">
                  {question
                    ? <ScientificText text={question} />
                    : isJustTheName(readableLabel, problem.problem)
                      ? <span className="text-muted-foreground">No statement retained &mdash; open to read what the source holds</span>
                      : <StatementText statement={kind === "formal" ? readableLabel : record.statement || readableLabel} kind={kind === "formal" ? "label" : kind} className="text-label" />}
                </span>
              </Link>
              <span className="mt-1.5 flex flex-wrap gap-x-2 text-meta text-muted-foreground @2xl/directory:hidden">
                {/* "Source says", because the column header that said it is
                    hidden here. Above the breakpoint the source's word sits
                    under a `Source says` heading with `Result here` beside it;
                    below it, the heading is gone and the word rendered bare —
                    while the site's own value on the same line kept its
                    `Result` prefix. So a phone showed "proved · Result
                    accepted" with only one of the two attributed, which is the
                    single comprehension error this product says it must never
                    cause. The columns carry their attribution in a header; these
                    chips have to carry it themselves. */}
                <span><span className="text-muted-foreground">Source says</span> <span className="capitalize">{record.declared_status}</span></span><span>{record.formalized ? "Formalized" : "No formal declaration"}</span>{record.local_standing ? <span>Result here {record.local_standing.replaceAll("_", " ")}</span> : null}
              </span>
            </TableCell>
            <TableCell className="hidden align-baseline text-meta capitalize @2xl/directory:table-cell">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className={`size-1.5 rounded-full ${solved ? "bg-status-progress" : "bg-status-caution"}`} />{record.declared_status}
              </span>
            </TableCell>
            <TableCell className="hidden align-baseline text-meta text-muted-foreground @2xl/directory:table-cell">{record.formalized ? "In Lean" : <><span aria-hidden>—</span><span className="sr-only">No formal statement</span></>}</TableCell>
            {/* 1,215 of 1,217 rows said "Not reviewed", so the column spent a
                fifth of the width restating the default. The two that carry a
                reviewed Result are the information, and they now say so. */}
            <TableCell className="hidden align-baseline text-meta @2xl/directory:table-cell">{record.local_standing
              ? <span className="inline-flex items-center gap-1.5 font-medium text-status-progress"><span aria-hidden className="size-1.5 rounded-full bg-status-progress" />{record.local_standing.replaceAll("_", " ")}</span>
              : <><span aria-hidden className="text-muted-foreground">—</span><span className="sr-only">No Result decision</span></>}</TableCell>
            <TableCell className="align-baseline">
              <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
            </TableCell>
          </TableRow>;
        })}
      </TableBody>
    </Table>
  </div>;
}

const COLLECTION_PATH = "/problems/erdos-problems";

export default async function ErdosProblemsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const view = query.view === "overview" ? "overview" : "all";
  const requestedCoverage = query.coverage === "complete" || query.coverage === "partial" || query.coverage === "unobserved" ? query.coverage : "all";
  const catalogPromise = discoveredProblems();
  const [catalog, statements, activity, sourceCoverage, sourceCorpora] = await Promise.all([
    catalogPromise,
    catalogPromise.then((entries) => problemStatementIndex(entries[0]?.releaseRoot ?? "")),
    view === "overview" ? recentScientificChanges(5) : Promise.resolve([]),
    view === "overview" ? reviewedProblemSourceCoverage(catalogPromise) : Promise.resolve(null),
    view === "overview" || requestedCoverage !== "all" ? observedSourceCorpusMap(catalogPromise) : Promise.resolve(null),
  ]);
  const domains = [...new Map(catalog.flatMap(({ domain }) => domain ? [[domain.key, domain.name] as const] : [])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const selectedDomain = query.domain && domains.some(([key]) => key === query.domain) ? query.domain : "all";
  const domainCatalog = selectedDomain === "all" ? catalog : catalog.filter(({ domain }) => domain?.key === selectedDomain);
  const hubs = [...new Map(domainCatalog.flatMap((problem) => problem.hubs.map((hub) => [hub.key, hub.name] as const))).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const selectedHub = query.hub && hubs.some(([key]) => key === query.hub) ? query.hub : "all";
  const profiledCatalog = selectedHub === "all" ? domainCatalog : domainCatalog.filter((problem) => problem.hubs.some(({ key }) => key === selectedHub));
  const collections = problemDiscoveryCollections(profiledCatalog);
  const collectionCatalog = profiledCatalog;
  const fields = [...new Map(collectionCatalog.flatMap((problem) => problem.field ? [[problem.field.key, problem.field.name] as const] : [])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const selectedField = query.field && fields.some(([key]) => key === query.field) ? query.field : "all";
  const fieldCatalog = selectedField === "all" ? collectionCatalog : collectionCatalog.filter((problem) => problem.field?.key === selectedField);
  const topics = [...new Map(fieldCatalog.flatMap((problem) => problem.topics.map(({ key, name }) => [key, name] as const))).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const selectedTopic = query.topic && topics.some(([key]) => key === query.topic) ? query.topic : "all";
  const scopedCatalog = selectedTopic === "all" ? fieldCatalog : fieldCatalog.filter((problem) => problem.topics.some(({ key }) => key === selectedTopic));
  const scopeQuery = (overrides: Partial<{ domain: string; hub: string; field: string; topic: string }> = {}) => problemDiscoveryScopeQuery({
    domain: selectedDomain,
    hub: selectedHub,
    field: selectedField,
    topic: selectedTopic,
    ...overrides,
  });

  const collectionStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Erdős Problems",
    url: "https://problems.science/problems/erdos-problems",
    numberOfItems: catalog.length,
    isPartOf: { "@type": "CollectionPage", name: "Problems", url: "https://problems.science/problems" },
  };

  if (view === "overview") {
    const stateProblems = scopedCatalog.filter(({ record }) => record.local_standing)
      .sort((left, right) => right.record.source_count - left.record.source_count || left.problem.localeCompare(right.problem, undefined, { numeric: true }));
    const activeCollections = collections;
    const topicRows = activeCollections.flatMap((collection) => collection.topics.map((topic) => ({ collection, topic })))
      .filter(({ topic }) => selectedTopic === "all" || topic.key === selectedTopic)
      .sort((left, right) => right.topic.problemCount - left.topic.problemCount || left.topic.name.localeCompare(right.topic.name));

    return <PageShell archetype="problem">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredDataScript(collectionStructuredData) }} />
      <PageHero className="vela-route-hero grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.42fr)] lg:items-end">
        <div><h1 className="text-display">Erdős Problems</h1><p className="typeset typeset-compact mt-4 max-w-2xl text-muted-foreground">Browse this source-owned collection by topic, then inspect each question, its evidence, prior work, and current Repository state.</p><div className="mt-6 flex flex-wrap gap-3"><Button nativeButton={false} render={<Link href={{ pathname: COLLECTION_PATH, query: { view: "all", ...scopeQuery() } }} />}>Open collection directory <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button><Button nativeButton={false} variant="outline" render={<Link href="/contribute" />}>Add a contribution</Button></div></div>
        <div className="vela-evidence-surface rounded-xl px-5 py-5"><p className="text-eyebrow text-muted-foreground">Collection scope</p><p className="mt-2 text-title">{catalog.length.toLocaleString()} Erdős problems</p><p className="mt-2 text-meta text-muted-foreground">This source profile organizes the collection into {new Set(catalog.flatMap(({ topics }) => topics.map(({ key }) => key))).size} source-owned Topics. Supporting sources remain evidence attached to each Problem.</p><div className="mt-4 flex flex-wrap gap-2">{domains.map(([key, name]) => <Link key={key} href={{ pathname: COLLECTION_PATH, query: { domain: key } }} className="rounded-full bg-background/70 px-3 py-1.5 text-meta font-medium hover:bg-background">Area · {name}</Link>)}</div></div>
      </PageHero>

      <PageSection aria-labelledby="browse-problems">
        <PageSectionHeader><div><p className="text-eyebrow text-muted-foreground">Explore the collection</p><h2 id="browse-problems" className="mt-1 text-title">Topics and related sources</h2></div></PageSectionHeader>
        <div className="mt-6 overflow-hidden rounded-xl bg-muted/35 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
          <nav aria-label="Published collections" className="p-3 lg:bg-background/35">
            <p className="px-3 pb-2 text-eyebrow text-muted-foreground">Collections</p>
            <Link href={{ pathname: COLLECTION_PATH, query: scopeQuery({ field: "all", topic: "all" }) }} aria-current="page" className="flex items-center justify-between rounded-lg px-3 py-3 text-label hover:bg-background/60 aria-[current=page]:bg-background aria-[current=page]:shadow-sm"><span>All Erdős problems</span><span className="font-mono text-meta text-muted-foreground">{profiledCatalog.length}</span></Link>
          </nav>
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-eyebrow text-muted-foreground">Browse by Topic</p><h3 className="mt-1 text-subtitle">All current source Topics</h3>{fields.length === 0 ? <p className="mt-2 text-meta text-muted-foreground">This collection declares a flat Topic vocabulary and no Field taxonomy.</p> : null}</div>{selectedTopic !== "all" ? <Button nativeButton={false} size="sm" variant="ghost" render={<Link href={{ pathname: COLLECTION_PATH, query: scopeQuery({ topic: "all" }) }} />}>Clear Topic</Button> : null}</div>
            <div className="mt-5 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
              {topicRows.slice(0, 18).map(({ collection, topic }, index) => <Link key={`${collection.key}/${topic.key}`} href={{ pathname: COLLECTION_PATH, query: scopeQuery({ topic: topic.key }) }} className="group flex items-start gap-3 rounded-lg px-2 py-4 hover:bg-background/60"><span className="font-mono text-meta text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block text-label group-hover:underline">{topic.name}</span><span className="mt-1 block text-meta text-muted-foreground">{topic.problemCount} Problems · {topic.localStanding} with local State</span></span><HugeiconsIcon icon={ArrowRight} aria-hidden className="ml-auto mt-0.5 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" /></Link>)}
            </div>
          </div>
        </div>
      </PageSection>

      {sourceCorpora ? <PageSection><SourceCorpusMap corpus={sourceCorpora} /></PageSection> : null}

      {sourceCoverage ? <PageSection><ProblemSourceCoverage coverage={sourceCoverage} /></PageSection> : null}

      <PageSection className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
        <section className="vela-direction-surface rounded-xl px-5 py-6 sm:px-7" aria-labelledby="source-owned-contribution"><p className="text-eyebrow text-muted-foreground">Choose what to do next</p><h2 id="source-owned-contribution" className="mt-2 text-title">Contributions stay with their source</h2><p className="mt-4 max-w-[65ch] text-body text-muted-foreground">Choose a Problem, review its source repository, and continue in your preferred local tool when you need to run code or edit files. The site publishes no central scientific priority queue.</p><Button className="mt-5" nativeButton={false} variant="outline" render={<Link href="/contribute" />}>Add a contribution</Button></section>
        <section className="vela-evidence-surface rounded-xl px-5 py-6 sm:px-7" aria-labelledby="reviewed-evidence"><div className="flex items-center gap-2"><HugeiconsIcon icon={Compass01Icon} aria-hidden className="size-5 text-[var(--status-evidence)]" /><p className="text-eyebrow text-muted-foreground">Reviewed evidence</p></div><h2 id="reviewed-evidence" className="mt-2 text-title">Problems with reviewed Results</h2>{stateProblems.length ? <ProblemRows problems={stateProblems.slice(0, 3)} statements={statements} /> : <div className="py-8"><p className="text-subtitle">No reviewed Result in this scope.</p><p className="mt-2 text-meta text-muted-foreground">Source questions remain discoverable without implying that they were reviewed here.</p></div>}</section>
      </PageSection>

      <PageSection className="vela-history-surface rounded-xl px-5 py-6 sm:px-7" aria-labelledby="state-history"><div className="flex items-end justify-between gap-4"><div><div className="flex items-center gap-2"><HugeiconsIcon icon={Activity01Icon} aria-hidden className="size-5" /><p className="text-eyebrow text-muted-foreground">Recent changes</p></div><h2 id="state-history" className="mt-2 text-title">Latest scientific history</h2></div><Link href="/updates" className="inline-flex min-h-6 items-center text-meta font-medium underline-offset-4 hover:underline">Full history</Link></div><ScientificChangeFeed changes={activity} compact /></PageSection>
    </PageShell>;
  }

  const q = query.q?.trim().slice(0, 200).toLocaleLowerCase() ?? "";
  const statuses = [...new Set(catalog.map((problem) => problem.record.declared_status))].sort();
  const standings = [...new Set(catalog.map((problem) => problem.record.local_standing ?? "none"))].sort();
  const sources = [...new Set(catalog.flatMap((problem) => problem.record.source_ids))].sort();
  const repositories = [...new Set(catalog.map(({ repository }) => repository))].sort();
  const status = query.status && statuses.includes(query.status) ? query.status : "all";
  const standing = query.standing && standings.includes(query.standing) ? query.standing : "all";
  const source = query.source && sources.includes(query.source) ? query.source : "all";
  const repository = query.repository && repositories.includes(query.repository) ? query.repository : "all";
  const formalized = query.formalized === "yes" || query.formalized === "no" ? query.formalized : "all";
  const exactId = query.exact_id?.trim().slice(0, 256) ?? "";
  const coverage = requestedCoverage;
  const sort = ["number", "status", "sources", "reviewed"].includes(query.sort ?? "") ? query.sort! : "number";
  const sourceCoverageByRoute = sourceCorpora ? problemSourceObservationCoverage(sourceCorpora, catalog) : null;
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  /* What is currently narrowing the list, in the reader's words, so the reset
     appears whenever anything is set rather than for two of the ten. */
  const narrowing = [
    ["Area", selectedDomain !== "all" ? domains.find(([key]) => key === selectedDomain)?.[1] : null],
    ["Hub", selectedHub !== "all" ? hubs.find(([key]) => key === selectedHub)?.[1] : null],
    ["Search", query.q?.trim() ? query.q.trim().slice(0, 40) : null],
    ["Source says", status !== "all" ? status : null],
    ["Result here", standing !== "all" ? standing.replaceAll("_", " ") : null],
    ["Source", source !== "all" ? source : null],
    ["Repository", repository !== "all" ? repository : null],
    ["Formal", formalized !== "all" ? (formalized === "yes" ? "in Lean" : "no declaration") : null],
    ["Coverage", coverage !== "all" ? coverage : null],
    ["Exact id", exactId || null],
    ["Sort", sort !== "number" ? sort : null],
  ].flatMap(([label, value]) => value ? [{ label: label as string, value: String(value) }] : []);

  const problems = scopedCatalog.filter((problem) => {
    const text = [problem.problem, problem.field?.name ?? "", ...problem.topics.map(({ name }) => name), problem.collection?.name ?? "", ...problem.hubs.map(({ name }) => name), problem.theme, problem.record.statement, ...problem.record.tags].join(" ").toLocaleLowerCase();
    if (q && !text.includes(q)) return false;
    if (status !== "all" && problem.record.declared_status !== status) return false;
    if (standing !== "all" && (problem.record.local_standing ?? "none") !== standing) return false;
    if (source !== "all" && !problem.record.source_ids.includes(source)) return false;
    if (repository !== "all" && problem.repository !== repository) return false;
    if (formalized === "yes" && !problem.record.formalized) return false;
    if (formalized === "no" && problem.record.formalized) return false;
    if (coverage !== "all" && sourceCoverageByRoute?.get(problem.canonicalPath ?? "") !== coverage) return false;
    if (exactId && ![
      problem.problem,
      problem.record.node_id,
      problem.record.claim_id,
      problem.publicEntityId,
      problem.canonicalPath,
    ].includes(exactId)) return false;
    return true;
  }).sort((left, right) => {
    if (sort === "status") return left.record.declared_status.localeCompare(right.record.declared_status) || left.problem.localeCompare(right.problem, undefined, { numeric: true });
    if (sort === "sources") return right.record.source_count - left.record.source_count || left.problem.localeCompare(right.problem, undefined, { numeric: true });
    if (sort === "reviewed") return Number(Boolean(right.record.local_standing)) - Number(Boolean(left.record.local_standing)) || (right.record.local_assessed_at ?? "").localeCompare(left.record.local_assessed_at ?? "") || left.problem.localeCompare(right.problem, undefined, { numeric: true });
    return left.problem.localeCompare(right.problem, undefined, { numeric: true });
  });
  const pageCount = Math.max(1, Math.ceil(problems.length / PAGE_SIZE));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), pageCount) : 1;
  const visibleProblems = problems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const assessedCount = problems.filter(({ record }) => record.local_standing).length;
  const retainedQuery = { ...(query.q ? { q: query.q.slice(0, 200) } : {}), ...scopeQuery(), ...(status !== "all" ? { status } : {}), ...(standing !== "all" ? { standing } : {}), ...(source !== "all" ? { source } : {}), ...(repository !== "all" ? { repository } : {}), ...(formalized !== "all" ? { formalized } : {}), ...(coverage !== "all" ? { coverage } : {}), ...(exactId ? { exact_id: exactId } : {}), ...(sort !== "number" ? { sort } : {}) };
  const advancedActive = selectedHub !== "all" || selectedField !== "all" || selectedTopic !== "all" || standing !== "all" || source !== "all" || repository !== "all" || formalized !== "all" || coverage !== "all" || Boolean(exactId);

  return <PageShell archetype="problem">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredDataScript(collectionStructuredData) }} />
    {/* A list page's job is the list. The hero used to take most of the first
        screen for a title the breadcrumb already carries and a coverage panel
        of five numbers nobody acts on — the same pattern as the four-tile
        status rail on a Problem. The counts that do orient a reader (how many
        Problems, how many carry formal material) ride one line, and the
        distribution moves behind a disclosure for anyone who wants it. */}
    <PageHero density="compact" className="vela-route-hero">
      <div>
        <h1 className="text-display">Erdős Problems</h1>
        <p className="mt-1.5 max-w-[62ch] text-compact text-muted-foreground">{catalog.length.toLocaleString()} source-owned questions · {catalog.filter((entry) => entry.record.formalized).length.toLocaleString()} with a formal statement · searchable by statement, number, topic and source status.</p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-meta [&>a]:inline-flex [&>a]:min-h-6 [&>a]:items-center"><Link href="/contribute" className="font-semibold text-primary underline-offset-4 hover:underline">Add a contribution</Link><Link href={{ pathname: COLLECTION_PATH, query: { view: "overview" } }} className="font-semibold text-primary underline-offset-4 hover:underline">Collection details</Link></div>
      </div>
      {/* One figure, not five numbers: how much of this collection carries
          anything. A reader who meets a page of rows with nothing in the
          Result column should learn that two of 1,217 have evidence here
          before concluding the product is broken. */}
      <div className="mt-4 border-t pt-3.5">
        <CollectionCoverageBar coverage={collectionCoverage(catalog)} />
      </div>
      <Disclosure className="mt-4" summaryClassName="w-fit text-meta font-medium text-muted-foreground hover:text-foreground" summary="Full distribution">
        <div className="mt-3"><CollectionDistribution problems={catalog} compact /></div>
      </Disclosure>
    </PageHero>
    <form action={COLLECTION_PATH} className="mt-6" aria-label="Filter Erdős Problems">
      <div className="vela-object-surface grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_repeat(3,minmax(9rem,.35fr))_auto]">
        <label className="relative block"><span className="sr-only">Search Problems</span><HugeiconsIcon icon={Search01Icon} aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 pl-9" name="q" maxLength={200} defaultValue={query.q?.slice(0, 200)} placeholder="Number, Topic, or statement" /></label>
        <label><span className="sr-only">Scientific area</span><Select name="domain" defaultValue={selectedDomain} items={selectItems("All scientific areas", domains)}><SelectTrigger aria-label="Scientific area" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All scientific areas</SelectItem>{domains.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
        <label><span className="sr-only">Source status</span><Select name="status" defaultValue={status} items={selectItems("All source statuses", statuses.map((value) => [value, optionLabel(value)]))}><SelectTrigger aria-label="Source status" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All source statuses</SelectItem>{statuses.map((value) => <SelectItem key={value} value={value}>{optionLabel(value)}</SelectItem>)}</SelectContent></Select></label>
        <label><span className="sr-only">Sort Problems</span><Select name="sort" defaultValue={sort} items={{ number: "Problem number", reviewed: "Reviewed Results first", sources: "Most sources", status: "Source status" }}><SelectTrigger aria-label="Sort Problems" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="number">Problem number</SelectItem><SelectItem value="reviewed">Reviewed Results first</SelectItem><SelectItem value="sources">Most sources</SelectItem><SelectItem value="status">Source status</SelectItem></SelectContent></Select></label>
        <Button type="submit" className="h-11 sm:col-span-2 xl:col-span-1">Filter</Button>
      </div>
      <Disclosure className="mt-3" open={advancedActive} summaryClassName="text-label font-medium" summary="More filters">
        <div className="grid gap-3 pb-2 pt-2 sm:grid-cols-2 xl:grid-cols-4">
          <label><span className="sr-only">Coordination Hub</span><Select name="hub" defaultValue={selectedHub} items={selectItems("All coordination Hubs", hubs)}><SelectTrigger aria-label="Coordination Hub" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All coordination Hubs</SelectItem>{hubs.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
          {fields.length ? <label><span className="sr-only">Field</span><Select name="field" defaultValue={selectedField} items={selectItems("All Fields", fields)}><SelectTrigger aria-label="Field" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All Fields</SelectItem>{fields.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label> : null}
          <label><span className="sr-only">Source Topic</span><Select name="topic" defaultValue={selectedTopic} items={selectItems("All source Topics", topics)}><SelectTrigger aria-label="Source Topic" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All source Topics</SelectItem>{topics.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="sr-only">Observed Source occurrence</span><Select name="source" defaultValue={source} items={selectItems("Any observed Source", sources.map((value) => [value, value]))}><SelectTrigger aria-label="Observed Source occurrence" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any observed Source</SelectItem>{sources.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="sr-only">Current Repository</span><Select name="repository" defaultValue={repository} items={selectItems("Any current Repository", repositories.map((value) => [value, value]))}><SelectTrigger aria-label="Current Repository" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any current Repository</SelectItem>{repositories.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="sr-only">Formalization</span><Select name="formalized" defaultValue={formalized} items={selectItems("Any formalization state", [["yes", "Formalized"], ["no", "Not formalized"]])}><SelectTrigger aria-label="Formalization" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any formalization state</SelectItem><SelectItem value="yes">Formalized</SelectItem><SelectItem value="no">Not formalized</SelectItem></SelectContent></Select></label>
          <label><span className="sr-only">Source observation coverage</span><Select name="coverage" defaultValue={coverage} items={selectItems("Any source observation coverage", [["complete", "Complete source observation"], ["partial", "Partial source observation"], ["unobserved", "Source unobserved"]])}><SelectTrigger aria-label="Source observation coverage" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any source observation coverage</SelectItem><SelectItem value="complete">Complete source observation</SelectItem><SelectItem value="partial">Partial source observation</SelectItem><SelectItem value="unobserved">Source unobserved</SelectItem></SelectContent></Select></label>
          <label><span className="sr-only">Result decision</span><Select name="standing" defaultValue={standing} items={selectItems("Any Result decision", standings.map((value) => [value, value === "none" ? "Not reviewed here" : optionLabel(value)]))}><SelectTrigger aria-label="Result decision" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any Result decision</SelectItem>{standings.map((value) => <SelectItem key={value} value={value}>{value === "none" ? "Not reviewed here" : optionLabel(value)}</SelectItem>)}</SelectContent></Select></label>
          <label className="sm:col-span-2"><span className="sr-only">Exact Problem identifier</span><Input className="h-11" name="exact_id" maxLength={256} defaultValue={exactId} placeholder="Exact number, native ID, Claim ID, entity ID, or canonical path" /></label>
        </div>
        <p className="pb-2 text-meta text-muted-foreground">Coverage is source-observation coverage, not Problem completeness. <Link href={{ pathname: COLLECTION_PATH, query: { view: "overview" } }} className="font-medium text-foreground underline-offset-4 hover:underline">Inspect coverage</Link></p>
      </Disclosure>
      {/* Every filter that narrows, not two of them.
          *
          * The row was gated on `selectedDomain`/`selectedHub`, so eight of the
          * ten controls could narrow 1,217 Problems to a handful and never
          * reveal a way back — and the one filter that did reveal it, Scientific
          * area, has exactly two options in this release, so it cannot narrow
          * anything. A reader who arrived on a shared link had no Back to use
          * either. */}
      {narrowing.length ? <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-meta"><span className="text-muted-foreground">Active scope:</span>{narrowing.map(({ label, value }) => <Badge key={label} variant="secondary">{label} &middot; {value}</Badge>)}<Link href={COLLECTION_PATH} className="font-medium underline-offset-4 hover:underline">Clear filters</Link></div> : null}
    </form>
    {/* The count is a fact about the rows, so it sits with them in one line
        rather than under an h2 naming the page's own content. */}
    <section aria-labelledby="problem-list" className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-2">
        <h2 id="problem-list" className="sr-only">Problems</h2>
        <p className="text-meta text-muted-foreground">
          {problems.length.toLocaleString()} {problems.length === 1 ? "Problem" : "Problems"}
          {assessedCount ? <>{" · "}{assessedCount} with reviewed evidence</> : null}
        </p>
        {pageCount > 1 ? <p className="font-mono text-meta tabular-nums text-muted-foreground">{page}/{pageCount}</p> : null}
      </div>
      <ProblemRows problems={visibleProblems} statements={statements} />
      <LedgerPager page={page} pages={pageCount} label="Erdős Problem pages" hrefFor={(next) => ({ pathname: COLLECTION_PATH, query: { ...retainedQuery, page: next } }) as never} />
    </section>
  </PageShell>;
}
