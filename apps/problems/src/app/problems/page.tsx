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
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@vela/ui/components/select";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { ProblemDiscoveryFacts } from "@/components/vela/problem-facts";
import { SourceCorpusMap } from "@/components/vela/source-corpus-map";
import { ProblemSourceCoverage } from "@/components/vela/problem-source-coverage";
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
} from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Problems",
  description: "Explore published scientific Problems by collection and field, then inspect source status, Local Standing, and exact source occurrences.",
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
  page?: string;
};

const PAGE_SIZE = 48;
const optionLabel = (value: string) => value.replaceAll(/[-_]/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
const selectItems = (allLabel: string, entries: ReadonlyArray<readonly [string, string]>) => Object.fromEntries([
  ["all", allLabel],
  ...entries,
]);

function ProblemRows({ problems }: { problems: ProblemDiscovery[] }) {
  return problems.length ? <ItemGroup className="gap-1">
    {problems.map((problem) => <Item key={`${problem.repository}/${problem.problem}`} className="rounded-lg border-0 px-3 py-5 transition-colors hover:bg-background/60 sm:flex-nowrap sm:gap-5">
      {/* Four digits at most, so the gutter only needs to be wide enough to
          keep the numbers aligned. At 320 the old `w-16` plus the duplicate
          Open action left the row's content column 128px of a 288px row. */}
      <ItemMedia className="w-10 self-start pt-0.5 sm:w-20"><span className="font-mono text-title tabular-nums text-muted-foreground">{problem.problem}</span></ItemMedia>
      <ItemContent className="gap-3">
        <div className="flex flex-wrap items-center gap-2"><span className="text-eyebrow uppercase text-muted-foreground">{problem.field?.name ?? (problem.topics.map(({ name }) => name).join(" · ") || "Unclassified topic")}</span><Badge variant="secondary">{problem.collection?.name ?? "Unclassified collection"}</Badge></div>
        <ItemTitle className="line-clamp-none max-w-[76ch] text-subtitle leading-snug"><Link href={problem.canonicalPath} className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"><ScientificText text={decodeHtmlEntities(problem.record.statement || `Problem ${problem.problem}`)} /></Link></ItemTitle>
        <ItemDescription className="line-clamp-none">{problem.theme} · {problem.record.formalized ? "formalized" : "not formalized"} · {problem.record.source_count} {problem.record.source_count === 1 ? "source" : "sources"}</ItemDescription>
        <ProblemDiscoveryFacts problem={problem} className="mt-1" />
      </ItemContent>
    </Item>)}
  </ItemGroup> : <div className="py-10"><p className="text-subtitle">No Problems match this view.</p><p className="mt-2 text-meta text-muted-foreground">Choose another collection or Topic, or open the complete directory.</p></div>;
}

export default async function ProblemsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const view = query.view === "overview" ? "overview" : "all";
  const requestedCoverage = query.coverage === "complete" || query.coverage === "partial" || query.coverage === "unobserved" ? query.coverage : "all";
  const catalogPromise = discoveredProblems();
  const [catalog, activity, sourceCoverage, sourceCorpora] = await Promise.all([
    catalogPromise,
    view === "overview" ? recentScientificChanges(5) : Promise.resolve([]),
    view === "overview" ? reviewedProblemSourceCoverage(catalogPromise) : Promise.resolve(null),
    view === "overview" || requestedCoverage !== "all" ? observedSourceCorpusMap(catalogPromise) : Promise.resolve(null),
  ]);
  const allCollections = problemDiscoveryCollections(catalog);
  const domains = [...new Map(catalog.flatMap(({ domain }) => domain ? [[domain.key, domain.name] as const] : [])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const selectedDomain = query.domain && domains.some(([key]) => key === query.domain) ? query.domain : "all";
  const domainCatalog = selectedDomain === "all" ? catalog : catalog.filter(({ domain }) => domain?.key === selectedDomain);
  const hubs = [...new Map(domainCatalog.flatMap((problem) => problem.hubs.map((hub) => [hub.key, hub.name] as const))).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const selectedHub = query.hub && hubs.some(([key]) => key === query.hub) ? query.hub : "all";
  const profiledCatalog = selectedHub === "all" ? domainCatalog : domainCatalog.filter((problem) => problem.hubs.some(({ key }) => key === selectedHub));
  const collections = problemDiscoveryCollections(profiledCatalog);
  const selectedCollection = query.collection && collections.some(({ key }) => key === query.collection)
    ? query.collection
    : "all";
  const collectionCatalog = selectedCollection === "all" ? profiledCatalog : profiledCatalog.filter(({ collection }) => (collection?.key ?? "unclassified") === selectedCollection);
  const fields = [...new Map(collectionCatalog.flatMap((problem) => problem.field ? [[problem.field.key, problem.field.name] as const] : [])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const selectedField = query.field && fields.some(([key]) => key === query.field) ? query.field : "all";
  const fieldCatalog = selectedField === "all" ? collectionCatalog : collectionCatalog.filter((problem) => problem.field?.key === selectedField);
  const topics = [...new Map(fieldCatalog.flatMap((problem) => problem.topics.map(({ key, name }) => [key, name] as const))).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const selectedTopic = query.topic && topics.some(([key]) => key === query.topic) ? query.topic : "all";
  const scopedCatalog = selectedTopic === "all" ? fieldCatalog : fieldCatalog.filter((problem) => problem.topics.some(({ key }) => key === selectedTopic));
  const scopeQuery = (overrides: Partial<{ domain: string; hub: string; collection: string; field: string; topic: string }> = {}) => problemDiscoveryScopeQuery({
    domain: selectedDomain,
    hub: selectedHub,
    collection: selectedCollection,
    field: selectedField,
    topic: selectedTopic,
    ...overrides,
  });

  const corpusLabel = allCollections.length === 1
    ? `1 published collection · ${allCollections[0]!.name} currently`
    : `${allCollections.length} published collections`;

  if (view === "overview") {
    const stateProblems = scopedCatalog.filter(({ record }) => record.local_standing)
      .sort((left, right) => right.record.source_count - left.record.source_count || left.problem.localeCompare(right.problem, undefined, { numeric: true }));
    const activeCollections = selectedCollection === "all" ? collections : collections.filter(({ key }) => key === selectedCollection);
    const topicRows = activeCollections.flatMap((collection) => collection.topics.map((topic) => ({ collection, topic })))
      .filter(({ topic }) => selectedTopic === "all" || topic.key === selectedTopic)
      .sort((left, right) => right.topic.problemCount - left.topic.problemCount || left.topic.name.localeCompare(right.topic.name));

    return <PageShell archetype="problem">
      <PageHero className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.42fr)] lg:items-end">
        <div><p className="text-eyebrow uppercase text-muted-foreground">{corpusLabel}</p><h1 className="mt-3 text-display">Problems</h1><p className="typeset typeset-compact mt-4 max-w-2xl text-muted-foreground">Enter through an explicit scientific area, coordination Hub, published collection, or source-native Topic. A Field appears only when a source owns that taxonomy. Then inspect Source status, exact occurrences, and Repository-local Standing separately.</p><div className="mt-6 flex flex-wrap gap-3"><Button nativeButton={false} render={<Link href={{ pathname: "/problems", query: { view: "all", ...scopeQuery() } }} />}>Open full directory <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button><Button nativeButton={false} variant="outline" render={<Link href="/work" />}>Start source-owned work</Button></div></div>
        <div className="vela-evidence-surface rounded-xl px-5 py-5"><p className="text-eyebrow uppercase text-muted-foreground">Published scope</p><p className="mt-2 text-title">{catalog.length.toLocaleString()} source-native Problems</p><p className="mt-2 text-meta text-muted-foreground">Across {allCollections.length} {allCollections.length === 1 ? "collection" : "collections"} and {new Set(catalog.flatMap(({ topics }) => topics.map(({ key }) => key))).size} source Topics.</p><div className="mt-4 flex flex-wrap gap-2">{domains.map(([key, name]) => <Link key={key} href={{ pathname: "/problems", query: { domain: key } }} className="rounded-full bg-background/70 px-3 py-1.5 text-meta font-medium hover:bg-background">Area · {name}</Link>)}{hubs.map(([key, name]) => <Link key={key} href={{ pathname: "/problems", query: { ...problemDiscoveryScopeQuery({ domain: selectedDomain }), hub: key } }} className="rounded-full bg-background/70 px-3 py-1.5 text-meta font-medium hover:bg-background">Hub · {name}</Link>)}</div></div>
      </PageHero>

      <PageSection aria-labelledby="browse-problems">
        <PageSectionHeader><div><p className="text-eyebrow uppercase text-muted-foreground">Projection-backed discovery</p><h2 id="browse-problems" className="mt-1 text-title">Published collections and Topics</h2></div><Link href={{ pathname: "/hubs", query: problemDiscoveryScopeQuery({ domain: selectedDomain, hub: selectedHub }) }} className="text-meta font-medium underline-offset-4 hover:underline">How Hubs coordinate</Link></PageSectionHeader>
        <div className="mt-6 overflow-hidden rounded-xl bg-muted/35 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
          <nav aria-label="Published collections" className="p-3 lg:bg-background/35">
            <p className="px-3 pb-2 text-eyebrow uppercase text-muted-foreground">Collections</p>
            <Link href={{ pathname: "/problems", query: scopeQuery({ collection: "all", field: "all", topic: "all" }) }} aria-current={selectedCollection === "all" ? "page" : undefined} className="flex items-center justify-between rounded-lg px-3 py-3 text-label hover:bg-background/60 aria-[current=page]:bg-background aria-[current=page]:shadow-sm"><span>All published</span><span className="font-mono text-meta text-muted-foreground">{profiledCatalog.length}</span></Link>
            {collections.map((collection) => <Link key={collection.key} href={{ pathname: "/problems", query: scopeQuery({ collection: collection.key, field: "all", topic: "all" }) }} aria-current={selectedCollection === collection.key ? "page" : undefined} className="mt-1 flex items-center justify-between rounded-lg px-3 py-3 text-label hover:bg-background/60 aria-[current=page]:bg-background aria-[current=page]:shadow-sm"><span>{collection.name}</span><span className="font-mono text-meta text-muted-foreground">{collection.problemCount}</span></Link>)}
          </nav>
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-eyebrow uppercase text-muted-foreground">Browse by Topic</p><h3 className="mt-1 text-subtitle">{selectedCollection === "all" ? "All current source Topics" : activeCollections[0]?.name}</h3>{fields.length === 0 ? <p className="mt-2 text-meta text-muted-foreground">This source declares a flat Topic vocabulary and no Field taxonomy.</p> : null}</div>{selectedTopic !== "all" ? <Button nativeButton={false} size="sm" variant="ghost" render={<Link href={{ pathname: "/problems", query: scopeQuery({ topic: "all" }) }} />}>Clear Topic</Button> : null}</div>
            <div className="mt-5 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
              {topicRows.slice(0, 18).map(({ collection, topic }, index) => <Link key={`${collection.key}/${topic.key}`} href={{ pathname: "/problems", query: scopeQuery({ collection: collection.key, topic: topic.key }) }} className="group flex items-start gap-3 rounded-lg px-2 py-4 hover:bg-background/60"><span className="font-mono text-meta text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block text-label group-hover:underline">{topic.name}</span><span className="mt-1 block text-meta text-muted-foreground">{topic.problemCount} Problems · {topic.localStanding} with local State</span></span><HugeiconsIcon icon={ArrowRight} aria-hidden className="ml-auto mt-0.5 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" /></Link>)}
            </div>
          </div>
        </div>
      </PageSection>

      {sourceCorpora ? <PageSection><SourceCorpusMap corpus={sourceCorpora} /></PageSection> : null}

      {sourceCoverage ? <PageSection><ProblemSourceCoverage coverage={sourceCoverage} /></PageSection> : null}

      <PageSection className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
        <section className="vela-direction-surface rounded-xl px-5 py-6 sm:px-7" aria-labelledby="source-owned-contribution"><p className="text-eyebrow uppercase text-muted-foreground">Bounded next steps</p><h2 id="source-owned-contribution" className="mt-2 text-title">Contributions stay with their native source</h2><p className="mt-4 max-w-[65ch] text-body text-muted-foreground">Choose a Problem, use its source repository or local workbench, and prepare an exact bounded Submission. The site publishes no central scientific priority queue.</p><Button className="mt-5" nativeButton={false} variant="outline" render={<Link href="/work" />}>Open repository handoffs</Button></section>
        <section className="vela-evidence-surface rounded-xl px-5 py-6 sm:px-7" aria-labelledby="local-state"><div className="flex items-center gap-2"><HugeiconsIcon icon={Compass01Icon} aria-hidden className="size-5 text-[var(--status-evidence)]" /><p className="text-eyebrow uppercase text-muted-foreground">Evidence-supported orientation</p></div><h2 id="local-state" className="mt-2 text-title">Current local State</h2>{stateProblems.length ? <ProblemRows problems={stateProblems.slice(0, 3)} /> : <div className="py-8"><p className="text-subtitle">No local Standing in this scope.</p><p className="mt-2 text-meta text-muted-foreground">Source records remain discoverable without pretending they were assessed here.</p></div>}</section>
      </PageSection>

      <PageSection className="vela-history-surface rounded-xl px-5 py-6 sm:px-7" aria-labelledby="state-history"><div className="flex items-end justify-between gap-4"><div><div className="flex items-center gap-2"><HugeiconsIcon icon={Activity01Icon} aria-hidden className="size-5" /><p className="text-eyebrow uppercase text-muted-foreground">Retained changes</p></div><h2 id="state-history" className="mt-2 text-title">Latest State history</h2></div><Link href="/activity" className="text-meta font-medium underline-offset-4 hover:underline">Full history</Link></div><ScientificChangeFeed changes={activity} compact /></PageSection>
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
    if (coverage !== "all" && sourceCoverageByRoute?.get(problem.canonicalPath) !== coverage) return false;
    if (exactId && ![
      problem.problem,
      problem.record.node_id,
      problem.record.claim_id,
      problem.publicEntityId,
      problem.canonicalPath,
    ].includes(exactId)) return false;
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(problems.length / PAGE_SIZE));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), pageCount) : 1;
  const visibleProblems = problems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const retainedQuery = { ...(query.q ? { q: query.q.slice(0, 200) } : {}), ...scopeQuery(), ...(status !== "all" ? { status } : {}), ...(standing !== "all" ? { standing } : {}), ...(source !== "all" ? { source } : {}), ...(repository !== "all" ? { repository } : {}), ...(formalized !== "all" ? { formalized } : {}), ...(coverage !== "all" ? { coverage } : {}), ...(exactId ? { exact_id: exactId } : {}) };
  const advancedActive = selectedHub !== "all" || selectedCollection !== "all" || selectedField !== "all" || selectedTopic !== "all" || standing !== "all" || source !== "all" || repository !== "all" || formalized !== "all" || coverage !== "all" || Boolean(exactId);

  return <PageShell archetype="problem">
    <PageHero density="compact" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"><div><p className="text-eyebrow uppercase text-muted-foreground">Problem directory</p><h1 className="mt-3 text-display">Problems</h1><p className="mt-3 max-w-2xl text-body text-muted-foreground">Search the question first. Filter by area, source status, or Repository-local Standing when you need to narrow the map.</p></div><Button nativeButton={false} variant="outline" className="h-11 md:h-8" render={<Link href={{ pathname: "/problems", query: { view: "overview" } }} />}>Source coverage</Button></PageHero>
    <form action="/problems" className="mt-8 rounded-xl bg-muted/40 p-4" aria-label="Filter Problems">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_repeat(2,minmax(10rem,.4fr))_auto]">
        <label className="relative block"><span className="sr-only">Search Problems</span><HugeiconsIcon icon={Search01Icon} aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 pl-9" name="q" maxLength={200} defaultValue={query.q?.slice(0, 200)} placeholder="Number, Topic, or statement" /></label>
        <label><span className="sr-only">Scientific area</span><Select name="domain" defaultValue={selectedDomain} items={selectItems("All scientific areas", domains)}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All scientific areas</SelectItem>{domains.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
        <label><span className="sr-only">Source status</span><Select name="status" defaultValue={status} items={selectItems("All source statuses", statuses.map((value) => [value, optionLabel(value)]))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All source statuses</SelectItem>{statuses.map((value) => <SelectItem key={value} value={value}>{optionLabel(value)}</SelectItem>)}</SelectContent></Select></label>
        <Button type="submit" className="h-11 sm:col-span-2 xl:col-span-1">Filter</Button>
      </div>
      <details className="group mt-3 border-t border-border/70 pt-2" open={advancedActive}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-label font-medium marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2"><span aria-hidden className="transition-transform group-open:rotate-90">›</span>Advanced source, taxonomy, and exact State</summary>
        <div className="grid gap-3 pb-2 pt-2 sm:grid-cols-2 xl:grid-cols-4">
          <label><span className="sr-only">Coordination Hub</span><Select name="hub" defaultValue={selectedHub} items={selectItems("All coordination Hubs", hubs)}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All coordination Hubs</SelectItem>{hubs.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="sr-only">Published collection</span><Select name="collection" defaultValue={selectedCollection} items={selectItems("All collections", collections.map((value) => [value.key, value.name]))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All collections</SelectItem>{collections.map((value) => <SelectItem key={value.key} value={value.key}>{value.name}</SelectItem>)}</SelectContent></Select></label>
          {fields.length ? <label><span className="sr-only">Field</span><Select name="field" defaultValue={selectedField} items={selectItems("All Fields", fields)}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All Fields</SelectItem>{fields.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label> : null}
          <label><span className="sr-only">Source Topic</span><Select name="topic" defaultValue={selectedTopic} items={selectItems("All source Topics", topics)}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">All source Topics</SelectItem>{topics.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="sr-only">Observed Source occurrence</span><Select name="source" defaultValue={source} items={selectItems("Any observed Source", sources.map((value) => [value, value]))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any observed Source</SelectItem>{sources.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="sr-only">Current Repository</span><Select name="repository" defaultValue={repository} items={selectItems("Any current Repository", repositories.map((value) => [value, value]))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any current Repository</SelectItem>{repositories.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="sr-only">Formalization</span><Select name="formalized" defaultValue={formalized} items={selectItems("Any formalization state", [["yes", "Formalized"], ["no", "Not formalized"]])}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any formalization state</SelectItem><SelectItem value="yes">Formalized</SelectItem><SelectItem value="no">Not formalized</SelectItem></SelectContent></Select></label>
          <label><span className="sr-only">Source observation coverage</span><Select name="coverage" defaultValue={coverage} items={selectItems("Any source observation coverage", [["complete", "Complete source observation"], ["partial", "Partial source observation"], ["unobserved", "Source unobserved"]])}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any source observation coverage</SelectItem><SelectItem value="complete">Complete source observation</SelectItem><SelectItem value="partial">Partial source observation</SelectItem><SelectItem value="unobserved">Source unobserved</SelectItem></SelectContent></Select></label>
          <label><span className="sr-only">Local Standing</span><Select name="standing" defaultValue={standing} items={selectItems("Any local Standing", standings.map((value) => [value, value === "none" ? "Not assessed locally" : optionLabel(value)]))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent align="start"><SelectItem value="all">Any local Standing</SelectItem>{standings.map((value) => <SelectItem key={value} value={value}>{value === "none" ? "Not assessed locally" : optionLabel(value)}</SelectItem>)}</SelectContent></Select></label>
          <label className="sm:col-span-2"><span className="sr-only">Exact Problem identifier</span><Input className="h-11" name="exact_id" maxLength={256} defaultValue={exactId} placeholder="Exact number, native ID, Claim ID, entity ID, or canonical path" /></label>
        </div>
        <p className="pb-2 text-meta text-muted-foreground">Coverage is source-observation coverage, not Problem completeness. <Link href={{ pathname: "/problems", query: { view: "overview" } }} className="font-medium text-foreground underline-offset-4 hover:underline">Inspect coverage</Link></p>
      </details>
      {(selectedDomain !== "all" || selectedHub !== "all") ? <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3 text-meta"><span className="text-muted-foreground">Active scope:</span>{selectedDomain !== "all" ? <Badge variant="secondary">Area · {domains.find(([key]) => key === selectedDomain)?.[1]}</Badge> : null}{selectedHub !== "all" ? <Badge variant="secondary">Hub · {hubs.find(([key]) => key === selectedHub)?.[1]}</Badge> : null}<Link href="/problems" className="font-medium underline-offset-4 hover:underline">Clear filters</Link></div> : null}
    </form>
    <PageSection aria-labelledby="problem-list"><PageSectionHeader><h2 id="problem-list" className="text-subtitle">Current directory</h2><p className="text-meta text-muted-foreground">{problems.length} matching exact source records · showing at most {PAGE_SIZE}</p></PageSectionHeader><ProblemRows problems={visibleProblems} />{pageCount > 1 ? <nav aria-label="Problem pages" className="mt-6 flex items-center justify-between gap-4 rounded-lg bg-muted/30 px-4 py-3"><p className="text-meta text-muted-foreground">Page {page} of {pageCount} · {problems.length} matching Problems</p><div className="flex gap-2">{page > 1 ? <Button nativeButton={false} size="sm" variant="outline" render={<Link href={{ pathname: "/problems", query: { ...retainedQuery, page: page - 1 } }} />}>Previous</Button> : null}{page < pageCount ? <Button nativeButton={false} size="sm" variant="outline" render={<Link href={{ pathname: "/problems", query: { ...retainedQuery, page: page + 1 } }} />}>Next</Button> : null}</div></nav> : null}</PageSection>
  </PageShell>;
}
