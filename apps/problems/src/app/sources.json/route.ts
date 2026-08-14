import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { mathSourceRegistryRead } from "@vela/projection-data";
import { projectionRefusal } from "@vela/projection-data/refusal";
import { projectionErrorAnswer } from "@/lib/projection-response";

export const dynamic = "force-dynamic";
const sourceIdPattern = /^source:[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const nativeKindPattern = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/u;

function boundedParam(
  params: URLSearchParams,
  name: string,
  maximumLength: number,
): string | undefined {
  const value = params.get(name)?.trim();
  if (!value) return undefined;
  if (value.length > maximumLength) {
    throw new Error(`${name} is malformed`);
  }
  return value;
}

function immutableHeaders(root: string, query: string) {
  return {
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${root.slice(7)}-${createHash("sha256").update(query).digest("hex").slice(0, 16)}"`,
    "X-Vela-Projection-Root": root,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const root = params.get("root")?.trim();
  if (!root) {
    return NextResponse.json(
      { error: "root is required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const sourceId = params.get("source")?.trim() || undefined;
  if (sourceId && !sourceIdPattern.test(sourceId)) {
    return NextResponse.json(
      { error: "source is malformed" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const include = params.get("include");
  if (include && include !== "records") {
    return NextResponse.json(
      { error: "include must be records when present" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const nativeId = boundedParam(params, "native_id", 512);
    const query = boundedParam(params, "q", 160);
    const nativeKind = boundedParam(params, "kind", 80);
    const repositorySlug = boundedParam(params, "repository", 80);
    if (nativeKind && !nativeKindPattern.test(nativeKind)) {
      throw new Error("kind is malformed");
    }
    if (repositorySlug && !slugPattern.test(repositorySlug)) {
      throw new Error("repository is malformed");
    }
    const includeRecords = include === "records" || Boolean(
      nativeId || query || nativeKind || repositorySlug,
    );
    const cursor = boundedParam(params, "cursor", 2_048);
    const bindingCursor = boundedParam(params, "binding", 2_048);
    const result = await mathSourceRegistryRead({
      root,
      sourceId,
      nativeId,
      nativeKind,
      query,
      repositorySlug,
      includeRecords,
      cursor,
      bindingCursor,
      limit: 100,
    });
    const headers = immutableHeaders(result.release_root, params.toString());

    if (sourceId && result.sources.length === 0) {
      return NextResponse.json(
        {
          error: "unknown source",
          release_root: result.release_root,
          source_id: sourceId,
        },
        { status: 404, headers },
      );
    }

    return NextResponse.json(result, { headers });
  } catch (error) {
    /* A refusal from the read contracts answers with its own code; this route's
       own `${name} is malformed` throws carry none, and a bad parameter is the
       caller's. Everything left is this endpoint failing, which is a 503. */
    const refusal = projectionRefusal(error);
    const message = error instanceof Error ? error.message : "Source inventory read failed";
    const { status, body } = refusal !== null
      ? projectionErrorAnswer(error, message)
      : { status: message.includes("malformed") ? 400 : 503, body: { error: message } };
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  }
}
