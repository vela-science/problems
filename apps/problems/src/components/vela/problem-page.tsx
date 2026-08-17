import { notFound } from "next/navigation";
import { Badge } from "@vela/ui/components/badge";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { PageHero, PageShell } from "@vela/ui/vela/page-shell";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { LinkTabs } from "@/components/vela/link-tabs";
import { ProblemAnswerStrip } from "@/components/vela/problem-summary";
import { ProblemState, type ProblemStateView } from "@/components/vela/problem-state";
import { Workbench } from "@/components/vela/workbench";
import { authConfiguration, currentAccount } from "@/lib/auth";
import { scientificProblemState } from "@/lib/scientific-state";

export type ProblemPageQuery = { view?: string; mode?: string; workspace?: string; object?: string; inspector?: string; workError?: string };
export type ExpectedProblemSource = {
  sourceId: string;
  nativeId: string;
  nativeKind: string;
  contentRoot: string;
};

export type ProblemView = ProblemStateView | "workspace";

/* One bar, four addresses. Overview is the default and owns the bare URL, so
 * every published Problem link keeps meaning what it meant; the legacy
 * `?mode=work` links resolve to the Workspace tab rather than breaking. */
function resolveView(query: ProblemPageQuery): ProblemView {
  if (query.view === "sources" || query.view === "record" || query.view === "workspace") return query.view;
  if (query.mode === "work") return "workspace";
  return "overview";
}

export async function ProblemPageView({ repository, problem, route, query, expectedSource }: {
  repository: string;
  problem: string;
  route: string;
  query: ProblemPageQuery;
  expectedSource?: ExpectedProblemSource;
}) {
  const state = await scientificProblemState(repository, problem);
  if (!state) notFound();
  if (expectedSource && (
    state.problem.source_id !== expectedSource.sourceId
    || state.problem.node_id !== expectedSource.nativeId
    || state.problem.native_kind !== expectedSource.nativeKind
    || state.source.content_root !== expectedSource.contentRoot
  )) notFound();
  const view = resolveView(query);
  /* The three public views never read the session — that is what keeps them
     cheap, cacheable, and honest about being the public record. Only the
     Workspace tab is account-aware. */
  const account = view === "workspace" ? await currentAccount() : null;
  /* A deployment without the four WorkOS variables serves `/sign-in` as a 503.
     The Workspace needs to know that, because otherwise the only control it
     offers is one that cannot work. */
  const accountsEnabled = authConfiguration().enabled;

  /* The archetype holds still across the tabs — switching surface must not
     repaint the page's ground or move the hero. The Workspace widens through
     `layout` alone, which touches the content region and not the frame. */
  return <PageShell as="article" archetype="problem" layout={view === "workspace" ? "canvas" : "reading"}>
    <PageHero density="compact" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-eyebrow uppercase text-muted-foreground">Problem · {state.repositoryName}</span><span aria-hidden>·</span><Badge variant="outline">#{problem}</Badge></div>
        {/* The display serif carries language, not notation. A resolved formal
            statement stays in the Question section in its own face; here the
            catalogue's retained label stands, which is also what the `label`
            kind already resolves to. */}
        <h1 className="mt-3 max-w-5xl text-display leading-tight"><ScientificText text={decodeHtmlEntities(
          (state.problem.statement_kind === "prose" ? state.problem.statement?.trim() : "")
          || state.source.summary?.trim() || state.source.title,
        )} /></h1>
      </div>
      <LinkTabs label="Problem views" layoutId="problem-view" current={view} tabs={[
        { key: "overview", href: route, label: "Overview" },
        { key: "sources", href: `${route}?view=sources`, label: "Sources" },
        { key: "record", href: `${route}?view=record`, label: "Record" },
        { key: "workspace", href: `${route}?view=workspace`, label: "Workspace" },
      ]} />
      {/* The thirty-second answer rides with the hero on every public view,
          so switching to Sources or Record never loses the state axes. The
          Workspace keeps its own toolbar instead. */}
      {view !== "workspace" ? <div className="lg:col-span-2"><ProblemAnswerStrip state={state} /></div> : null}
    </PageHero>
    {view === "workspace"
      ? <Workbench state={state} hostedAccount={account} accountsEnabled={accountsEnabled} selectedWorkspace={query.workspace} selectedObject={query.object} selectedInspector={query.inspector} mutationError={query.workError} basePath={route} />
      : <ProblemState state={state} basePath={route} view={view} />}
  </PageShell>;
}
