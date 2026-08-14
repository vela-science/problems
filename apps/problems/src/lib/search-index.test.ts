import { afterEach, describe, expect, test, vi } from "vitest";
import { loadSearchIndex } from "./search-index";

const rootA = `sha256:${"a".repeat(64)}`;
const rootB = `sha256:${"b".repeat(64)}`;

function response(root: string, header = root) {
  return new Response(JSON.stringify({
    schema: "site.search-index.v1",
    generated_at: "2026-07-21T00:00:00Z",
    bundle_root: root,
    records: [],
  }), { headers: { "Content-Type": "application/json", "X-Vela-Projection-Root": header } });
}

afterEach(() => vi.unstubAllGlobals());

describe("root-bound search projection", () => {
  test("requests and caches each exact projection independently", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const requested = new URL(String(input), "https://problems.science").searchParams.get("root");
      return Promise.resolve(response(requested === rootA ? rootA : rootB));
    });
    vi.stubGlobal("fetch", fetch);

    await loadSearchIndex(rootA);
    await loadSearchIndex(rootA);
    await loadSearchIndex(rootB);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith(`/api/search?root=${encodeURIComponent(rootA)}&limit=250`, expect.objectContaining({ credentials: "omit", cache: "force-cache" }));
    expect(fetch).toHaveBeenCalledWith(`/api/search?root=${encodeURIComponent(rootB)}&limit=250`, expect.objectContaining({ credentials: "omit", cache: "force-cache" }));
  });

  test("rejects a response whose projection header drifts", async () => {
    const root = `sha256:${"c".repeat(64)}`;
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(response(root, rootA))));
    await expect(loadSearchIndex(root)).rejects.toThrow("projection header is invalid");
  });
});
