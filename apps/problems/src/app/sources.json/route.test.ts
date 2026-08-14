import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
/* Referenced inside the hoisted mock's function body, not in the factory that
   builds it, so the binding is initialized by the time anything calls it. The
   refusal module is a separate entry point and is not mocked. */
import { ProjectionReadError } from "@vela/projection-data/refusal";

const mocks = vi.hoisted(() => {
  const releaseRoot = `sha256:${"a".repeat(64)}`;
  return {
    releaseRoot,
    read: vi.fn(async ({
      root,
      sourceId,
      cursor,
    }: {
      root?: string;
      sourceId?: string;
      nativeId?: string;
      nativeKind?: string;
      query?: string;
      repositorySlug?: string;
      includeRecords?: boolean;
      cursor?: string;
      bindingCursor?: string;
      limit?: number;
    } = {}) => {
      /* The real read throws a coded refusal, and the route branches on the
         code rather than on the sentence. A mock that throws a bare Error would
         let this test pass against a route that had lost the mapping. */
      if (cursor === "bogus") {
        throw new ProjectionReadError("invalid_cursor", "invalid Math Source Registry native cursor");
      }
      return {
      schema: "vela.math-source-registry-read.v1" as const,
      release_root: root ?? releaseRoot,
      source_registry: {
        schema: "vela.math-source-registry-release.v1" as const,
        declaration_root: `sha256:${"b".repeat(64)}`,
        observation_bundle_root: `sha256:${"c".repeat(64)}`,
        source_count: 1,
        observation_count: 1,
        native_record_count: 1,
        release_source_count: 1,
        repository_binding_count: 1,
      },
      sources: sourceId === "source:missing"
        ? []
        : [{ declaration: { source_id: "source:fixture" } }],
      native_records: [],
      repository_bindings: [],
      };
    }),
  };
});

vi.mock("@vela/projection-data", () => ({
  mathSourceRegistryRead: mocks.read,
}));

import { GET } from "./route";

describe("Source inventory JSON twin", () => {
  beforeEach(() => mocks.read.mockClear());

  test("returns the current exact-root read contract", async () => {
    const response = await GET(new NextRequest(
      `https://problems.science/sources.json?root=${encodeURIComponent(mocks.releaseRoot)}`,
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers.get("etag")).toMatch(/^"[a-f0-9]+-[a-f0-9]+"$/u);
    expect(response.headers.get("x-vela-projection-root")).toBe(mocks.releaseRoot);
    expect(body.schema).toBe("vela.math-source-registry-read.v1");
    expect(body.release_root).toBe(mocks.releaseRoot);
    expect(body.sources[0].declaration.source_id).toBe("source:fixture");
  });

  test("returns a rooted 404 for an unknown exact source", async () => {
    const response = await GET(new NextRequest(
      `https://problems.science/sources.json?root=${encodeURIComponent(mocks.releaseRoot)}&source=source%3Amissing`,
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("x-vela-projection-root")).toBe(mocks.releaseRoot);
    expect(body.source_id).toBe("source:missing");
    expect(mocks.read).toHaveBeenCalledWith({
      root: mocks.releaseRoot,
      sourceId: "source:missing",
      nativeId: undefined,
      nativeKind: undefined,
      query: undefined,
      repositorySlug: undefined,
      includeRecords: false,
      cursor: undefined,
      bindingCursor: undefined,
      limit: 100,
    });
  });

  test("opts into bounded source-native objects and Repository bindings", async () => {
    await GET(new NextRequest(
      `https://problems.science/sources.json?root=${encodeURIComponent(mocks.releaseRoot)}&source=source%3Afixture&include=records&cursor=native-cursor&binding=binding-cursor`,
    ));

    expect(mocks.read).toHaveBeenCalledWith({
      root: mocks.releaseRoot,
      sourceId: "source:fixture",
      nativeId: undefined,
      nativeKind: undefined,
      query: undefined,
      repositorySlug: undefined,
      includeRecords: true,
      cursor: "native-cursor",
      bindingCursor: "binding-cursor",
      limit: 100,
    });
  });

  test("exposes bounded root-bound native-record lookup filters", async () => {
    await GET(new NextRequest(
      `https://problems.science/sources.json?root=${encodeURIComponent(mocks.releaseRoot)}&native_id=formal-conjectures%3AErdos505&q=lower+density&kind=formal_theorem&repository=formal-conjectures`,
    ));

    expect(mocks.read).toHaveBeenCalledWith({
      root: mocks.releaseRoot,
      sourceId: undefined,
      nativeId: "formal-conjectures:Erdos505",
      nativeKind: "formal_theorem",
      query: "lower density",
      repositorySlug: "formal-conjectures",
      includeRecords: true,
      cursor: undefined,
      bindingCursor: undefined,
      limit: 100,
    });
  });

  test("requires a root and maps malformed cursors to a client error", async () => {
    const missingRoot = await GET(new NextRequest(
      "https://problems.science/sources.json",
    ));
    expect(missingRoot.status).toBe(400);

    const malformedCursor = await GET(new NextRequest(
      `https://problems.science/sources.json?root=${encodeURIComponent(mocks.releaseRoot)}&include=records&cursor=bogus`,
    ));
    expect(malformedCursor.status).toBe(400);
    expect(malformedCursor.headers.get("cache-control")).toBe("no-store");

    const malformedSource = await GET(new NextRequest(
      `https://problems.science/sources.json?root=${encodeURIComponent(mocks.releaseRoot)}&source=not-a-source`,
    ));
    expect(malformedSource.status).toBe(400);

    const malformedKind = await GET(new NextRequest(
      `https://problems.science/sources.json?root=${encodeURIComponent(mocks.releaseRoot)}&kind=not%20a%20kind`,
    ));
    expect(malformedKind.status).toBe(400);
  });
});
