import { neon } from "./neon-client";
import type { HashRoot } from "./index";
import { ProjectionReadError } from "./refusal";
import { currentProjectionContract } from "./projection-contract";
import { repositoryKey, slugForRepositoryId } from "./registry";
import {
  buildSiteObjectContext,
  type ObjectContextDirection,
  type SiteObjectContext,
} from "./object-context";

function databaseUrl(): string {
  const value = process.env.VELA_PROJECTION_DATABASE_URL;
  if (!value) throw new Error("VELA_PROJECTION_DATABASE_URL is required for Problems reads");
  return value;
}
const sql = () => neon(databaseUrl());
export const currentProjectionManifestSchemaId = currentProjectionContract.manifestSchema;

function boundedLimit(value: number | undefined, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ProjectionReadError("invalid_limit", "invalid result limit");
  }
  return Math.min(value, maximum);
}

/**
 * The one gate every rooted read passes, and the four different answers it can
 * give.
 *
 * It used to ask a single yes-or-no question and report both a no-such-root and
 * a no-longer-retained as one string, which the HTTP layer then had to guess
 * apart. The three facts are separable in the same round trip, so this asks for
 * all three: whether any release carries the root and under which manifest
 * schema, whether that release was ever activated, and whether it is still
 * inside the retained window.
 */
export async function assertReadableRelease(root: string): Promise<HashRoot> {
  if (!/^sha256:[0-9a-f]{64}$/u.test(root)) {
    throw new ProjectionReadError("malformed_root", "malformed projection root");
  }
  const rows = await sql().query(`WITH retained AS (
      SELECT release.release_root
      FROM projection.releases release
      JOIN projection.releases current_entry
        ON current_entry.release_root = (
          SELECT release_root FROM projection.current_release WHERE singleton
        )
      WHERE release.activated_at IS NOT NULL
        AND release.activated_at <= current_entry.activated_at
      ORDER BY (release.release_root = current_entry.release_root) DESC,
        release.activated_at DESC, release.release_root DESC
      LIMIT 3
    ) SELECT
        (SELECT release.manifest ->> 'schema' FROM projection.releases release
          WHERE release.release_root = $1) AS stored_schema,
        (SELECT release.activated_at IS NOT NULL FROM projection.releases release
          WHERE release.release_root = $1) AS activated,
        EXISTS (SELECT 1 FROM retained WHERE retained.release_root = $1) AS retained`,
    [root]);
  const answer = rows[0] as { stored_schema: string | null; activated: boolean | null; retained: boolean } | undefined;
  if (!answer?.stored_schema) {
    throw new ProjectionReadError("unknown_root", "no projection carries this root");
  }
  /* Stored but never activated was never served, so it is not gone — it is a
     root the reader has no answer for, the same as one that was never written. */
  if (!answer.activated) {
    throw new ProjectionReadError("unknown_root", "projection root was never activated");
  }
  if (answer.stored_schema !== currentProjectionManifestSchemaId) {
    throw new ProjectionReadError(
      "foreign_manifest",
      `projection root carries ${answer.stored_schema}, which this reader does not read`,
    );
  }
  if (!answer.retained) {
    throw new ProjectionReadError("expired_root", "projection root is no longer retained");
  }
  return root as HashRoot;
}

export type GraphLens = "research" | "activity" | "all";
export interface GraphNodeRecord {
  id: string; kind: string; label: string; plane: string | null; trust: string | null;
  standing: string; href: string | null; x: number; y: number;
}
export interface GraphEdgeRecord {
  id: string; source: string; target: string; relation: string;
  trust: string | null; inferred: boolean; source_root: HashRoot | null;
  evidence: string | null;
}
export type GraphCanvasEdgeRecord = Omit<GraphEdgeRecord, "source_root" | "evidence">;
export interface GraphNeighborRecord extends GraphNodeRecord {
  edge_id: string; source: string; target: string;
  direction: ObjectContextDirection; relation: string; outgoing: boolean;
  edge_trust: string | null; inferred: boolean; source_root: HashRoot | null;
  evidence: string | null;
}

export interface GraphSelectedRecord extends GraphNodeRecord {
  content?: Record<string, unknown>;
}

const sha256Root = /^sha256:[0-9a-f]{64}$/u;
const internalHref = /^\/(?!\/)/u;

function rowRecord(input: unknown, label: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(`${label} must be an object`);
  }
  return input as Record<string, unknown>;
}

function requiredString(row: Record<string, unknown>, field: string, label: string): string {
  const value = row[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} ${field} must be a non-empty string`);
  }
  return value;
}

function nullableString(row: Record<string, unknown>, field: string, label: string): string | null {
  const value = row[field];
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`${label} ${field} must be a string or null`);
  return value;
}

function finiteNumber(row: Record<string, unknown>, field: string, label: string): number {
  const value = row[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} ${field} must be a finite number`);
  }
  return value;
}

function requiredBoolean(row: Record<string, unknown>, field: string, label: string): boolean {
  const value = row[field];
  if (typeof value !== "boolean") throw new Error(`${label} ${field} must be a boolean`);
  return value;
}

/**
 * A Proposal's destination is its record route.
 *
 * The projection still emits `/repositories/<slug>/proposals?proposal=<id>` for
 * Proposal nodes — 18 of them on the currently bound root, reaching readers
 * through the graph canvas, the search results and the command palette. That
 * query selected a Sheet on a page that no longer has one, so it resolves only
 * by being redirected, and a link that redirects is a link the reader waits on
 * and a crawler discounts. The generator upstream is where this belongs; until
 * it emits the record path, no href leaves this boundary still asking for it.
 */
const retiredProposalQuery = /^(\/repositories\/[^/?#]+)\/(?:proposals|review)\?proposal=([^&#]+)$/u;

export function recordHref(value: string): string {
  const retired = retiredProposalQuery.exec(value);
  if (retired) return `${retired[1]}/proposals/${retired[2]}`;
  return value;
}

function safeHref(row: Record<string, unknown>, label: string): string | null {
  const value = nullableString(row, "href", label);
  if (
    value !== null
    && (!internalHref.test(value) || value.includes("\\") || /[\u0000-\u001f\u007f]/u.test(value))
  ) {
    throw new Error(`${label} href must be a safe absolute application path`);
  }
  return value === null ? null : recordHref(value);
}

function nullableRoot(row: Record<string, unknown>, field: string, label: string): HashRoot | null {
  const value = nullableString(row, field, label);
  if (value !== null && !sha256Root.test(value)) {
    throw new Error(`${label} ${field} must be a full lowercase sha256 root or null`);
  }
  return value as HashRoot | null;
}



export function parseGraphNodeRecord(input: unknown): GraphNodeRecord {
  const label = "graph node";
  const row = rowRecord(input, label);
  return {
    id: requiredString(row, "id", label),
    kind: requiredString(row, "kind", label),
    label: requiredString(row, "label", label),
    plane: nullableString(row, "plane", label),
    trust: nullableString(row, "trust", label),
    standing: requiredString(row, "standing", label),
    href: safeHref(row, label),
    x: finiteNumber(row, "x", label),
    y: finiteNumber(row, "y", label),
  };
}

export function parseGraphEdgeRecord(input: unknown): GraphEdgeRecord {
  const label = "graph edge";
  const row = rowRecord(input, label);
  return {
    id: requiredString(row, "id", label),
    source: requiredString(row, "source", label),
    target: requiredString(row, "target", label),
    relation: requiredString(row, "relation", label),
    trust: nullableString(row, "trust", label),
    inferred: requiredBoolean(row, "inferred", label),
    source_root: nullableRoot(row, "source_root", label),
    evidence: nullableString(row, "evidence", label),
  };
}

export function parseGraphCanvasEdgeRecord(input: unknown): GraphCanvasEdgeRecord {
  const label = "graph canvas edge";
  const row = rowRecord(input, label);
  return {
    id: requiredString(row, "id", label),
    source: requiredString(row, "source", label),
    target: requiredString(row, "target", label),
    relation: requiredString(row, "relation", label),
    trust: nullableString(row, "trust", label),
    inferred: requiredBoolean(row, "inferred", label),
  };
}

export function parseGraphNeighborRecord(input: unknown): GraphNeighborRecord {
  const label = "graph neighbor";
  const row = rowRecord(input, label);
  const direction = requiredString(row, "direction", label);
  if (direction !== "outgoing" && direction !== "incoming") {
    throw new Error("graph neighbor direction must be outgoing or incoming");
  }
  const outgoing = requiredBoolean(row, "outgoing", label);
  if (outgoing !== (direction === "outgoing")) {
    throw new Error("graph neighbor direction and outgoing flag disagree");
  }
  return {
    ...parseGraphNodeRecord(row),
    edge_id: requiredString(row, "edge_id", label),
    source: requiredString(row, "source", label),
    target: requiredString(row, "target", label),
    direction,
    relation: requiredString(row, "relation", label),
    outgoing,
    edge_trust: nullableString(row, "edge_trust", label),
    inferred: requiredBoolean(row, "inferred", label),
    source_root: nullableRoot(row, "source_root", label),
    evidence: nullableString(row, "evidence", label),
  };
}

function parseGraphSelectedRecord(input: unknown): GraphSelectedRecord {
  const row = rowRecord(input, "selected graph node");
  const node = parseGraphNodeRecord(row);
  if (row.content === null || row.content === undefined) return node;
  return { ...node, content: rowRecord(row.content, "selected graph node content") };
}

function windowTotal(rows: unknown[], label: string): number {
  if (rows.length === 0) return 0;
  const totals = rows.map((input) => {
    const value = rowRecord(input, label).total;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${label} total must be a non-negative safe integer`);
    }
    return value;
  });
  if (totals.some((value) => value !== totals[0])) {
    throw new Error(`${label} rows disagree on total`);
  }
  return totals[0];
}
export interface GraphQuery {
  root: string; repository: string; view: "canvas" | "node" | "ledger";
  lens?: GraphLens; kind?: string; relation?: string; trust?: string;
  standing?: string; q?: string; node?: string; cursor?: string; limit?: number;
}

const researchKinds = ["problem", "claim", "artifact", "proposal", "verifier_attachment"];
/* The activity plane's own vocabulary, and deliberately not the product's.
   `producer`, `channel`, `lease` and `scout` are not product words either: the
   activity plane sits outside Vela authority, so what it names is what a
   workbench does rather than what the protocol governs.
   `attempt` here is the same notion that survives as `provenance.source_attempt`
   on a Submission — the producer's own handle for an execution. It is not the
   retired product word: PRODUCT.md retires **Attempt** as a destination and a
   thing a reader navigates to, which this never was. Deleting it from this list
   would narrow a lens, not finish a rename. */
const activityKinds = ["attempt", "producer", "channel", "lease", "commit", "intake", "scout", "proof_link_edit", "statement_edit", "prompt_authored"];

export async function graphRead(input: GraphQuery) {
  const root = await assertReadableRelease(input.root);
  const client = sql();
  const repositoryRows = await client.query("SELECT 1 FROM projection.repositories WHERE release_root=$1 AND repository_id=$2 LIMIT 1", [root, repositoryKey(input.repository)]);
  if (!repositoryRows[0]) throw new ProjectionReadError("unknown_repository", "unknown repository");
  const limit = boundedLimit(input.limit, input.view === "node" ? 100 : 5000, input.view === "node" ? 250 : 5000);
  /* A canvas anchored on a node IS that node's neighbourhood. Without this the
     canvas returned the whole repository — 4,057 nodes over 2,553 edges, which is
     at minimum 1,504 connected components at mean degree 1.26, so no layout can
     draw it as a map. Above roughly twenty vertices a node-link view loses to a
     table on every task except path-following, and path-following is exactly
     what an anchored neighbourhood is for. */
  const anchored = input.view === "canvas" && Boolean(input.node);
  const lensKinds = input.lens === "research" ? researchKinds : input.lens === "activity" ? activityKinds : [];
  const q = input.q?.trim().toLocaleLowerCase() ?? "";
  const cursor = input.cursor ?? "";
  const nodes = anchored ? [] : await client.query(`SELECT node_id AS id, kind,
      CASE WHEN $11 = 'canvas' THEN node_id ELSE label END AS label,
      plane, trust, standing, href, x, y,
      count(*) OVER()::integer AS total
    FROM projection.graph_nodes
    WHERE release_root=$1 AND repository_id=$2
      AND ($3::text[] = '{}' OR kind = ANY($3::text[]))
      AND ($4 = '' OR kind = $4) AND ($5 = '' OR COALESCE(trust, '') = $5)
      AND ($6 = '' OR standing = $6)
      AND ($7 = '' OR position($7 in lower(node_id || ' ' || label)) > 0)
      AND ($8 = '' OR node_id > $8)
      AND ($9 = '' OR EXISTS (
        SELECT 1 FROM projection.graph_edges e WHERE e.release_root=graph_nodes.release_root
          AND e.repository_id=graph_nodes.repository_id AND e.relation=$9
          AND (e.source_id=graph_nodes.node_id OR e.target_id=graph_nodes.node_id)
      ))
    ORDER BY node_id LIMIT $10`, [root, repositoryKey(input.repository), lensKinds, input.kind ?? "", input.trust ?? "", input.standing ?? "", q, cursor, input.relation ?? "", limit, input.view]);
  const selected = input.node
    ? await client.query(`SELECT node_id AS id, kind, label, plane, trust, standing, href, x, y, content
        FROM projection.graph_nodes WHERE release_root=$1 AND repository_id=$2 AND node_id=$3 LIMIT 1`, [root, repositoryKey(input.repository), input.node])
    : [];
  if (input.node && !selected[0]) throw new ProjectionReadError("unknown_node", "unknown graph node");
  const neighbors = selected[0]
    ? await client.query(`SELECT n.node_id AS id, n.kind, n.label, n.plane, n.trust, n.standing, n.href, n.x, n.y,
        e.edge_id, e.source_id AS source, e.target_id AS target,
        CASE WHEN e.source_id=$3 THEN 'outgoing' ELSE 'incoming' END AS direction,
        e.relation, e.source_id = $3 AS outgoing, e.trust AS edge_trust,
        e.inferred, e.source_root, e.evidence, count(*) OVER()::integer AS total
        FROM projection.graph_edges e JOIN projection.graph_nodes n
          ON n.release_root=e.release_root AND n.repository_id=e.repository_id
          AND n.node_id=CASE WHEN e.source_id=$3 THEN e.target_id ELSE e.source_id END
        WHERE e.release_root=$1 AND e.repository_id=$2 AND (e.source_id=$3 OR e.target_id=$3)
        ORDER BY e.relation, n.node_id LIMIT 250`, [root, repositoryKey(input.repository), input.node])
    : [];
  const nodeTotal = anchored ? 0 : windowTotal(nodes, "graph node");
  const neighborTotal = windowTotal(neighbors, "graph neighbor");
  const nodeRecords = nodes.map(parseGraphNodeRecord);
  const selectedRecord = selected[0] ? parseGraphSelectedRecord(selected[0]) : null;
  const neighborRecords = neighbors.map(parseGraphNeighborRecord);
  const visibleNodes = new Map(nodeRecords.map((node) => [node.id, node]));
  if (input.view === "canvas" && selectedRecord) {
    visibleNodes.set(selectedRecord.id, selectedRecord);
    for (const neighbor of neighborRecords) visibleNodes.set(neighbor.id, parseGraphNodeRecord(neighbor));
  }
  const nodeIds = [...visibleNodes.keys()];
  const edges = input.view === "canvas" && nodeIds.length
    ? await client.query(`SELECT edge_id AS id, source_id AS source, target_id AS target,
        relation, trust, inferred
        FROM projection.graph_edges WHERE release_root=$1 AND repository_id=$2
          AND source_id = ANY($3::text[]) AND target_id = ANY($3::text[])
          AND ($4 = '' OR relation = $4) ORDER BY edge_id`, [root, repositoryKey(input.repository), nodeIds, input.relation ?? ""])
    : [];
  const edgeRecords = edges.map(parseGraphCanvasEdgeRecord);
  const objectContext: SiteObjectContext | null = selectedRecord
    ? buildSiteObjectContext({
        root,
        repository: input.repository,
        object: parseGraphNodeRecord(selectedRecord),
        related: neighborRecords.map(parseGraphNodeRecord),
        edges: neighborRecords.map((neighbor) => ({
          id: neighbor.edge_id,
          source: neighbor.source,
          target: neighbor.target,
          relation: neighbor.relation,
          trust: neighbor.edge_trust,
          inferred: neighbor.inferred,
          source_root: neighbor.source_root,
          evidence: neighbor.evidence,
        })),
        relationship_total: neighborTotal,
      })
    : null;
  return {
    schema: "vela.projection-graph.v1" as const, root, repository: input.repository,
    view: input.view, lens: input.lens ?? "all", total: anchored ? visibleNodes.size : nodeTotal,
    next_cursor: nodeRecords.length === limit ? nodeRecords.at(-1)?.id ?? null : null,
    nodes: [...visibleNodes.values()],
    edges: edgeRecords, selected: selectedRecord,
    neighbor_total: neighborTotal,
    neighbors: neighborRecords,
    object_context: objectContext,
  };
}

export interface SearchReadQuery {
  root: string; q?: string; repository?: string; kind?: string; standing?: string; cursor?: string; limit?: number;
}

/* `covering system` matched 22 records and `system covering` matched none.
   The predicate was one `position($2 in search_text) > 0`, so the query was a
   single substring and the words had to be adjacent, in that order. Splitting on
   whitespace and requiring each term separately is what a reader already assumes
   typing two words does.

   Not a tsquery. The Postgres parser splits `vcl_8ef85f` into `vcl` and the hex,
   and keeps `Erdos730.FullDensityTheorem.pairSet` whole, so a search for
   `pairset` matches 2 records by substring and 0 by any tsquery — a prefix
   cannot reach inside a token. On a corpus of qualified Lean names that loss is
   the common case, not the edge case. */
const searchTerms = (q: string) => q.split(/\s+/u).filter(Boolean);

export async function searchRead(input: SearchReadQuery) {
  const root = await assertReadableRelease(input.root);
  if (input.repository) {
    const repository = await sql().query("SELECT 1 FROM projection.repositories WHERE release_root=$1 AND repository_id=$2 LIMIT 1", [root, repositoryKey(input.repository)]);
    if (!repository[0]) throw new ProjectionReadError("unknown_repository", "unknown repository");
  }
  const q = input.q?.trim().toLocaleLowerCase() ?? "";
  const terms = searchTerms(q);
  const limit = boundedLimit(input.limit, 100, 250);
  /* A keyset cursor orders by the key it pages on, and ranked results are not
     ordered by that key. Emitting one anyway would hand a caller a cursor that
     silently skips and repeats rows, so a ranked read says it has no next page
     rather than lying about where it is. Browsing with no query is unranked and
     keeps the cursor it always had. */
  const ranked = terms.length > 0;
  const client = sql();
  const [rows, releaseRows] = await Promise.all([
    client.query(`SELECT kind, repository_id, document_id AS id,
      assertion, source_title, standing, href, count(*) OVER()::integer AS total
    FROM projection.search_documents WHERE release_root=$1
      AND (cardinality($2::text[]) = 0
           OR (SELECT bool_and(position(term in search_text) > 0) FROM unnest($2::text[]) AS term))
      AND ($3='' OR repository_id=$3) AND ($4='' OR kind=$4) AND ($5='' OR standing=$5)
      AND ($6='' OR (repository_id || ':' || kind || ':' || document_id) > $6)
    ORDER BY
      /* Rank first, and prefix the lexemes so the stemming this corpus cannot
         use is not needed to match a plural: the records say "covering systems"
         and a reader types "covering system". quote_literal is what makes
         assembling a tsquery from user input safe — a term becomes one quoted
         lexeme, so an embedded quote is doubled and every operator inside it is
         literal text. Ranking only, never matching: the predicate above already
         decided the set, and a term the parser drops entirely just ranks 0. */
      ts_rank(
        to_tsvector('simple', search_text),
        to_tsquery('simple', (SELECT string_agg(quote_literal(term) || ':*', ' & ')
                              FROM unnest($2::text[]) AS term))
      ) DESC,
      /* A short record carrying the terms is a stronger hit than a long one that
         happens to contain them, and it settles the ties rank leaves. */
      length(search_text),
      repository_id, kind, document_id
    LIMIT $7`, [root, terms, input.repository ? repositoryKey(input.repository) : "", input.kind ?? "", input.standing ?? "", ranked ? "" : (input.cursor ?? ""), limit]),
    client.query("SELECT manifest->>'generated_at' AS generated_at FROM projection.releases WHERE release_root=$1 LIMIT 1", [root]),
  ]);
  return {
    schema: "site.search-index.v1" as const, generated_at: String(releaseRows[0].generated_at), bundle_root: root,
    total: rows[0]?.total ?? 0,
    /* The cursor pages on the key the ORDER BY uses, so it carries the
       repository id — not the handle the records below are given. Building it
       from the handle would page against a column nothing is sorted by. */
    next_cursor: !ranked && rows.length === limit
      ? `${rows.at(-1)?.repository_id}:${rows.at(-1)?.kind}:${rows.at(-1)?.id}`
      : null,
    records: rows.map(({ total: _total, repository_id, ...row }) => ({
      ...row,
      repository: slugForRepositoryId(String(repository_id)) ?? String(repository_id),
      href: typeof row.href === "string" ? recordHref(row.href) : row.href,
    })),
  };
}
