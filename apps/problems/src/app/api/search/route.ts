import { type NextRequest, NextResponse } from "next/server";
import { searchRead } from "@vela/projection-data/read-contracts";
import { immutableProjectionHeaders, projectionErrorAnswer } from "@/lib/projection-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const root = params.get("root");
  if (!root) return NextResponse.json({ error: "root is required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await searchRead({
      root, q: params.get("q") ?? undefined, repository: params.get("repository") ?? undefined,
      kind: params.get("kind") ?? undefined, standing: params.get("standing") ?? undefined,
      cursor: params.get("cursor") ?? undefined,
      limit: params.has("limit") ? Number(params.get("limit")) : undefined,
    });
    return NextResponse.json(result, { headers: immutableProjectionHeaders(root, params.toString()) });
  } catch (error) {
    const { status, body } = projectionErrorAnswer(error, "search projection failed");
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  }
}
