import { notFound } from "next/navigation";
import { Badge } from "@vela/ui/components/badge";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { PageHero, PageShell } from "@vela/ui/vela/page-shell";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { ModeSwitcher } from "@/components/vela/mode-switcher";
import { ProblemState } from "@/components/vela/problem-state";
import { Workbench } from "@/components/vela/workbench";
import { authConfiguration, currentAccount } from "@/lib/auth";
import { scientificProblemState } from "@/lib/scientific-state";

export type ProblemPageQuery = { mode?: string; workspace?: string; object?: string; inspector?: string; workError?: string };
export type ExpectedProblemSource = {
  sourceId: string;
  nativeId: string;
  nativeKind: string;
  contentRoot: string;
};

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
  const mode = query.mode === "work" ? "work" : "state";
  const account = mode === "work" ? await currentAccount() : null;
  /* A deployment without the four WorkOS variables serves `/sign-in` as a 503.
     The Workspace needs to know that, because otherwise the only control it
     offers is one that cannot work. */
  const accountsEnabled = authConfiguration().enabled;

  return <PageShell as="article" archetype={mode === "work" ? "work" : "problem"} layout={mode === "work" ? "canvas" : "reading"}>
    <PageHero density="compact" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-eyebrow uppercase text-muted-foreground">Problem · {state.repositoryName}</span><span aria-hidden>·</span><Badge variant="outline">#{problem}</Badge></div>
        <h1 className="mt-3 max-w-5xl text-display leading-tight"><ScientificText text={decodeHtmlEntities(state.problem.statement?.trim() || state.source.summary?.trim() || state.source.title)} /></h1>
      </div>
      <ModeSwitcher mode={mode} basePath={route} />
    </PageHero>
    {mode === "state"
      ? <ProblemState state={state} basePath={route} />
      : <Workbench state={state} hostedAccount={account} accountsEnabled={accountsEnabled} selectedWorkspace={query.workspace} selectedObject={query.object} selectedInspector={query.inspector} mutationError={query.workError} basePath={route} />}
  </PageShell>;
}
