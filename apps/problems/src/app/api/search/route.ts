import { type NextRequest, NextResponse } from "next/server";
import {
  canonicalProblemPath,
  compositeSearchRoot,
  formalConjecturesCollectionRoot,
  formalConjecturesSearchRecords,
  problemsForRepository,
  repositoryForCanonicalProblemNamespace,
  type SiteSearchRecord,
} from "@vela/projection-data";
import { searchRead } from "@vela/projection-data/read-contracts";
import { ProjectionReadError } from "@vela/projection-data/refusal";
import { immutableCompositeSearchHeaders, projectionErrorAnswer } from "@/lib/projection-response";
import { problemStatementIndex, type ProblemStatementIndex } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";

const ERDOS_COLLECTION = "erdos-problems";

/* The written question, where a source retained one.
 *
 * `problem.statement` is the catalogue's own best statement, which for this
 * collection is formal notation: a search for "weird numbers" matched Erdős 470
 * through the Lean identifier `n.Weird` and then titled the row
 * `sorry ↔ ∃ n, n.Weird ∧ Odd n`. Two of the four results for "prime gaps"
 * opened with the word `sorry`, which is a placeholder for an unproved
 * statement — the least readable thing the row could have said, on the surface
 * a first-time reader meets first.
 *
 * The prose exists and is already resolved: `problemStatementIndex` reads the
 * retaining sources once per release and the collection directory has been
 * leading its rows with it. Search now reads the same index, so one Problem
 * cannot be a question in the directory and a Lean expression in search.
 *
 * The formal statement is not discarded — it moves to `formal_statement`, where
 * the row can keep showing it under the question. */
function erdosProblemSearchRecord(
  repository: string,
  problem: Awaited<ReturnType<typeof problemsForRepository>>["items"][number],
  statements: ProblemStatementIndex,
): SiteSearchRecord {
  const href = canonicalProblemPath(repository, problem.problem);
  if (!href) throw new Error(`Erdős Problem ${problem.problem} has no canonical route`);
  const formal = problem.statement.trim();
  const written = statements[`${ERDOS_COLLECTION}:${problem.problem}`]?.text?.trim();
  return {
    kind: "problem",
    repository,
    id: `${ERDOS_COLLECTION}:${problem.problem}`,
    assertion: written || formal || problem.label,
    /* Present only when it is not already the headline, so the row never prints
       one string twice. */
    formal_statement: written && formal && written !== formal ? formal : null,
    source_title: "Erdős Problems",
    /* Repository-local Standing only. The collection's own open/solved status
       remains on the Problem row and is not relabelled as Vela Standing. */
    standing: problem.local_standing ?? "unassessed",
    source_status: problem.declared_status,
    result_standing: problem.local_standing,
    href,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const root = params.get("root");
  if (!root) return NextResponse.json({ error: "root is required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    const collection = params.get("collection");
    const requestedKind = params.get("kind") ?? undefined;
    const requestedRepository = params.get("repository") ?? undefined;
    const requestedStanding = params.get("standing") ?? undefined;
    const cursor = params.get("cursor") ?? undefined;
    const requestedLimit = params.has("limit") ? Number(params.get("limit")) : 100;
    const pageLimit = Number.isSafeInteger(requestedLimit) && requestedLimit >= 1 ? Math.min(requestedLimit, 250) : requestedLimit;
    const formalEligible = (!collection || collection === "formal-conjectures")
      && (!requestedKind || requestedKind === "problem")
      && !requestedRepository
      && (!requestedStanding || requestedStanding === "source_open");
    const formalRecords = formalEligible ? formalConjecturesSearchRecords(params.get("q") ?? "") : [];
    const formalCursor = /^fc:([0-9]+)$/u.exec(cursor ?? "");
    const formalOffset = formalCursor ? Number(formalCursor[1]) : cursor ? formalRecords.length : 0;
    const formalPage = formalRecords.slice(formalOffset, formalOffset + pageLimit);
    const formalHasMore = formalOffset + formalPage.length < formalRecords.length;
    const databaseLimit = Number.isSafeInteger(pageLimit) && pageLimit >= 1 ? Math.max(1, pageLimit - formalPage.length) : pageLimit;
    const erdosRepository = repositoryForCanonicalProblemNamespace(ERDOS_COLLECTION);
    if (!erdosRepository) throw new Error("published Erdős collection has no Repository resolver");
    const erdosEligible = (!collection || collection === ERDOS_COLLECTION)
      && (!requestedKind || requestedKind === "problem")
      && (!requestedRepository || requestedRepository === erdosRepository);
    if (erdosEligible && cursor) {
      throw new ProjectionReadError("invalid_cursor", "Problem search is a bounded ranked view and does not accept a pagination cursor");
    }
    const erdosPage = erdosEligible ? await problemsForRepository(erdosRepository, {
      root,
      q: params.get("q") ?? undefined,
      /* Standing is applied after the exact read because this catalogue reader
         separates source-declared status from Repository-local Standing. */
      limit: requestedStanding ? 5_000 : pageLimit,
      includeFacets: false,
    }) : { items: [], total: 0 };
    const erdosMatches = erdosPage.items.filter((problem) => (
      !requestedStanding
      || (requestedStanding === "unassessed" ? problem.local_standing === null : problem.local_standing === requestedStanding)
    ));
    /* Cached per release, and already read by the collection directory. */
    const statements = erdosEligible ? await problemStatementIndex(root) : {};
    const erdosRecords = erdosMatches.slice(0, pageLimit)
      .map((problem) => erdosProblemSearchRecord(erdosRepository, problem, statements));
    const databaseEligible = !collection && requestedKind !== "problem";
    const result = await searchRead({
      root, q: params.get("q") ?? undefined, repository: requestedRepository,
      kind: requestedKind,
      standing: requestedStanding,
      cursor: formalCursor ? undefined : cursor,
      limit: collection ? 1 : databaseLimit,
    });
    const searchRoot = compositeSearchRoot(result.bundle_root);
    if (params.get("search_root") !== searchRoot) throw new Error("composite search root is required and must match the published collection set");
    const databaseRecords = databaseEligible ? result.records : [];
    const records = [...formalPage, ...erdosRecords, ...databaseRecords].slice(0, pageLimit);
    const erdosTotal = requestedStanding ? erdosMatches.length : erdosPage.total;
    return NextResponse.json({
      schema: "site.composite-search-index.v1",
      search_root: searchRoot,
      projection_root: result.bundle_root,
      projection_generated_at: result.generated_at,
      supplemental_collections: [{ collection_id: "formal-conjectures", collection_root: formalConjecturesCollectionRoot }],
      total: (databaseEligible ? result.total : 0) + formalRecords.length + erdosTotal,
      /* The Problem catalogue and record index have different stable orders.
         This endpoint returns one bounded ranked page and refuses to mint a
         cursor that would pretend the two orders form one keyset. */
      next_cursor: erdosEligible ? null : formalHasMore ? `fc:${formalOffset + formalPage.length}` : databaseEligible ? result.next_cursor : null,
      records,
    }, { headers: immutableCompositeSearchHeaders({ projectionRoot: result.bundle_root, collectionRoot: formalConjecturesCollectionRoot, searchRoot, query: params.toString() }) });
  } catch (error) {
    const { status, body } = projectionErrorAnswer(error, "search projection failed");
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  }
}
