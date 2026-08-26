/* What the browser agent is allowed to know about the open Problem.
 *
 * The server resolves every fact here and passes it down as one serialized
 * prop, the way `RememberObject` takes an already-computed title rather than
 * scraping `document.title`. A tool that re-derived its own answer from the DOM
 * would be answering about the rendering, not about the projection, and the
 * whole point of this interface is that an agent reads exact state rather than
 * pixels.
 *
 * It is deliberately smaller than the page. Assertions are long, claim records
 * carry whole Lean declarations, and a tool result that pastes all of it costs
 * the model its context for no gain. Everything here is either an identity, an
 * exact root, a state word, or prose a reader would actually quote. */

export type WebMcpVerification = {
  id: string;
  outcome: string;
  property: string | null;
  /** What passing this check still does not establish. Never omitted. */
  does_not_establish: string[];
  verifier: string;
  completed_at: string | null;
};

export type WebMcpDecision = {
  provenance: string;
  decided_by: string | null;
  /** `human` or `agent`. Who performed it, not what it authorised. */
  performer_class: string | null;
  decided_at: string | null;
  reason: string | null;
  event_id: string | null;
  applied_event_id: string | null;
};

export type WebMcpLineage = {
  submission_id: string | null;
  proposal_id: string;
  proposal_status: string;
  verifications: WebMcpVerification[];
  decision: WebMcpDecision | null;
};

export type WebMcpClaim = {
  id: string;
  root: string | null;
  standing: string;
  assertion: string;
  assertion_type: string;
  conditions: string[];
  evidence_count: number;
  /** Source-reported flags. Neither is a Standing word. */
  contested: boolean;
  retracted: boolean;
  is_current: boolean;
  lineages: WebMcpLineage[];
  /** `corrects` / `supersedes` edges this claim asserts over a predecessor. */
  corrections: Array<{ kind: string; target_claim_id: string }>;
};

export type WebMcpSourceOccurrence = {
  source_id: string;
  native_id: string;
  native_kind: string;
  role: string;
  locator: string | null;
};

export type WebMcpProblemContext = {
  schema: "vela.webmcp-problem-context.v1";
  /** The address a reader would share. */
  route: string;
  repository: string;
  problem: string;
  collection: string;
  label: string;
  question: string;
  statement_kind: string;
  declared_status: string;
  formalized: boolean;
  tags: string[];
  /* Exact roots. Every mutation carries the anchor root back so the server can
     refuse work aimed at state that has since moved. */
  release_root: string;
  anchor_root: string;
  problem_record_root: string;
  repository_root: string;
  source_commit: string;
  current_claim_id: string | null;
  claims: WebMcpClaim[];
  sources: WebMcpSourceOccurrence[];
  /* Roots the search tool needs to prove the index it received is the index it
     asked for. */
  search: { search_root: string; collection_root: string } | null;
};

/** The workspace facts a write tool needs, resolved on the client. */
export type WebMcpWorkContext = {
  accountsEnabled: boolean;
  signedIn: boolean;
  workspaceId: string | null;
};
