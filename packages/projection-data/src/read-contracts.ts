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

/* Timestamp columns arrive as Date objects from the live driver and as ISO
   strings from fixtures; both are the same instant. */
function nullableInstant(row: Record<string, unknown>, field: string, label: string): string | null {
  const value = row[field];
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") throw new Error(`${label} ${field} must be a timestamp or null`);
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
          AND ($12 <> 'research' OR e.inferred = false)
          AND (e.source_id=graph_nodes.node_id OR e.target_id=graph_nodes.node_id)
      ))
    ORDER BY node_id LIMIT $10`, [root, repositoryKey(input.repository), lensKinds, input.kind ?? "", input.trust ?? "", input.standing ?? "", q, cursor, input.relation ?? "", limit, input.view, input.lens ?? "all"]);
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
          AND ($4 <> 'research' OR e.inferred = false)
        ORDER BY e.relation, n.node_id LIMIT 250`, [root, repositoryKey(input.repository), input.node, input.lens ?? "all"])
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
          AND ($4 = '' OR relation = $4)
          AND ($5 <> 'research' OR inferred = false)
          ORDER BY edge_id`, [root, repositoryKey(input.repository), nodeIds, input.relation ?? "", input.lens ?? "all"])
    : [];
  const edgeRecords = edges.map(parseGraphCanvasEdgeRecord);
  if (input.lens === "research" && (
    neighborRecords.some((neighbor) => neighbor.inferred)
    || edgeRecords.some((edge) => edge.inferred)
  )) {
    throw new Error("research map contains an inferred relationship");
  }
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

export const frontierObjectKinds = [
  "problem", "occurrence", "claim", "proposal", "submission",
  "verification", "transition", "artifact", "external_reference",
] as const;
export type FrontierObjectKind = typeof frontierObjectKinds[number];

export const frontierRelations = [
  "occurrence_of", "formalizes", "evidence_for", "verified_by", "proposed_by",
  "decided_by", "corrects", "supersedes", "state_change",
  "external_dependency", "grouped_with",
] as const;
export type FrontierRelation = typeof frontierRelations[number];

export const frontierBases = [
  "source_asserted", "mechanically_verified", "authority_decided",
  "exact_derivation", "heuristic_advisory",
] as const;
export type FrontierBasis = typeof frontierBases[number];

export interface FrontierEdgeRecord {
  edge_id: string;
  problem_entity_id: string | null;
  repository_id: string | null;
  source_kind: FrontierObjectKind;
  source_ref: string;
  source_root: HashRoot | null;
  target_kind: FrontierObjectKind;
  target_ref: string;
  target_root: HashRoot | null;
  relation: FrontierRelation;
  basis: FrontierBasis;
  basis_ref: Record<string, unknown>;
  nonclaims: string[];
  row_root: HashRoot;
}

function enumerated<Value extends string>(
  row: Record<string, unknown>,
  field: string,
  values: readonly Value[],
  label: string,
): Value {
  const value = requiredString(row, field, label);
  if (!(values as readonly string[]).includes(value)) {
    throw new Error(`${label} ${field} carries unknown value ${value}`);
  }
  return value as Value;
}

function requiredRoot(row: Record<string, unknown>, field: string, label: string): HashRoot {
  const value = requiredString(row, field, label);
  if (!sha256Root.test(value)) {
    throw new Error(`${label} ${field} must be a full lowercase sha256 root`);
  }
  return value as HashRoot;
}

export function parseFrontierEdgeRecord(input: unknown): FrontierEdgeRecord {
  const label = "frontier edge";
  const row = rowRecord(input, label);
  const nonclaims = row.nonclaims;
  if (!Array.isArray(nonclaims) || nonclaims.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} nonclaims must be an array of strings`);
  }
  return {
    edge_id: requiredString(row, "edge_id", label),
    problem_entity_id: nullableString(row, "problem_entity_id", label),
    repository_id: nullableString(row, "repository_id", label),
    source_kind: enumerated(row, "source_kind", frontierObjectKinds, label),
    source_ref: requiredString(row, "source_ref", label),
    source_root: nullableRoot(row, "source_root", label),
    target_kind: enumerated(row, "target_kind", frontierObjectKinds, label),
    target_ref: requiredString(row, "target_ref", label),
    target_root: nullableRoot(row, "target_root", label),
    relation: enumerated(row, "relation", frontierRelations, label),
    basis: enumerated(row, "basis", frontierBases, label),
    basis_ref: rowRecord(row.basis_ref, `${label} basis_ref`),
    nonclaims: nonclaims as string[],
    row_root: requiredRoot(row, "row_root", label),
  };
}

/**
 * A gap is a derived reading of the bounded edge window, never a stored row:
 * what the frontier is missing is a function of what it currently holds, so
 * storing it would only let the two drift.
 */
export type ProblemFrontierGap =
  | {
      kind: "occurrence_without_accepted_claim";
      problem_entity_id: string;
      occurrence_ref: string;
    }
  | {
      kind: "unresolved_equivalence";
      problem_entity_id: string;
      occurrence_ref: string;
      nonclaims: string[];
    }
  | {
      kind: "verification_nonclaim";
      problem_entity_id: string | null;
      verification_ref: string;
      nonclaims: string[];
    };

const occurrenceRelations: readonly FrontierRelation[] = ["occurrence_of", "grouped_with", "formalizes"];

export function deriveProblemFrontierGaps(edges: FrontierEdgeRecord[]): ProblemFrontierGap[] {
  /* An entity counts as carrying an accepted Claim when a Decision-based edge
     says so: accepted evidence, or an exact transition that added the Claim to
     the accepted set. */
  const acceptedEntities = new Set<string>();
  for (const edge of edges) {
    if (edge.problem_entity_id === null) continue;
    if (edge.relation === "evidence_for" && edge.basis === "authority_decided") {
      acceptedEntities.add(edge.problem_entity_id);
    }
    if (edge.relation === "state_change" && edge.basis_ref.change === "accepted_added") {
      acceptedEntities.add(edge.problem_entity_id);
    }
  }
  const gaps: ProblemFrontierGap[] = [];
  const occurrencesSeen = new Set<string>();
  for (const edge of edges) {
    if (
      occurrenceRelations.includes(edge.relation)
      && edge.problem_entity_id !== null
      && !acceptedEntities.has(edge.problem_entity_id)
    ) {
      const key = `${edge.problem_entity_id}\u0000${edge.source_ref}`;
      if (!occurrencesSeen.has(key)) {
        occurrencesSeen.add(key);
        gaps.push({
          kind: "occurrence_without_accepted_claim",
          problem_entity_id: edge.problem_entity_id,
          occurrence_ref: edge.source_ref,
        });
      }
    }
    if (
      edge.relation === "grouped_with"
      && edge.basis === "heuristic_advisory"
      && edge.problem_entity_id !== null
    ) {
      gaps.push({
        kind: "unresolved_equivalence",
        problem_entity_id: edge.problem_entity_id,
        occurrence_ref: edge.source_ref,
        nonclaims: edge.nonclaims,
      });
    }
    if (edge.relation === "verified_by" && edge.nonclaims.length > 0) {
      gaps.push({
        kind: "verification_nonclaim",
        problem_entity_id: edge.problem_entity_id,
        verification_ref: edge.target_ref,
        nonclaims: edge.nonclaims,
      });
    }
  }
  return gaps;
}

export interface ProblemFrontierQuery {
  root: string;
  problemEntityId?: string;
  repositorySlug?: string;
  cursor?: string;
  limit?: number;
}

export async function problemFrontier(input: ProblemFrontierQuery) {
  const root = await assertReadableRelease(input.root);
  const byEntity = typeof input.problemEntityId === "string";
  const bySlug = typeof input.repositorySlug === "string";
  /* A caller error, not a projection refusal: no refusal code exists for a
     read that was never well-formed, and the short refusal list stays short. */
  if (byEntity === bySlug) {
    throw new Error("problem frontier reads take exactly one of problemEntityId or repositorySlug");
  }
  const limit = boundedLimit(input.limit, 200, 500);
  const scope = byEntity
    ? { column: "problem_entity_id", value: input.problemEntityId as string }
    : { column: "repository_id", value: repositoryKey(input.repositorySlug as string) };
  if (bySlug) {
    const repository = await sql().query(
      "SELECT 1 FROM projection.repositories WHERE release_root=$1 AND repository_id=$2 LIMIT 1",
      [root, scope.value],
    );
    if (!repository[0]) throw new ProjectionReadError("unknown_repository", "unknown repository");
  }
  const rows = await sql().query(`SELECT edge_id, problem_entity_id, repository_id,
      source_kind, source_ref, source_root, target_kind, target_ref, target_root,
      relation, basis, basis_ref, nonclaims, row_root,
      count(*) OVER()::integer AS total
    FROM projection.frontier_edges
    WHERE release_root=$1 AND ${scope.column}=$2 AND ($3='' OR edge_id > $3)
    ORDER BY edge_id LIMIT $4`, [root, scope.value, input.cursor ?? "", limit]);
  const total = windowTotal(rows, "frontier edge");
  const edges = rows.map(({ total: _total, ...row }: Record<string, unknown>) => parseFrontierEdgeRecord(row));
  const edgesByBasis = Object.fromEntries(
    frontierBases.map((basis) => [basis, edges.filter((edge) => edge.basis === basis)]),
  ) as Record<FrontierBasis, FrontierEdgeRecord[]>;
  return {
    schema: "site.problem-frontier.v1" as const,
    root,
    scope: byEntity
      ? { problem_entity_id: scope.value }
      : { repository: input.repositorySlug as string },
    total,
    next_cursor: edges.length === limit ? edges.at(-1)?.edge_id ?? null : null,
    edges_by_basis: edgesByBasis,
    /* Derived from this bounded window, never stored. */
    gaps: deriveProblemFrontierGaps(edges),
  };
}

export interface ProblemFrontierTState {
  commit_sha: string;
  committed_at: string | null;
  repository_root_before: HashRoot | null;
  repository_root_after: HashRoot;
  before_revision_root: HashRoot | null;
  after_revision_root: HashRoot | null;
  accepted_added: string[];
  accepted_removed: string[];
  semantic_delta: Record<string, unknown> | null;
}

/**
 * Orders the exact state-change edges of one Problem into t-states. The edge
 * carries which Claim moved for this Problem; the joined transition carries the
 * two Repository-root anchors and the semantic delta the movement was derived
 * from. Only comparison-verified transitions produce edges, so every t-state
 * here is anchored on both sides.
 */
export function assembleProblemFrontierTimeline(
  rows: Array<Record<string, unknown>>,
): ProblemFrontierTState[] {
  const label = "frontier t-state";
  const states = new Map<string, ProblemFrontierTState>();
  for (const input of rows) {
    const row = rowRecord(input, label);
    const edge = parseFrontierEdgeRecord({
      edge_id: row.edge_id,
      problem_entity_id: row.problem_entity_id,
      repository_id: row.repository_id,
      source_kind: row.source_kind,
      source_ref: row.source_ref,
      source_root: row.source_root,
      target_kind: row.target_kind,
      target_ref: row.target_ref,
      target_root: row.target_root,
      relation: row.relation,
      basis: row.basis,
      basis_ref: row.basis_ref,
      nonclaims: row.nonclaims,
      row_root: row.row_root,
    });
    if (edge.relation !== "state_change" || edge.basis !== "exact_derivation") {
      throw new Error(`${label} rows must be exact state_change edges`);
    }
    const commit = edge.source_ref;
    const state = states.get(commit) ?? {
      commit_sha: commit,
      committed_at: nullableInstant(row, "committed_at", label),
      repository_root_before: nullableRoot(row, "repository_root_before", label),
      repository_root_after: requiredRoot(row, "repository_root_after", label),
      before_revision_root: nullableRoot(row, "before_revision_root", label),
      after_revision_root: nullableRoot(row, "after_revision_root", label),
      accepted_added: [],
      accepted_removed: [],
      semantic_delta: row.semantic_delta === null || row.semantic_delta === undefined
        ? null
        : rowRecord(row.semantic_delta, `${label} semantic_delta`),
    };
    const change = edge.basis_ref.change;
    if (change !== "accepted_added" && change !== "accepted_removed") {
      throw new Error(`${label} edge ${edge.edge_id} names no accepted-set change`);
    }
    state[change].push(edge.target_ref);
    states.set(commit, state);
  }
  return [...states.values()]
    .map((state) => ({
      ...state,
      accepted_added: [...state.accepted_added].sort(),
      accepted_removed: [...state.accepted_removed].sort(),
    }))
    .sort((left, right) => (
      (left.committed_at ?? "").localeCompare(right.committed_at ?? "")
      || left.commit_sha.localeCompare(right.commit_sha)
    ));
}

export async function problemFrontierTimeline(input: { root: string; problemEntityId: string }) {
  const root = await assertReadableRelease(input.root);
  if (typeof input.problemEntityId !== "string" || input.problemEntityId.length === 0) {
    throw new Error("problem frontier timelines require a problem entity id");
  }
  const rows = await sql().query(`SELECT
      edge.edge_id, edge.problem_entity_id, edge.repository_id,
      edge.source_kind, edge.source_ref, edge.source_root,
      edge.target_kind, edge.target_ref, edge.target_root,
      edge.relation, edge.basis, edge.basis_ref, edge.nonclaims, edge.row_root,
      transition.repository_root_before, transition.repository_root_after,
      transition.before_revision_root, transition.after_revision_root,
      transition.semantic_delta,
      commit.committed_at
    FROM projection.frontier_edges edge
    JOIN projection.repository_transitions transition
      ON transition.release_root = edge.release_root
      AND transition.repository_id = edge.repository_id
      AND transition.commit_sha = edge.source_ref
    LEFT JOIN projection.commits commit
      ON commit.release_root = transition.release_root
      AND commit.repository_id = transition.repository_id
      AND commit.sha = transition.commit_sha
    WHERE edge.release_root=$1 AND edge.problem_entity_id=$2
      AND edge.relation='state_change'
    ORDER BY commit.committed_at, edge.source_ref, edge.edge_id
    LIMIT 500`, [root, input.problemEntityId]);
  return {
    schema: "site.problem-frontier-timeline.v1" as const,
    root,
    problem_entity_id: input.problemEntityId,
    t_states: assembleProblemFrontierTimeline(rows as Array<Record<string, unknown>>),
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
