import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  canonicalProblemPath,
  formalConjectureOccurrence,
  problemPublicRouteForCanonicalPath,
  problemResolutionConfig,
  repositoryForCanonicalProblemNamespace,
} from "@vela/projection-data";
import { ProblemPageView, type ProblemPageQuery } from "@/components/vela/problem-page";
import { FormalConjecturePage } from "@/components/vela/formal-conjecture-page";
import type { ProblemReferenceView } from "@/components/vela/problem-overview-reference";
import { statementPlainText } from "@/lib/problem-statement";
import { publishedProblemCollections } from "@/lib/published-problem-collections";
import { scientificProblemState } from "@/lib/scientific-state";

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
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(namespace)) return null;
  if (namespace === "formal-conjectures") {
    const occurrence = formalConjectureOccurrence(problem);
    return occurrence ? { kind: "formal-conjecture" as const, route: `/problems/formal-conjectures/${problem}`, collection: publishedProblemCollections.find((entry) => entry.namespace === namespace)!, occurrence } : null;
  }
  if (!/^[1-9][0-9]*$/u.test(problem)) return null;
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
  return { kind: "repository-problem" as const, repository, route, entity, collection };
}

/* Mirrors `app/not-found.tsx`, which restates `robots` rather than leaving it
   to Next's automatic not-found metadata, because the automatic one emits a
   contradictory pair. */
const NOT_FOUND_METADATA = { title: "Not found", robots: { index: false, follow: true } } as const;

function referenceView(query: ProblemPageQuery): ProblemReferenceView {
  const view = query.view ?? "";
  return view === "work" || view === "results" || view === "sources" || view === "history" ? view : "overview";
}

export async function generateMetadata({ params }: PageProps<"/problems/[namespace]/[problem]/[[...view]]">): Promise<Metadata> {
  const { namespace, problem } = await params;
  const resolved = resolve(namespace, problem);
  if (resolved?.kind === "formal-conjecture") {
    /* Spoken form, not the source TeX. These titles are statements, so the raw
       value put `For every integer $x \ge 2$ there exists a prime between
       $x(x-1)$ and $x^2$.` into the browser tab, the bookmark and the search
       snippet — and the backslash did not survive the trip, so it read
       `$x  ge 2$`. */
    const spoken = statementPlainText(resolved.occurrence.title);
    return {
      title: spoken,
      description: `Inspect the exact Formal Conjectures declaration, source, and retained status for ${spoken}.`,
      alternates: { canonical: resolved.route },
    };
  }
  if (!resolved) return NOT_FOUND_METADATA;
  /* `resolve` proves the address is well formed, not that the release retains a
     Problem at it. It pattern-matches the namespace and the number, so
     `/problems/erdos-problems/888888` resolved happily while the page below
     called `notFound()` — the response was a correct 404 whose tab, history
     entry and bookmark all read "Erdős problem 888888", and whose robots tag
     flipped to `index, follow` after hydration. A product that publishes only
     what a release retains cannot name a Problem that it does not.

     The read is the same cached one the page performs, so asking here costs
     nothing beyond the first call. A refusal is left to the page and its error
     boundary; only a confirmed absence changes the metadata. */
  try {
    if (!(await scientificProblemState(resolved.repository, problem))) return NOT_FOUND_METADATA;
  } catch {
    return {};
  }
  return {
    title: `${resolved.collection.name.replace(/ Problems$/u, " problem")} ${problem}`,
    description: `Read what is known, check prior work, and inspect exact evidence for ${resolved.collection.name.replace(/ Problems$/u, " problem")} ${problem}.`,
    alternates: { canonical: resolved.route },
  };
}

export default async function ProblemPage({ params, searchParams }: PageProps<"/problems/[namespace]/[problem]/[[...view]]"> & { searchParams: Promise<ProblemPageQuery> }) {
  const [{ namespace, problem, view }, query] = await Promise.all([params, searchParams]);
  /* A section is a path segment, the way Entire addresses one, so the rail can
     mark the open section from the path alone. */
  const requested: ProblemPageQuery = view?.[0] ? { ...query, view: view[0] } : query;
  const resolved = resolve(namespace, problem);
  if (!resolved) notFound();
  if (resolved.kind === "formal-conjecture") return <FormalConjecturePage item={resolved.occurrence} route={resolved.route} current={referenceView(requested)} />;
  const { repository, route, entity, collection } = resolved;
  return <ProblemPageView
    repository={repository}
    problem={problem}
    collectionName={collection.name}
    route={route}
    query={requested}
    expectedSource={entity ? {
      sourceId: entity.canonical_occurrence.source_id,
      nativeId: entity.canonical_occurrence.native_id,
      nativeKind: entity.canonical_occurrence.native_kind,
      contentRoot: entity.canonical_occurrence.content_root,
    } : undefined}
  />;
}
