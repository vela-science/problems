import Link from "next/link";
import { notFound } from "next/navigation";
import { projectionRefusal } from "@vela/projection-data/refusal";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Button } from "@vela/ui/components/button";
import { PageHero, PageShell } from "@vela/ui/vela/page-shell";
import {
  ProblemOverviewReference,
  ProblemReferenceHeader,
  type ProblemReferenceView,
} from "@/components/vela/problem-overview-reference";
import { ProblemState, type ProblemResearchView } from "@/components/vela/problem-state";
import { ProblemWorkspace } from "@/components/vela/problem-workspace";
import { RememberObject } from "@/components/vela/remember-object";
import { problemLabel, resolveProblemStatement, statementParagraphs, statementPlainText } from "@/lib/problem-statement";
import { authConfiguration, currentAccount } from "@/lib/auth";
import { problemFrontierMovement } from "@/lib/frontier-timeline";
import { scientificProblemState } from "@/lib/scientific-state";

export type ProblemPageQuery = { view?: string; research?: string; file?: string; symbol?: string; mode?: string; workspace?: string; object?: string; inspector?: string; workError?: string };
export type ExpectedProblemSource = {
  sourceId: string;
  nativeId: string;
  nativeKind: string;
  contentRoot: string;
};

function resolveReferenceView(query: ProblemPageQuery): ProblemReferenceView {
  if (["workspace", "work"].includes(query.view ?? "") || query.mode === "work") return "work";
  if (["results", "contributions", "evidence", "map"].includes(query.view ?? "") || ["map", "contributions"].includes(query.research ?? "")) return "results";
  if (["sources", "files"].includes(query.view ?? "") || query.research === "files") return "sources";
  if (["history", "timeline", "record"].includes(query.view ?? "") || query.research === "timeline") return "history";
  return "overview";
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
     `layout` alone, which touches the content region and not the frame. */
  return <PageShell as="article" archetype="problem" layout="canvas" className="!pt-2">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    {/* Spoken form, not the source TeX: the palette lists this as a name, and
        the raw statement would print `\mathbb{R}^2` into it. */}
    <RememberObject href={route} title={statementPlainText(question).slice(0, 120)} context={collectionName} />
    <div className="mt-2">
      <ProblemReferenceHeader state={state} collectionName={collectionName} summary={referenceView === "overview"} />
    </div>
    {referenceView === "overview" ? <ProblemOverviewReference state={state} route={route} />
      : view === "workspace"
        ? <ProblemWorkspace state={state} hostedAccount={account} accountsEnabled={accountsEnabled} selectedWorkspace={query.workspace} selectedObject={query.object} selectedInspector={query.inspector} mutationError={query.workError} basePath={route} />
        : <ProblemState state={state} basePath={route} researchView={view as ProblemResearchView} selectedFile={query.file} selectedDeclaration={query.symbol} frontier={frontier} />}
  </PageShell>;
}
