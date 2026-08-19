import { afterEach, describe, expect, test, vi } from "vitest";
import { formalConjecturesCollectionRoot } from "@vela/projection-data";
import { loadSearchIndex } from "./search-index";

const rootA = `sha256:${"a".repeat(64)}`;
const rootB = `sha256:${"b".repeat(64)}`;
const collectionRoot = formalConjecturesCollectionRoot;

function response(root: string, {
  projectionHeader = root,
  collectionHeader = collectionRoot,
  searchHeader = root,
  supplementalRoot = collectionRoot,
}: {
  projectionHeader?: string;
  collectionHeader?: string | null;
  searchHeader?: string;
  supplementalRoot?: string;
} = {}) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-Vela-Projection-Root": projectionHeader,
    "X-Vela-Search-Root": searchHeader,
  });
  if (collectionHeader !== null) headers.set("X-Vela-Collection-Root", collectionHeader);
  return new Response(JSON.stringify({
    schema: "site.composite-search-index.v1",
    projection_generated_at: "2026-07-21T00:00:00Z",
    projection_root: root,
    search_root: root,
    supplemental_collections: [{ collection_id: "formal-conjectures", collection_root: supplementalRoot }],
    total: 0,
    next_cursor: null,
    records: [],
  }), { headers });
}

afterEach(() => vi.unstubAllGlobals());

describe("root-bound search projection", () => {
  test("requests and caches each exact projection independently", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const requested = new URL(String(input), "https://problems.science").searchParams.get("root");
      return Promise.resolve(response(requested === rootA ? rootA : rootB));
    });
    vi.stubGlobal("fetch", fetch);

    await loadSearchIndex(rootA, rootA, collectionRoot);
    await loadSearchIndex(rootA, rootA, collectionRoot);
    await loadSearchIndex(rootB, rootB, collectionRoot);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith(`/api/search?root=${encodeURIComponent(rootA)}&search_root=${encodeURIComponent(rootA)}&limit=250`, expect.objectContaining({ credentials: "omit", cache: "force-cache" }));
    expect(fetch).toHaveBeenCalledWith(`/api/search?root=${encodeURIComponent(rootB)}&search_root=${encodeURIComponent(rootB)}&limit=250`, expect.objectContaining({ credentials: "omit", cache: "force-cache" }));
  });

  test("rejects a response whose projection header drifts", async () => {
    const root = `sha256:${"c".repeat(64)}`;
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(response(root, { projectionHeader: rootA }))));
    await expect(loadSearchIndex(root, root, collectionRoot)).rejects.toThrow("composite search identity is invalid");
  });

  test.each([
    ["missing supplemental header", { collectionHeader: null }],
    ["drifted supplemental header", { collectionHeader: rootA }],
    ["drifted supplemental body", { supplementalRoot: rootA }],
  ])("rejects %s", async (_label, overrides) => {
    const root = `sha256:${"e".repeat(64)}`;
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(response(root, overrides))));
    await expect(loadSearchIndex(root, root, collectionRoot)).rejects.toThrow("composite search identity is invalid");
  });

  test("forwards the collection-qualified filter to the rooted endpoint", async () => {
    const root = `sha256:${"d".repeat(64)}`;
    const fetch = vi.fn(() => Promise.resolve(response(root)));
    vi.stubGlobal("fetch", fetch);

    await loadSearchIndex(root, root, collectionRoot, { q: "oppermann", collection: "formal-conjectures", kind: "problem" });

    expect(fetch).toHaveBeenCalledWith(
      `/api/search?root=${encodeURIComponent(root)}&search_root=${encodeURIComponent(root)}&limit=250&q=oppermann&collection=formal-conjectures&kind=problem`,
      expect.objectContaining({ credentials: "omit", cache: "force-cache" }),
    );
  });
});
