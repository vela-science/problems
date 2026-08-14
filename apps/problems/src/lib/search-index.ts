import type { SiteSearchIndex } from "@vela/projection-data";

const cache = new Map<string, Promise<SiteSearchIndex>>();
export function loadSearchIndex(projectionRoot: string, filters: { q?: string; repository?: string; kind?: string; standing?: string } = {}): Promise<SiteSearchIndex> {
  const params = new URLSearchParams({ root: projectionRoot, limit: "250" });
  for (const key of ["q", "repository", "kind", "standing"] as const) if (filters[key]) params.set(key, filters[key]);
  const href = `/api/search?${params}`;
  const existing = cache.get(href);
  if (existing) return existing;
  const request = fetch(href, { cache: "force-cache", credentials: "omit" }).then(async (response) => {
    if (!response.ok) throw new Error(`search projection returned HTTP ${response.status}`);
    if (response.headers.get("X-Vela-Projection-Root") !== projectionRoot) throw new Error("search response projection header is invalid");
    const value = await response.json() as Partial<SiteSearchIndex>;
    if (value.schema !== "site.search-index.v1" || value.bundle_root !== projectionRoot || !Array.isArray(value.records)) throw new Error("search projection identity is invalid");
    return value as SiteSearchIndex;
  }).catch((error) => { cache.delete(href); throw error; });
  cache.set(href, request);
  return request;
}
