import routesJson from "../config/problem-public-routes.v1.json";

/** Browser-safe navigation context from the same bytes validated server-side. */
export const problemPublicRouteContexts = routesJson.routes.map((route) => ({
  canonicalPath: route.canonical_path,
  currentRepository: route.current_repository,
  currentProblem: route.current_problem,
})) as ReadonlyArray<{
  canonicalPath: string;
  currentRepository: string;
  currentProblem: string;
}>;

export function publicProblemPathFromContext(repository: string, problem: string): string {
  const legacyPath = `/p/${repository}/${problem}`;
  return problemPublicRouteContexts.find(({ currentRepository, currentProblem }) => (
    currentRepository === repository && currentProblem === problem
  ))?.canonicalPath ?? legacyPath;
}
