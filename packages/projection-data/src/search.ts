import type { HashRoot } from "./index";

export interface SiteSearchRecord {
  kind: string;
  repository: string;
  id: string;
  assertion: string;
  source_title: string | null;
  standing: string;
  /** Source-owned status for a Problem occurrence, kept separate from any Repository-local Result. */
  source_status?: string | null;
  /** Repository-local Result standing for a Problem, absent when no Result is bound. */
  result_standing?: string | null;
  /* The formal statement, when the assertion above is the written question.
   *
   * Both are retained and both are wanted: the question is what a reader
   * searched for, the formal statement is what a prover works against and is
   * often what actually matched. Absent when there is no formal statement, or
   * when it is already the assertion. */
  formal_statement?: string | null;
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
