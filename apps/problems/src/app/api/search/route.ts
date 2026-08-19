import { type NextRequest, NextResponse } from "next/server";
import { compositeSearchRoot, formalConjecturesCollectionRoot, formalConjecturesSearchRecords } from "@vela/projection-data";
import { searchRead } from "@vela/projection-data/read-contracts";
import { immutableCompositeSearchHeaders, projectionErrorAnswer } from "@/lib/projection-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const root = params.get("root");
  if (!root) return NextResponse.json({ error: "root is required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    const collection = params.get("collection");
    const requestedKind = params.get("kind") ?? undefined;
    const cursor = params.get("cursor") ?? undefined;
    const requestedLimit = params.has("limit") ? Number(params.get("limit")) : 100;
    const pageLimit = Number.isSafeInteger(requestedLimit) && requestedLimit >= 1 ? Math.min(requestedLimit, 250) : requestedLimit;
    const formalEligible = (!collection || collection === "formal-conjectures")
      && (!requestedKind || requestedKind === "problem")
      && !params.get("repository")
      && (!params.get("standing") || params.get("standing") === "source_open");
    const formalRecords = formalEligible ? formalConjecturesSearchRecords(params.get("q") ?? "") : [];
    const formalCursor = /^fc:([0-9]+)$/u.exec(cursor ?? "");
    const formalOffset = formalCursor ? Number(formalCursor[1]) : cursor ? formalRecords.length : 0;
    const formalPage = formalRecords.slice(formalOffset, formalOffset + pageLimit);
    const formalHasMore = formalOffset + formalPage.length < formalRecords.length;
    const databaseLimit = Number.isSafeInteger(pageLimit) && pageLimit >= 1 ? Math.max(1, pageLimit - formalPage.length) : pageLimit;
    const databaseEligible = (!collection || collection === "erdos-problems")
      && (!collection || !requestedKind || requestedKind === "problem");
    const result = await searchRead({
      root, q: params.get("q") ?? undefined, repository: params.get("repository") ?? undefined,
      kind: collection === "erdos-problems" && databaseEligible ? "problem" : requestedKind,
      standing: params.get("standing") ?? undefined,
      cursor: formalCursor ? undefined : cursor,
      limit: collection === "formal-conjectures" ? 1 : databaseLimit,
    });
    const searchRoot = compositeSearchRoot(result.bundle_root);
    if (params.get("search_root") !== searchRoot) throw new Error("composite search root is required and must match the published collection set");
    const databaseRecords = databaseEligible ? result.records : [];
    return NextResponse.json({
      schema: "site.composite-search-index.v1",
      search_root: searchRoot,
      projection_root: result.bundle_root,
      projection_generated_at: result.generated_at,
      supplemental_collections: [{ collection_id: "formal-conjectures", collection_root: formalConjecturesCollectionRoot }],
      total: (databaseEligible ? result.total : 0) + formalRecords.length,
      next_cursor: formalHasMore ? `fc:${formalOffset + formalPage.length}` : databaseEligible ? result.next_cursor : null,
      records: [...formalPage, ...databaseRecords].slice(0, pageLimit),
    }, { headers: immutableCompositeSearchHeaders({ projectionRoot: result.bundle_root, collectionRoot: formalConjecturesCollectionRoot, searchRoot, query: params.toString() }) });
  } catch (error) {
    const { status, body } = projectionErrorAnswer(error, "search projection failed");
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  }
}
