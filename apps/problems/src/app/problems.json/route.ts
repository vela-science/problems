import { type NextRequest, NextResponse } from "next/server";
import { nativeProblemSourceRead, problemResolutionConfigRoot } from "@vela/projection-data";
import { projectionRefusal } from "@vela/projection-data/refusal";
import { projectionErrorAnswer } from "@/lib/projection-response";

export const dynamic = "force-dynamic";

const sourceIdPattern = /^source:[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const nativeKindPattern = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/u;

function currentReadHeaders(root: string, resolverRoot: string) {
  return {
    "Cache-Control": "no-store",
    "X-Vela-Projection-Root": root,
    "X-Vela-Resolver-Root": resolverRoot,
  };
}

class ProblemSourceRequestError extends Error {}

function bounded(params: URLSearchParams, name: string, maximum: number): string {
  const value = params.get(name)?.trim() ?? "";
  if (!value || value.length > maximum) throw new ProblemSourceRequestError(`${name} is malformed`);
  return value;
}

/** Current, exact-root-labelled machine twin for one Problem source set.
 * Resolver configuration and read code are deployment-owned, so this endpoint
 * deliberately refuses storage instead of claiming historical immutability. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const root = params.get("root")?.trim();
  if (!root) {
    return NextResponse.json({ error: "root is required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const resolverRoot = bounded(params, "resolver", 71);
    if (resolverRoot !== problemResolutionConfigRoot) {
      return NextResponse.json(
        { error: "resolver root does not match this deployment", resolver_root: resolverRoot },
        { status: 409, headers: { "Cache-Control": "no-store", "X-Vela-Resolver-Root": problemResolutionConfigRoot } },
      );
    }
    const sourceId = bounded(params, "source", 96);
    const nativeId = bounded(params, "native_id", 512);
    const nativeKind = bounded(params, "kind", 80);
    if (!sourceIdPattern.test(sourceId)) throw new ProblemSourceRequestError("source is malformed");
    if (!nativeKindPattern.test(nativeKind)) throw new ProblemSourceRequestError("kind is malformed");
    const sources = await nativeProblemSourceRead({
      root,
      sourceId,
      nativeId,
      nativeKind,
      candidateLimit: 250,
    });
    const headers = currentReadHeaders(root, resolverRoot);
    if (!sources) {
      return NextResponse.json({ error: "unknown source occurrence", release_root: root, source_id: sourceId, native_id: nativeId }, { status: 404, headers });
    }
    /* `vela.problem-source-read.v1` owns these exact semantics; widening or
       renaming its output requires a schema bump. */
    return NextResponse.json(sources, { headers });
  } catch (error) {
    const refusal = projectionRefusal(error);
    const { status, body } = refusal !== null
      ? projectionErrorAnswer(error, "Problem source read refused")
      : error instanceof ProblemSourceRequestError
        ? { status: 400 as const, body: { error: error.message } }
        : { status: 503 as const, body: { error: "Problem source read unavailable" } };
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  }
}
