import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { problemPublicRouteForLegacyPath } from "@vela/projection-data";
import { ProblemPageView, type ProblemPageQuery } from "@/components/vela/problem-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/p/[repository]/[problem]">): Promise<Metadata> {
  const { repository, problem } = await params;
  const alias = problemPublicRouteForLegacyPath(`/p/${repository}/${problem}`);
  return {
    title: `Problem ${problem}`,
    description: `Exact state and non-authoritative activity for ${repository} Problem ${problem}.`,
    ...(alias ? { alternates: { canonical: alias.canonical_path } } : {}),
  };
}

export default async function LegacyProblemPage({
  params,
  searchParams,
}: PageProps<"/p/[repository]/[problem]"> & { searchParams: Promise<ProblemPageQuery> }) {
  const [{ repository, problem }, query] = await Promise.all([params, searchParams]);
  if (!/^[a-z0-9-]{1,64}$/u.test(repository) || !/^[\w.:-]{1,64}$/u.test(problem)) notFound();
  const oldRoute = `/p/${repository}/${problem}`;
  const alias = problemPublicRouteForLegacyPath(oldRoute);
  if (alias) {
    const suffix = new URLSearchParams((["mode", "workspace", "object", "inspector", "workError"] as const)
      .flatMap((key): Array<[string, string]> => typeof query[key] === "string" && query[key]!.length <= 512 ? [[key, query[key]!]] : [])).toString();
    permanentRedirect(`${alias.canonical_path}${suffix ? `?${suffix}` : ""}`);
  }
  return <ProblemPageView repository={repository} problem={problem} route={oldRoute} query={query} />;
}
