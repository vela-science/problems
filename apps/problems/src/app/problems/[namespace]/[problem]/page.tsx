import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  canonicalProblemPath,
  problemPublicRouteForCanonicalPath,
  problemResolutionConfig,
  repositoryForCanonicalProblemNamespace,
} from "@vela/projection-data";
import { ProblemPageView, type ProblemPageQuery } from "@/components/vela/problem-page";
import { publishedProblemCollections } from "@/lib/published-problem-collections";

export const dynamic = "force-dynamic";

/* A Problem's address is its namespace and its number.
 *
 * This route used to resolve through the public-route table, which only held
 * the Problems that had been reviewed into a resolver entity — six of them.
 * The other 1,211 had no canonical address, so `/p/{repository}/{number}` was
 * the only way to reach them and the legacy form could never retire.
 *
 * The address now comes from the Repository's declared namespace, and the
 * reviewed entity is looked up only when one exists. Where it does, the exact
 * occurrence it declares is still handed down as the source the page must
 * render, so a reviewed Problem keeps the stronger guarantee it always had:
 * the record on screen is checked against a root a reviewer pinned. Where it
 * does not, the page resolves the Problem through the projection like any
 * other read, which asserts identity without asserting review. */
function resolve(namespace: string, problem: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(namespace) || !/^[1-9][0-9]*$/u.test(problem)) return null;
  const repository = repositoryForCanonicalProblemNamespace(namespace);
  if (!repository) return null;
  const collection = publishedProblemCollections.find((entry) => entry.namespace === namespace);
  if (!collection) return null;
  const route = canonicalProblemPath(repository, problem);
  if (!route) return null;
  const reviewed = problemPublicRouteForCanonicalPath(route);
  const entity = reviewed
    ? problemResolutionConfig.entities.find(({ entity_id }) => entity_id === reviewed.entity_id) ?? null
    : null;
  return { repository, route, entity, collection };
}

export async function generateMetadata({ params }: PageProps<"/problems/[namespace]/[problem]">): Promise<Metadata> {
  const { namespace, problem } = await params;
  const resolved = resolve(namespace, problem);
  return resolved ? {
    title: `${resolved.collection.name.replace(/ Problems$/u, " problem")} ${problem}`,
    description: `Read what is known, check prior work, and inspect exact evidence for ${resolved.collection.name.replace(/ Problems$/u, " problem")} ${problem}.`,
    alternates: { canonical: resolved.route },
  } : {};
}

export default async function ProblemPage({ params, searchParams }: PageProps<"/problems/[namespace]/[problem]"> & { searchParams: Promise<ProblemPageQuery> }) {
  const [{ namespace, problem }, query] = await Promise.all([params, searchParams]);
  const resolved = resolve(namespace, problem);
  if (!resolved) notFound();
  const { repository, route, entity, collection } = resolved;
  return <ProblemPageView
    repository={repository}
    problem={problem}
    collectionName={collection.name}
    route={route}
    query={query}
    expectedSource={entity ? {
      sourceId: entity.canonical_occurrence.source_id,
      nativeId: entity.canonical_occurrence.native_id,
      nativeKind: entity.canonical_occurrence.native_kind,
      contentRoot: entity.canonical_occurrence.content_root,
    } : undefined}
  />;
}
