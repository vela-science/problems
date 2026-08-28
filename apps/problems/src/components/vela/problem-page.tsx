import Link from "next/link";
import { notFound } from "next/navigation";
import { projectionRefusal } from "@vela/projection-data/refusal";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Button } from "@vela/ui/components/button";
import { PageHero, PageShell } from "@vela/ui/vela/page-shell";
import {
  ProblemOverviewReference,
  type ProblemReferenceView,
} from "@/components/vela/problem-overview-reference";
import { ProblemHeader } from "@/components/vela/problem-header";
import { ProblemState, type ProblemResearchView } from "@/components/vela/problem-state";
import { ProblemWorkspace } from "@/components/vela/problem-workspace";
import { RememberObject } from "@/components/vela/remember-object";
import { RegisterProblemTools } from "@/webmcp/register-tools";
import { buildWebMcpProblemContext } from "@/webmcp/build-context";
import { problemLabel, resolveProblemStatement, statementParagraphs } from "@/lib/problem-statement";
import { authConfiguration, currentAccount } from "@/lib/auth";
import { problemFrontierMovement } from "@/lib/frontier-timeline";
import { scientificProblemState } from "@/lib/scientific-state";

export type ProblemPageQuery = { view?: string; file?: string; symbol?: string; workspace?: string; object?: string; inspector?: string; workError?: string };
export type ExpectedProblemSource = {
  sourceId: string;
  nativeId: string;
  nativeKind: string;
  contentRoot: string;
};

/* The five sections, by their one name each.
 *
 * This used to accept eleven more spellings — `workspace`, `evidence`, `map`,
 * `contributions`, `files`, `timeline`, `record`, plus `?mode=` and
 * `?research=` — so that addresses published before the sections became path
 * segments kept resolving. Those aliases are retired: one section, one name. */
function resolveReferenceView(query: ProblemPageQuery): ProblemReferenceView {
  const view = query.view ?? "";
  return view === "work" || view === "results" || view === "sources" || view === "history" ? view : "overview";
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
      {/* The refusal explains itself. This offered "Why reads fail closed"
          pointing at `/about#scientific-state` — an anchor that did not exist,
          so it landed at the top of an essay, mid-error, off the task. */}
      <p className="mt-4 max-w-3xl text-body text-muted-foreground">
        The reader fails closed rather than guessing: a projection it cannot
        verify might answer with a different release&apos;s state, and a wrong
        scientific answer is worse than none.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href="/problems" />}>Open Problems</Button>
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
  const referenceView = resolveReferenceView(query);
  const view = referenceView === "work"
    ? "workspace"
    : referenceView === "sources"
      ? "files"
      : referenceView === "history"
        ? "timeline"
        : "contributions";
  /* The three read-only tools never read the session — that is what keeps them
     cheap, cacheable, and honest about being the public record. Only the
     Workspace tab is account-aware. */
  const account = view === "workspace" ? await currentAccount() : null;
  /* Frontier movement exists only for a Problem whose reviewed entity has at
     least one verified state-change edge. Everywhere else the value is
     undefined and History renders exactly what it rendered before. */
  const frontier = view === "timeline" ? await problemFrontierMovement(state) : undefined;
  /* A deployment without the four WorkOS variables serves `/sign-in` as a 503.
     The Workspace needs to know that, because otherwise the only control it
     offers is one that cannot work. */
  const accountsEnabled = authConfiguration().enabled;
  /* The catalogue's label is a number, not a question. Where a source wrote
     the question down, that text is what a search result and a shared link
     should carry. */
  const statement = resolveProblemStatement(state);
  const question = statementParagraphs(statement).question || problemLabel(state);
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
     `layout` alone, which touches the content region and not the frame.
   * That widening was unconditional, so the four *reading* surfaces — the
     question, its Results, its Sources, its history — were uncapped too, and
     ran the full width of whatever display they opened on. Only the workspace
     is the instrument that wants every pixel. */
  return <PageShell as="article" archetype="problem" layout={view === "workspace" ? "canvas" : "standard"} className="!pt-2">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    {/* The object's name, not its statement. Both the palette and the rail
        list this as an entry in a narrow column, and a truncated theorem reads
        as "Suppose n points in R^2 determine a convex poly…" — which identifies
        nothing. The statement stays searchable through the search index. */}
    <RememberObject href={route} title={problemLabel(state)} context={collectionName} />
    {/* The same exact state this page renders, offered to a browser agent as
        typed operations. Registration is client-side and unregisters on
        navigation; a browser without WebMCP renders nothing here and the page
        is unchanged. The write tools reach the Server Actions the Work forms
        already post to, so an agent has exactly the capabilities a signed-in
        person has, and no others. */}
    <RegisterProblemTools
      context={buildWebMcpProblemContext(state, route, collectionName)}
      accountsEnabled={accountsEnabled}
      workspaceId={query.workspace ?? null}
    />
    <ProblemHeader state={state} route={route} current={referenceView} />
    {referenceView === "overview" ? <ProblemOverviewReference state={state} route={route} />
      : view === "workspace"
        ? <ProblemWorkspace state={state} hostedAccount={account} accountsEnabled={accountsEnabled} selectedWorkspace={query.workspace} selectedObject={query.object} selectedInspector={query.inspector} mutationError={query.workError} basePath={route} />
        : <ProblemState state={state} basePath={route} researchView={view as ProblemResearchView} selectedFile={query.file} selectedDeclaration={query.symbol} frontier={frontier} />}
  </PageShell>;
}
