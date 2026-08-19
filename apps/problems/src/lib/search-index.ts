import type { SiteCompositeSearchIndex } from "@vela/projection-data";

const cache = new Map<string, Promise<SiteCompositeSearchIndex>>();
export function loadSearchIndex(projectionRoot: string, searchRoot: string, collectionRoot: string, filters: { q?: string; repository?: string; collection?: string; kind?: string; standing?: string } = {}): Promise<SiteCompositeSearchIndex> {
  const params = new URLSearchParams({ root: projectionRoot, search_root: searchRoot, limit: "250" });
  for (const key of ["q", "repository", "collection", "kind", "standing"] as const) if (filters[key]) params.set(key, filters[key]);
  const href = `/api/search?${params}`;
  const existing = cache.get(href);
  if (existing) return existing;
  const request = fetch(href, { cache: "force-cache", credentials: "omit" }).then(async (response) => {
    if (!response.ok) throw new Error(`search projection returned HTTP ${response.status}`);
    const value = await response.json() as Partial<SiteCompositeSearchIndex>;
    if (
      value.schema !== "site.composite-search-index.v1"
      || value.projection_root !== projectionRoot
      || value.search_root !== searchRoot
      || response.headers.get("X-Vela-Projection-Root") !== projectionRoot
      || response.headers.get("X-Vela-Collection-Root") !== collectionRoot
      || response.headers.get("X-Vela-Search-Root") !== searchRoot
      || value.supplemental_collections?.length !== 1
      || value.supplemental_collections[0]?.collection_id !== "formal-conjectures"
      || value.supplemental_collections[0]?.collection_root !== collectionRoot
      || !Array.isArray(value.records)
    ) throw new Error("composite search identity is invalid");
    return value as SiteCompositeSearchIndex;
  }).catch((error) => { cache.delete(href); throw error; });
  cache.set(href, request);
  return request;
}
