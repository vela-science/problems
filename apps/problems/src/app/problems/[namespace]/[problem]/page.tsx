import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { problemPublicRouteForCanonicalPath, problemResolutionConfig } from "@vela/projection-data";
import { ProblemPageView, type ProblemPageQuery } from "@/components/vela/problem-page";

export const dynamic = "force-dynamic";

function exactAlias(namespace: string, problem: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(namespace) || !/^[1-9][0-9]*$/u.test(problem)) return null;
  return problemPublicRouteForCanonicalPath(`/problems/${namespace}/${problem}`);
}

export async function generateMetadata({ params }: PageProps<"/problems/[namespace]/[problem]">): Promise<Metadata> {
  const { namespace, problem } = await params;
  const alias = exactAlias(namespace, problem);
  return alias ? {
    title: `Problem ${problem}`,
    description: `Exact current State and non-authoritative Workspace for reviewed Problem ${problem}.`,
    alternates: { canonical: alias.canonical_path },
  } : {};
}

export default async function ReviewedProblemAliasPage({ params, searchParams }: PageProps<"/problems/[namespace]/[problem]"> & { searchParams: Promise<ProblemPageQuery> }) {
  const [{ namespace, problem }, query] = await Promise.all([params, searchParams]);
  const alias = exactAlias(namespace, problem);
  if (!alias) notFound();
  const entity = problemResolutionConfig.entities.find(({ entity_id }) => entity_id === alias.entity_id);
  if (!entity) notFound();
  return <ProblemPageView
    repository={alias.current_repository}
    problem={alias.current_problem}
    route={alias.canonical_path}
    query={query}
    expectedSource={{
      sourceId: entity.canonical_occurrence.source_id,
      nativeId: entity.canonical_occurrence.native_id,
      nativeKind: entity.canonical_occurrence.native_kind,
      contentRoot: entity.canonical_occurrence.content_root,
    }}
  />;
}
