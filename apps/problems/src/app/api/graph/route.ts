import { type NextRequest, NextResponse } from "next/server";
import { graphRead, type GraphLens } from "@vela/projection-data/read-contracts";
import { immutableProjectionHeaders, projectionErrorAnswer } from "@/lib/projection-response";

export const dynamic = "force-dynamic";
const views = new Set(["canvas", "node", "ledger"]);
const lenses = new Set(["research", "activity", "all"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const root = params.get("root");
  const repository = params.get("repository");
  const view = params.get("view") ?? "canvas";
  const lens = params.get("lens") ?? "research";
  if (!root || !repository) return NextResponse.json({ error: "root and repository are required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  if (!views.has(view) || !lenses.has(lens)) return NextResponse.json({ error: "unsupported graph view or lens" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await graphRead({
      root, repository, view: view as "canvas" | "node" | "ledger", lens: lens as GraphLens,
      kind: params.get("kind") ?? undefined, relation: params.get("relation") ?? undefined,
      trust: params.get("trust") ?? undefined, standing: params.get("standing") ?? undefined,
      q: params.get("q") ?? undefined, node: params.get("node") ?? undefined,
      cursor: params.get("cursor") ?? undefined,
      limit: params.has("limit") ? Number(params.get("limit")) : undefined,
    });
    return NextResponse.json(result, { headers: immutableProjectionHeaders(root, params.toString()) });
  } catch (error) {
    const { status, body } = projectionErrorAnswer(error, "graph projection failed");
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  }
}
