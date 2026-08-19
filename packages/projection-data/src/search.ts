import type { HashRoot } from "./index";

export interface SiteSearchRecord {
  kind: string;
  repository: string;
  id: string;
  assertion: string;
  source_title: string | null;
  standing: string;
  href: string;
}

export interface SiteSearchIndex {
  schema: "site.search-index.v1";
  generated_at: string;
  bundle_root: HashRoot;
  total?: number;
  next_cursor?: string | null;
  records: SiteSearchRecord[];
}

export interface SiteCompositeSearchIndex {
  schema: "site.composite-search-index.v1";
  search_root: HashRoot;
  projection_root: HashRoot;
  projection_generated_at: string;
  supplemental_collections: Array<{
    collection_id: string;
    collection_root: HashRoot;
  }>;
  total: number;
  next_cursor: string | null;
  records: SiteSearchRecord[];
}
