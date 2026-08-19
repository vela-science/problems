import "server-only";

import { slugForRepositoryId } from "@vela/projection-data";
import type { ProblemDiscovery } from "@/lib/scientific-state";

type WorkspaceProblemContext = {
  projectionReleaseRoot: string;
  repositoryId: string;
  problemId: string;
  anchorRoot: string;
  capturedAt: string;
};

type WorkspaceWithProblemContexts = {
  id: string;
  problemContexts: WorkspaceProblemContext[];
};

export type WorkspaceProblemLink = {
  context: WorkspaceProblemContext;
  state: "current" | "earlier-release" | "unavailable";
  label: string;
  href: string | null;
};

export function workspaceProblemLinks(
  workspace: WorkspaceWithProblemContexts,
  catalog: ProblemDiscovery[],
): WorkspaceProblemLink[] {
  return workspace.problemContexts.map((context) => {
    const repository = slugForRepositoryId(context.repositoryId);
    const matches = repository
      ? catalog.filter((problem) => (
        problem.repository === repository
        && problem.record.node_id === context.problemId
      ))
      : [];
    if (matches.length !== 1 || !matches[0]?.canonicalPath) {
      return {
        context,
        state: "unavailable",
        label: "Problem context unavailable",
        href: null,
      };
    }
    const problem = matches[0];
    const query = new URLSearchParams({ view: "work", workspace: workspace.id });
    return {
      context,
      state: problem.releaseRoot === context.projectionReleaseRoot ? "current" : "earlier-release",
      label: `${problem.collection?.name ?? "Problem collection"} · ${problem.record.label ?? `Problem ${problem.problem}`}`,
      href: `${problem.canonicalPath}?${query.toString()}`,
    };
  });
}
