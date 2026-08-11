import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@vela/ui/components/badge";
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

  return <article className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
    <div className="flex flex-wrap items-start justify-between gap-5 border-b pb-7">
      <div>
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Problem {problem}</Badge><span className="text-meta text-muted-foreground">{state.repositoryName}</span></div>
        <h1 className="mt-3 text-display">Problem {problem}</h1>
        <p className="mt-2 max-w-2xl text-body text-muted-foreground">One exact canonical state, with a separate hosted activity plane for useful contribution.</p>
      </div>
      <ModeSwitcher repository={repository} problem={problem} mode={mode} />
    </div>
    {mode === "state"
      ? <ProblemState
          state={state}
          dossier={feature?.dossier}
          dossierRepository={feature && "dossierRepository" in feature ? feature.dossierRepository : repository}
        />
      : <Workbench state={state} hostedAccount={account} selectedWorkspace={query.workspace} />}
  </article>;
}
