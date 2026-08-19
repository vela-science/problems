import type { FrontierTimelineData } from "@/components/vela/frontier-timeline";
import { ProblemResearch } from "@/components/vela/problem-research";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

export type ProblemResearchView = "map" | "contributions" | "files" | "timeline";

/* One Problem, three read-only tools, each complete HTML at its own URL:
 * Contributions, Files, and History. Workspace is the account-aware fourth
 * tool rendered by the page. Exact protocol detail stays inside the object it
 * explains rather than becoming another top-level surface. */
export function ProblemState({ state, basePath, researchView = "contributions", selectedFile, selectedDeclaration, frontier }: {
  state: State;
  basePath: string;
  researchView?: ProblemResearchView;
  selectedFile?: string;
  selectedDeclaration?: string;
  /** Frontier movement for the History tool; absent for every Problem the
   *  frontier reader has no verified movement for. */
  frontier?: FrontierTimelineData;
}) {
  return <div className="mt-6 min-w-0"><ProblemResearch state={state} basePath={basePath} view={researchView} selectedFile={selectedFile} selectedDeclaration={selectedDeclaration} frontier={frontier} /></div>;
}
