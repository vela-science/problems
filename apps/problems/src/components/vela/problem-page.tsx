import Link from "next/link";
import { notFound } from "next/navigation";
import { projectionRefusal } from "@vela/projection-data/refusal";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { PageHero, PageShell } from "@vela/ui/vela/page-shell";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { LinkTabs } from "@/components/vela/link-tabs";
import { ProblemState, type ProblemResearchView } from "@/components/vela/problem-state";
import { ProblemAnswerStrip } from "@/components/vela/problem-summary";
import { ProblemWorkspace } from "@/components/vela/problem-workspace";
import { authConfiguration, currentAccount } from "@/lib/auth";
import { scientificProblemState } from "@/lib/scientific-state";

export type ProblemPageQuery = { view?: string; research?: string; file?: string; symbol?: string; mode?: string; workspace?: string; object?: string; inspector?: string; workError?: string };
export type ExpectedProblemSource = {
  sourceId: string;
  nativeId: string;
  nativeKind: string;
  contentRoot: string;
};

export type ProblemView = ProblemResearchView | "workspace";

/* One Problem, four familiar tools. Older links map deterministically to the
 * closest current tool without rendering a duplicate legacy page. */
function resolveView(query: ProblemPageQuery): ProblemView {
  if (["workspace", "work"].includes(query.view ?? "") || query.mode === "work") return "workspace";
  if (query.view === "map") return "contributions";
  if (["contributions", "files", "timeline"].includes(query.view ?? "")) return query.view as ProblemResearchView;
  if (query.view === "evidence") return "contributions";
  if (query.view === "history" || query.view === "record") return "timeline";
  if (query.view === "sources") return "files";
  if (query.research === "map") return "contributions";
  if (["contributions", "files", "timeline"].includes(query.research ?? "")) return query.research as ProblemResearchView;
  return "contributions";
}

export async function ProblemPageView({ repository, problem, collectionName, route, query, expectedSource }: {
  repository: string;
  problem: string;
  collectionName: string;
  route: string;
  query: ProblemPageQuery;
  expectedSource?: ExpectedProblemSource;
}) {
  let state;
  try {
    state = await scientificProblemState(repository, problem);
  } catch (error) {
    /* An unsupported local projection is expected configuration drift. Render
       it as a useful server result so Next's development overlay does not hide
       the repair instruction behind a stack trace. Other failures still reach
       the scoped Problems error boundary. */
    if (projectionRefusal(error) !== "foreign_manifest") throw error;
    return <PageShell as="article" archetype="problem" layout="reading">
      <PageHero density="compact">
        <h1 className="text-display">Projection configuration needs attention</h1>
      </PageHero>
      <Alert variant="destructive" className="mt-8 max-w-3xl">
        <AlertTitle>This build cannot read the configured scientific projection.</AlertTitle>
        <AlertDescription>
          The database contains a different Vela release than this source tree supports. Point
          <code className="mx-1 font-mono text-[0.92em]">VELA_PROJECTION_DATABASE_URL</code>
          at the exact current SELECT-only projection, then restart the local app. The reader will
          not reinterpret an older release.
        </AlertDescription>
      </Alert>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href="/problems" />}>Open Problems</Button>
        <Button nativeButton={false} variant="outline" render={<Link href="/about#scientific-state" />}>Why reads fail closed</Button>
      </div>
    </PageShell>;
  }
  if (!state) notFound();
  if (expectedSource && (
    state.problem.source_id !== expectedSource.sourceId
    || state.problem.node_id !== expectedSource.nativeId
    || state.problem.native_kind !== expectedSource.nativeKind
    || state.source.content_root !== expectedSource.contentRoot
  )) notFound();
  const view = resolveView(query);
  /* The three read-only tools never read the session — that is what keeps them
     cheap, cacheable, and honest about being the public record. Only the
     Workspace tab is account-aware. */
  const account = view === "workspace" ? await currentAccount() : null;
  /* A deployment without the four WorkOS variables serves `/sign-in` as a 503.
     The Workspace needs to know that, because otherwise the only control it
     offers is one that cannot work. */
  const accountsEnabled = authConfiguration().enabled;
  const question = decodeHtmlEntities(
    (state.problem.statement_kind === "prose" ? state.problem.statement?.trim() : "")
    || state.source.summary?.trim() || state.problem.label || state.source.title,
  );
  const sourceOccurrences = state.sources?.occurrences ?? [];
  const sourceCount = state.problem.source_count ?? new Set(sourceOccurrences.map((occurrence) => occurrence.source_id)).size;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Question",
    name: question,
    url: `https://problems.science${route}`,
    identifier: { "@type": "PropertyValue", propertyID: collectionName, value: problem },
    isPartOf: { "@type": "CollectionPage", name: collectionName, url: `https://problems.science${route.slice(0, route.lastIndexOf("/"))}` },
  };

  /* The archetype holds still across the tabs — switching surface must not
     repaint the page's ground or move the hero. The Workspace widens through
     `layout` alone, which touches the content region and not the frame. */
  return <PageShell as="article" archetype="problem" layout="canvas">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <PageHero density="compact">
      <div>
        {/* The display serif carries language, not notation. A resolved formal
            statement stays in the Question section in its own face; here the
            catalogue's retained label stands, which is also what the `label`
            kind already resolves to. */}
        <h1 className="max-w-5xl text-display leading-tight"><ScientificText text={question} /></h1>
        <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Problem metadata">
          <ProblemAnswerStrip state={state} />
          <span aria-hidden className="mx-1 hidden h-4 w-px bg-border sm:block" />
          {(state.problem.tags ?? []).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
          {(state.problem.oeis ?? []).filter((id) => /^A\d+$/u.test(id)).map((id) => <Button key={id} nativeButton={false} variant="link" size="sm" className="h-auto min-h-0 px-1" render={<a href={`https://oeis.org/${id}`} />}>{id}</Button>)}
          {sourceCount ? <span className="text-meta text-muted-foreground">{sourceCount} {sourceCount === 1 ? "source" : "sources"}</span> : null}
          {sourceOccurrences.some((occurrence) => occurrence.formal) ? <Badge variant="outline">formal declarations available</Badge> : null}
        </div>
      </div>
    </PageHero>
    <div className="mt-3"><LinkTabs label="Problem tools" layoutId="problem-view" current={view} tabs={[
      { key: "contributions", href: route, label: "Contributions" },
      { key: "files", href: `${route}?view=files`, label: "Files" },
      { key: "workspace", href: `${route}?view=workspace`, label: "Workspace" },
      { key: "timeline", href: `${route}?view=timeline`, label: "History" },
    ]} /></div>
    {view === "workspace"
      ? <ProblemWorkspace state={state} hostedAccount={account} accountsEnabled={accountsEnabled} selectedWorkspace={query.workspace} selectedObject={query.object} selectedInspector={query.inspector} mutationError={query.workError} basePath={route} />
      : <ProblemState state={state} basePath={route} researchView={view} selectedFile={query.file} selectedDeclaration={query.symbol} />}
  </PageShell>;
}
