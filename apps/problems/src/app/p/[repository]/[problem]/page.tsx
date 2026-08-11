import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@vela/ui/components/badge";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { ModeSwitcher } from "@/components/mode-switcher";
import { ProblemState } from "@/components/problem-state";
import { Workbench } from "@/components/workbench";
import { currentHostedAccount } from "@/lib/auth";
import { featuredProblems, scientificProblemState } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/p/[repository]/[problem]">): Promise<Metadata> {
  const { repository, problem } = await params;
  return { title: `Problem ${problem}`, description: `Exact state and non-authoritative activity for ${repository} Problem ${problem}.` };
}

export default async function ProblemPage({
  params,
  searchParams,
}: PageProps<"/p/[repository]/[problem]"> & { searchParams: Promise<{ mode?: string; workspace?: string }> }) {
  const [{ repository, problem }, query] = await Promise.all([params, searchParams]);
  if (!/^[a-z0-9-]{1,64}$/u.test(repository) || !/^[\w.:-]{1,64}$/u.test(problem)) notFound();
  const state = await scientificProblemState(repository, problem);
  if (!state) notFound();
  const mode = query.mode === "work" ? "work" : "state";
  const account = mode === "work" ? await currentHostedAccount() : null;
  const feature = featuredProblems.find((entry) => entry.repository === repository && entry.problem === problem);

  return <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
    <header className="border-b pb-7">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-eyebrow uppercase text-muted-foreground">{state.repositoryName}</span><span aria-hidden>·</span><Badge variant="outline">Problem {problem}</Badge></div>
        <h1 className="mt-4 max-w-5xl text-display leading-tight"><ScientificText text={decodeHtmlEntities(state.source.summary?.trim() || state.problem.statement || state.source.title)} /></h1>
      </div>
      <dl className="grid grid-cols-3 gap-3 border-l-2 border-foreground/80 pl-5 lg:grid-cols-1">
        <div><dt className="text-eyebrow uppercase text-muted-foreground">State</dt><dd className="mt-1 text-label capitalize">{state.problem.declared_status}</dd></div>
        <div><dt className="text-eyebrow uppercase text-muted-foreground">Source</dt><dd className="mt-1 text-label">{state.problem.formalized ? "Formalized" : "Not formalized"}</dd></div>
        <div><dt className="text-eyebrow uppercase text-muted-foreground">Open</dt><dd className="mt-1 text-label">{state.problem.offer_count} {state.problem.offer_count === 1 ? "target" : "targets"}</dd></div>
      </dl>
      </div>
      <div className="mt-7"><ModeSwitcher repository={repository} problem={problem} mode={mode} /></div>
    </header>
    {mode === "state"
      ? <ProblemState
          state={state}
          dossier={feature?.dossier}
          dossierRepository={feature && "dossierRepository" in feature ? feature.dossierRepository : repository}
        />
      : <Workbench state={state} hostedAccount={account} selectedWorkspace={query.workspace} />}
  </article>;
}
