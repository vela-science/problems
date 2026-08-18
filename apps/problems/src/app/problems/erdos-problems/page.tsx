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
import { Input } from "@vela/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@vela/ui/components/select";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { StatementText } from "@/components/vela/statement-text";
import { paragraphsOf } from "@/lib/problem-statement";
import { CollectionDistribution } from "@/components/vela/collection-distribution";
import { SourceCorpusMap } from "@/components/vela/source-corpus-map";
import { ProblemSourceCoverage } from "@/components/vela/problem-source-coverage";
import { LedgerPager } from "@/components/vela/ledger-pager";
import { ScientificChangeFeed } from "@/components/vela/scientific-change-feed";
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
 * badge (one collection is published, so it printed on all 1,217 rows), the
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
    return <p className="py-10 text-body text-muted-foreground">No Problems match this view.</p>;
  }
  return <div className="vela-object-surface mt-3 overflow-hidden">
    <div className="hidden grid-cols-[3.5rem_minmax(0,1fr)_7rem_7rem_8rem_1.5rem] gap-x-3 border-b bg-muted/30 px-3 py-2 text-micro font-medium text-muted-foreground sm:grid">
      <span>Number</span><span>Question</span><span>Source status</span><span>Formal</span><span>Repository Result</span><span className="sr-only">Open</span>
    </div>
    <ul>
    {problems.map((problem) => {
      const record = problem.record;
      const kind = record.statement_kind;
      const readableLabel = record.label?.trim() || (kind === "formal" ? `Problem ${problem.problem}` : record.statement) || `Problem ${problem.problem}`;
      const key = problemStatementKey(problem);
      const written = key ? statements[key] : undefined;
      const question = written ? paragraphsOf(written.text)[0] ?? "" : "";
      const rowName = question || readableLabel;
      return <li key={`${problem.repository}/${problem.problem}`} className="border-t first:border-t-0">
        <Link aria-label={rowName} href={problem.canonicalPath ?? "/problems"} className="vela-object-row group grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_1.5rem] gap-x-3 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:grid-cols-[3.5rem_minmax(0,1fr)_7rem_7rem_8rem_1.5rem] sm:items-center">
          <span className="font-mono text-meta tabular-nums text-muted-foreground">#{problem.problem}</span>
          <span className="min-w-0">
            <span className="block max-w-[74ch] text-label leading-snug group-hover:text-primary">
            {question
              ? <span className="block text-label"><ScientificText text={question} /></span>
              : <StatementText statement={kind === "formal" ? readableLabel : record.statement || readableLabel} kind={kind === "formal" ? "label" : kind} className="text-label" />}
            </span>
            <span className="mt-1.5 flex flex-wrap gap-x-2 text-meta text-muted-foreground sm:hidden">
              <span className="capitalize">{record.declared_status}</span><span>{record.formalized ? "Formalized" : "No formal declaration"}</span>{record.local_standing ? <span>Result {record.local_standing.replaceAll("_", " ")}</span> : null}
            </span>
          </span>
          <span className="hidden items-center gap-1.5 text-meta capitalize sm:flex"><span aria-hidden className={`size-1.5 rounded-full ${["solved", "proved", "disproved"].includes(record.declared_status) ? "bg-status-progress" : "bg-status-caution"}`} />{record.declared_status}</span>
          <span className="hidden text-meta text-muted-foreground sm:block">{record.formalized ? "Available" : "—"}</span>
          <span className="hidden text-meta text-muted-foreground sm:block">{record.local_standing ? record.local_standing.replaceAll("_", " ") : "Not reviewed"}</span>
          <HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      </li>;
    })}
    </ul>
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

  const corpusLabel = `${catalog.length.toLocaleString()} source-owned Problems · 1 published collection`;
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionStructuredData) }} />
      <PageHero className="vela-collection-hero grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.42fr)] lg:items-end">
        <div><p className="text-eyebrow uppercase text-muted-foreground">{corpusLabel}</p><h1 className="mt-3 text-display">Erdős Problems</h1><p className="typeset typeset-compact mt-4 max-w-2xl text-muted-foreground">Browse this source-owned collection by topic, then inspect each question, its evidence, prior work, and current Repository state.</p><div className="mt-6 flex flex-wrap gap-3"><Button nativeButton={false} render={<Link href={{ pathname: COLLECTION_PATH, query: { view: "all", ...scopeQuery() } }} />}>Open collection directory <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button><Button nativeButton={false} variant="outline" render={<Link href="/contribute" />}>Add a contribution</Button></div></div>
        <div className="vela-evidence-surface rounded-xl px-5 py-5"><p className="text-eyebrow uppercase text-muted-foreground">Collection scope</p><p className="mt-2 text-title">{catalog.length.toLocaleString()} Erdős problems</p><p className="mt-2 text-meta text-muted-foreground">One explicit Problem collection with {new Set(catalog.flatMap(({ topics }) => topics.map(({ key }) => key))).size} source-owned Topics. Other sources appear as evidence, not as additional Problem collections.</p><div className="mt-4 flex flex-wrap gap-2">{domains.map(([key, name]) => <Link key={key} href={{ pathname: COLLECTION_PATH, query: { domain: key } }} className="rounded-full bg-background/70 px-3 py-1.5 text-meta font-medium hover:bg-background">Area · {name}</Link>)}</div></div>
      </PageHero>

      <PageSection aria-labelledby="browse-problems">
        <PageSectionHeader><div><p className="text-eyebrow uppercase text-muted-foreground">Explore the collection</p><h2 id="browse-problems" className="mt-1 text-title">Topics and related sources</h2></div><Link href={{ pathname: "/hubs", query: problemDiscoveryScopeQuery({ domain: selectedDomain, hub: selectedHub }) }} className="text-meta font-medium underline-offset-4 hover:underline">Explore related research</Link></PageSectionHeader>
        <div className="mt-6 overflow-hidden rounded-xl bg-muted/35 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
          <nav aria-label="Published collections" className="p-3 lg:bg-background/35">
            <p className="px-3 pb-2 text-eyebrow uppercase text-muted-foreground">Collections</p>
            <Link href={{ pathname: COLLECTION_PATH, query: scopeQuery({ field: "all", topic: "all" }) }} aria-current="page" className="flex items-center justify-between rounded-lg px-3 py-3 text-label hover:bg-background/60 aria-[current=page]:bg-background aria-[current=page]:shadow-sm"><span>All Erdős problems</span><span className="font-mono text-meta text-muted-foreground">{profiledCatalog.length}</span></Link>
          </nav>
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-eyebrow uppercase text-muted-foreground">Browse by Topic</p><h3 className="mt-1 text-subtitle">All current source Topics</h3>{fields.length === 0 ? <p className="mt-2 text-meta text-muted-foreground">This collection declares a flat Topic vocabulary and no Field taxonomy.</p> : null}</div>{selectedTopic !== "all" ? <Button nativeButton={false} size="sm" variant="ghost" render={<Link href={{ pathname: COLLECTION_PATH, query: scopeQuery({ topic: "all" }) }} />}>Clear Topic</Button> : null}</div>
            <div className="mt-5 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
              {topicRows.slice(0, 18).map(({ collection, topic }, index) => <Link key={`${collection.key}/${topic.key}`} href={{ pathname: COLLECTION_PATH, query: scopeQuery({ topic: topic.key }) }} className="group flex items-start gap-3 rounded-lg px-2 py-4 hover:bg-background/60"><span className="font-mono text-meta text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block text-label group-hover:underline">{topic.name}</span><span className="mt-1 block text-meta text-muted-foreground">{topic.problemCount} Problems · {topic.localStanding} with local State</span></span><HugeiconsIcon icon={ArrowRight} aria-hidden className="ml-auto mt-0.5 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" /></Link>)}
            </div>
          </div>
        </div>
      </PageSection>

      {sourceCorpora ? <PageSection><SourceCorpusMap corpus={sourceCorpora} /></PageSection> : null}

      {sourceCoverage ? <PageSection><ProblemSourceCoverage coverage={sourceCoverage} /></PageSection> : null}

      <PageSection className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
        <section className="vela-direction-surface rounded-xl px-5 py-6 sm:px-7" aria-labelledby="source-owned-contribution"><p className="text-eyebrow uppercase text-muted-foreground">Choose what to do next</p><h2 id="source-owned-contribution" className="mt-2 text-title">Contributions stay with their source</h2><p className="mt-4 max-w-[65ch] text-body text-muted-foreground">Choose a Problem, review its source repository, and continue in your preferred local tool when you need to run code or edit files. The site publishes no central scientific priority queue.</p><Button className="mt-5" nativeButton={false} variant="outline" render={<Link href="/contribute" />}>Add a contribution</Button></section>
        <section className="vela-evidence-surface rounded-xl px-5 py-6 sm:px-7" aria-labelledby="reviewed-evidence"><div className="flex items-center gap-2"><HugeiconsIcon icon={Compass01Icon} aria-hidden className="size-5 text-[var(--status-evidence)]" /><p className="text-eyebrow uppercase text-muted-foreground">Reviewed evidence</p></div><h2 id="reviewed-evidence" className="mt-2 text-title">Problems with reviewed Results</h2>{stateProblems.length ? <ProblemRows problems={stateProblems.slice(0, 3)} statements={statements} /> : <div className="py-8"><p className="text-subtitle">No reviewed Result in this scope.</p><p className="mt-2 text-meta text-muted-foreground">Source questions remain discoverable without implying that they were reviewed here.</p></div>}</section>
      </PageSection>

      <PageSection className="vela-history-surface rounded-xl px-5 py-6 sm:px-7" aria-labelledby="state-history"><div className="flex items-end justify-between gap-4"><div><div className="flex items-center gap-2"><HugeiconsIcon icon={Activity01Icon} aria-hidden className="size-5" /><p className="text-eyebrow uppercase text-muted-foreground">Recent changes</p></div><h2 id="state-history" className="mt-2 text-title">Latest scientific history</h2></div><Link href="/activity" className="text-meta font-medium underline-offset-4 hover:underline">Full history</Link></div><ScientificChangeFeed changes={activity} compact /></PageSection>
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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionStructuredData) }} />
    <PageHero density="compact" className="vela-collection-hero grid gap-7 lg:grid-cols-[minmax(18rem,.7fr)_minmax(28rem,1.3fr)] lg:items-center lg:gap-12">
      <div>
        <p className="text-label font-medium text-muted-foreground">Published collection</p>
        <h1 className="mt-1.5 text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.025em]">Erdős Problems</h1>
        <p className="mt-2 max-w-[52ch] text-compact text-muted-foreground">{catalog.length.toLocaleString()} source-owned questions, searchable by statement, number, topic, and source status.</p>
        <div className="mt-4 flex flex-wrap gap-4 text-meta"><Link href="/contribute" className="font-semibold text-primary underline-offset-4 hover:underline">Add a contribution</Link><Link href={{ pathname: COLLECTION_PATH, query: { view: "overview" } }} className="font-semibold text-primary underline-offset-4 hover:underline">Collection details</Link></div>
      </div>
      <CollectionDistribution problems={catalog} compact />
    </PageHero>
    <form action={COLLECTION_PATH} className="mt-6" aria-label="Filter Erdős Problems">
      <div className="vela-object-surface grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_repeat(3,minmax(9rem,.35fr))_auto]">
        <label className="relative block"><span className="sr-only">Search Problems</span><HugeiconsIcon icon={Search01Icon} aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 pl-9" name="q" maxLength={200} defaultValue={query.q?.slice(0, 200)} placeholder="Number, Topic, or statement" /></label>
        <label><span className="sr-only">Scientific area</span><Select name="domain" defaultValue={selectedDomain} items={selectItems("All scientific areas", domains)}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All scientific areas</SelectItem>{domains.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
        <label><span className="sr-only">Source status</span><Select name="status" defaultValue={status} items={selectItems("All source statuses", statuses.map((value) => [value, optionLabel(value)]))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All source statuses</SelectItem>{statuses.map((value) => <SelectItem key={value} value={value}>{optionLabel(value)}</SelectItem>)}</SelectContent></Select></label>
        <label><span className="sr-only">Sort Problems</span><Select name="sort" defaultValue={sort} items={{ number: "Problem number", reviewed: "Reviewed Results first", sources: "Most sources", status: "Source status" }}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="number">Problem number</SelectItem><SelectItem value="reviewed">Reviewed Results first</SelectItem><SelectItem value="sources">Most sources</SelectItem><SelectItem value="status">Source status</SelectItem></SelectContent></Select></label>
        <Button type="submit" className="h-11 sm:col-span-2 xl:col-span-1">Filter</Button>
      </div>
      <details className="group mt-3" open={advancedActive}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-label font-medium marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2"><span aria-hidden className="transition-transform group-open:rotate-90">›</span>More filters</summary>
        <div className="grid gap-3 pb-2 pt-2 sm:grid-cols-2 xl:grid-cols-4">
          <label><span className="sr-only">Coordination Hub</span><Select name="hub" defaultValue={selectedHub} items={selectItems("All coordination Hubs", hubs)}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All coordination Hubs</SelectItem>{hubs.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
          {fields.length ? <label><span className="sr-only">Field</span><Select name="field" defaultValue={selectedField} items={selectItems("All Fields", fields)}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All Fields</SelectItem>{fields.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label> : null}
          <label><span className="sr-only">Source Topic</span><Select name="topic" defaultValue={selectedTopic} items={selectItems("All source Topics", topics)}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All source Topics</SelectItem>{topics.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="sr-only">Observed Source occurrence</span><Select name="source" defaultValue={source} items={selectItems("Any observed Source", sources.map((value) => [value, value]))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any observed Source</SelectItem>{sources.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="sr-only">Current Repository</span><Select name="repository" defaultValue={repository} items={selectItems("Any current Repository", repositories.map((value) => [value, value]))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any current Repository</SelectItem>{repositories.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="sr-only">Formalization</span><Select name="formalized" defaultValue={formalized} items={selectItems("Any formalization state", [["yes", "Formalized"], ["no", "Not formalized"]])}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any formalization state</SelectItem><SelectItem value="yes">Formalized</SelectItem><SelectItem value="no">Not formalized</SelectItem></SelectContent></Select></label>
          <label><span className="sr-only">Source observation coverage</span><Select name="coverage" defaultValue={coverage} items={selectItems("Any source observation coverage", [["complete", "Complete source observation"], ["partial", "Partial source observation"], ["unobserved", "Source unobserved"]])}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any source observation coverage</SelectItem><SelectItem value="complete">Complete source observation</SelectItem><SelectItem value="partial">Partial source observation</SelectItem><SelectItem value="unobserved">Source unobserved</SelectItem></SelectContent></Select></label>
          <label><span className="sr-only">Result decision</span><Select name="standing" defaultValue={standing} items={selectItems("Any Result decision", standings.map((value) => [value, value === "none" ? "Not reviewed here" : optionLabel(value)]))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any Result decision</SelectItem>{standings.map((value) => <SelectItem key={value} value={value}>{value === "none" ? "Not reviewed here" : optionLabel(value)}</SelectItem>)}</SelectContent></Select></label>
          <label className="sm:col-span-2"><span className="sr-only">Exact Problem identifier</span><Input className="h-11" name="exact_id" maxLength={256} defaultValue={exactId} placeholder="Exact number, native ID, Claim ID, entity ID, or canonical path" /></label>
        </div>
        <p className="pb-2 text-meta text-muted-foreground">Coverage is source-observation coverage, not Problem completeness. <Link href={{ pathname: COLLECTION_PATH, query: { view: "overview" } }} className="font-medium text-foreground underline-offset-4 hover:underline">Inspect coverage</Link></p>
      </details>
      {(selectedDomain !== "all" || selectedHub !== "all") ? <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3 text-meta"><span className="text-muted-foreground">Active scope:</span>{selectedDomain !== "all" ? <Badge variant="secondary">Area · {domains.find(([key]) => key === selectedDomain)?.[1]}</Badge> : null}{selectedHub !== "all" ? <Badge variant="secondary">Hub · {hubs.find(([key]) => key === selectedHub)?.[1]}</Badge> : null}<Link href={COLLECTION_PATH} className="font-medium underline-offset-4 hover:underline">Clear filters</Link></div> : null}
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
