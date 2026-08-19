import { canonicalJson, sha256 } from "./projection-builder.mjs";
import { slugForRepositoryId } from "../src/registry.ts";

const json = (value) => JSON.stringify(value);
const query = (sql, text, params = []) => (
  typeof sql.query === "function"
    ? sql.query(text, params)
    : sql.unsafe(text, params)
);

/* One database-wide mutex for the single current-release pointer.
 *
 * The signed bigint is the first eight bytes of SHA-256 over
 * `vela-web:problems:current-release:v1`. Keeping the literal here makes
 * both the HTTP activation statement and the interactive selection transaction
 * use exactly the same lock identity without depending on PostgreSQL's hash
 * implementation. */
export const projectionReleaseAdvisoryLock = "852837500357312960";
export const projectionReleaseLockTimeout = "5s";
export const projectionReleaseStatementTimeout = "120s";
export const projectionReleaseIdleTransactionTimeout = "120s";

export const releaseSelectionRefusalKinds = Object.freeze({
  expectedCurrentDrift: "expected_current_drift",
  postgresSerialization: "postgres_serialization",
  postgresDeadlock: "postgres_deadlock",
  postgresTimeout: "postgres_timeout",
  selectionRefused: "selection_refused",
});
const releaseSelectionRefusalKindSet = new Set(
  Object.values(releaseSelectionRefusalKinds),
);

export class ReleaseSelectionRefusal extends Error {
  constructor(refusal, message) {
    super(message);
    this.name = "ReleaseSelectionRefusal";
    this.refusal = refusal;
  }
}

/**
 * Reduce a release-selection failure to the only detail safe for an operator
 * boundary. Driver messages can carry SQL, server detail, or connection facts;
 * none of those belong in CLI output or workflow logs.
 */
export function classifyReleaseSelectionRefusal(error) {
  if (
    error instanceof ReleaseSelectionRefusal
    && releaseSelectionRefusalKindSet.has(error.refusal)
  ) return error.refusal;
  const postgresCode = error && typeof error === "object"
    ? [error.errno, error.code].find((value) => typeof value === "string"
      && /^(?:25P03|40001|40P01|55P03|57014)$/u.test(value)) ?? null
    : null;
  if (postgresCode === "40001") return releaseSelectionRefusalKinds.postgresSerialization;
  if (postgresCode === "40P01") return releaseSelectionRefusalKinds.postgresDeadlock;
  if (["25P03", "55P03", "57014"].includes(postgresCode)) {
    return releaseSelectionRefusalKinds.postgresTimeout;
  }
  return releaseSelectionRefusalKinds.selectionRefused;
}

const projectionRootPattern = /^sha256:[0-9a-f]{64}$/u;

function exactProjectionRoot(value, label) {
  if (typeof value !== "string" || !projectionRootPattern.test(value)) {
    throw new Error(`${label} must be an exact lowercase sha256 root`);
  }
  return value;
}

async function configureReleaseTransaction(sql) {
  await query(sql, `SET LOCAL lock_timeout = '${projectionReleaseLockTimeout}'`);
  await query(sql, `SET LOCAL statement_timeout = '${projectionReleaseStatementTimeout}'`);
  await query(sql, `SET LOCAL idle_in_transaction_session_timeout = '${projectionReleaseIdleTransactionTimeout}'`);
}
export const projectionWriteChunkRows = 1_000;

export function deterministicRowChunks(
  rows,
  chunkSize = projectionWriteChunkRows,
) {
  if (!Array.isArray(rows)) throw new Error("projection rows must be an array");
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) {
    throw new Error("projection chunk size must be a positive safe integer");
  }
  const chunks = [];
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    chunks.push(rows.slice(offset, offset + chunkSize));
  }
  return chunks;
}

function chunkedQueries(tx, rows, build) {
  return deterministicRowChunks(rows).map((chunk) => build(chunk));
}

function rootOrderedRows(rows) {
  return [...rows].sort((left, right) => (
    String(left.row_root).localeCompare(String(right.row_root))
  ));
}

const releaseIdentityFields = [
  "schema",
  "vela_version",
  "vela_binary_sha256",
  "table_roots",
  "source_repositories",
  "source_registry",
];

const registryTableOrder = [
  "source_declarations",
  "source_observations",
  "native_records",
  "release_sources",
  "repository_source_bindings",
];

export const publicTableOrder = [
  "repositories",
  "claims",
  "reviews",
  "submissions",
  "verifications",
  "graph_nodes",
  "graph_edges",
  "search_documents",
  "commits",
  "repository_revisions",
  "repository_transitions",
  "frontier_edges",
  ...registryTableOrder,
];

export function completeCandidateTables(tables) {
  return Object.fromEntries(publicTableOrder.map((table) => {
    const rows = tables[table];
    if (!Array.isArray(rows)) throw new Error(`candidate is missing public table ${table}`);
    return [table, rows];
  }));
}

/* The declaration carries rights, adapter and coverage; the row carries the
   roots. These were written as `row.rights ?? declaration.rights`, which reads
   as though the flat field were the normal case and the declaration a
   fallback. It is the other way round — `sourceDeclarationRows()` has never
   emitted a flat `rights`, `adapter` or `coverage` — so the first operand was
   always undefined and only a test fixture ever supplied it. Reading the
   declaration directly means a row without one throws here rather than
   projecting undefined into three NOT NULL jsonb columns. */
function sourceDeclarationRow(row) {
  const { declaration } = row;
  return {
    declaration_root: row.declaration_root,
    source_id: row.source_id,
    native_namespace: row.native_namespace,
    publisher_or_maintainer: row.publisher_or_maintainer,
    locators: row.locators,
    attributed_claims: row.attributed_claims,
    source_kind: row.source_kind,
    rights: declaration.rights,
    snapshot_policy: row.snapshot_policy,
    adapter: declaration.adapter,
    coverage: declaration.coverage,
    row_root: row.row_root,
  };
}

function sourceObservationRow(row) {
  return {
    observation_root: row.observation_root,
    source_id: row.source_id,
    observation_id: row.observation_id,
    declaration_root: row.declaration_root,
    acquisition_root: row.acquisition_root,
    observed_at: row.observed_at,
    native_revision: row.native_revision,
    snapshot_root: row.snapshot_root,
    snapshot_state: row.snapshot_state,
    projected_record_count: row.projected_record_count,
    projected_records_root: row.projected_records_root,
    coverage: row.coverage,
    omissions: row.omissions,
    row_root: row.row_root,
  };
}

function nativeRecordRow(row) {
  return {
    observation_root: row.observation_root,
    source_id: row.source_id,
    native_id: row.native_id,
    native_kind: row.native_kind,
    native_revision: row.native_revision,
    title: row.title,
    summary: row.summary,
    locators: row.locators,
    metadata: row.metadata,
    metadata_root: row.metadata_root,
    content_root: row.content_root,
    availability: row.availability,
    row_root: row.row_root,
  };
}

function releaseSourceRow(root, row) {
  return {
    release_root: root,
    source_id: row.source_id,
    declaration_root: row.declaration_root,
    observation_root: row.observation_root,
    native_record_count: row.native_record_count,
    repository_binding_count: row.repository_binding_count,
    row_root: row.row_root ?? row.release_source_root,
  };
}

function repositorySourceBindingRow(root, row) {
  return {
    release_root: root,
    repository_id: row.repository_id,
    binding_id: row.binding_id,
    source_id: row.source_id,
    observation_root: row.observation_root,
    native_id: row.native_id,
    native_record_root: row.native_record_root,
    binding_kind: row.binding_kind,
    repository_object_kind: row.repository_object_kind,
    repository_object_id: row.repository_object_id,
    repository_object_root: row.repository_object_root,
    local_standing_effect: row.local_standing_effect,
    binding_root: row.binding_root,
    row_root: row.row_root ?? row.binding_root,
  };
}

export function releaseFacts(manifest) {
  return Object.fromEntries(releaseIdentityFields.map((field) => [field, manifest[field]]));
}

export function releaseFactsEqual(left, right) {
  return canonicalJson(releaseFacts(left)) === canonicalJson(releaseFacts(right));
}

export async function currentStoredRelease(sql) {
  const rows = await sql`SELECT r.manifest
    FROM projection.current_release c
    JOIN projection.releases r USING (release_root)
    WHERE c.singleton = true
    LIMIT 1`;
  return rows[0]?.manifest ?? null;
}

export async function storedRelease(sql, root) {
  const rows = await query(
    sql,
    "SELECT manifest FROM projection.releases WHERE release_root = $1 LIMIT 1",
    [root],
  );
  return rows[0]?.manifest ?? null;
}

/*
  Every insert below names its target columns.

  Ten of them did not. `INSERT INTO t SELECT $1, x.*` is positional: it holds
  only while the table's column order in Postgres matches the `AS x(…)` list
  character for character, and nothing anywhere checked that. A column added to
  a table anywhere but the end shifts every value after it one place to the
  right, and because these columns are almost all `text`, Postgres accepts the
  shifted row without complaint — a Claim would land with its `standing` in
  `assertion` and its `row_root` one column early, and the release would
  activate. `search_documents` already survived exactly this once, when
  `search_text` became a generated column and left the writable positional
  order; the fix then was to name that one table's columns.

  Naming them turns a schema change from a silent transposition into a Postgres
  error that says which column. The `AS x(…)` list still fixes the order the
  JSON is read in; the column list fixes where those values go.
*/
export async function insertCandidate(sql, candidate) {
  const { manifest } = candidate;
  const tables = completeCandidateTables(candidate.tables);
  const root = manifest.release_root;
  await sql.transaction((tx) => [
    tx`INSERT INTO projection.releases (release_root, manifest, generated_at)
       VALUES (${root}, ${json(manifest)}::text::jsonb, ${manifest.generated_at}::timestamptz)`,
    query(tx, `INSERT INTO projection.repositories (
      release_root, repository_id, name, source_remote, source_commit, source_tree, committed_at,
      origin_id, origin_root, repository_root, authority_keyset_root, authority_policy_root,
      graph_source_root, graph_layout_root,
      graph_node_count, graph_edge_count, problem_count,
      graph_claim_count, status, reproduce, row_root
    ) SELECT $1, x.repository_id, x.name, x.source_remote, x.source_commit, x.source_tree,
      x.committed_at, x.origin_id, x.origin_root, x.repository_root, x.authority_keyset_root,
      x.authority_policy_root,
      x.graph_source_root, x.graph_layout_root, x.graph_node_count,
      x.graph_edge_count, x.problem_count, x.graph_claim_count, x.status, x.reproduce, x.row_root
    FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, name text, source_remote text, source_commit text, source_tree text,
      committed_at timestamptz, origin_id text, origin_root text, repository_root text,
      authority_keyset_root text, authority_policy_root text,
      graph_source_root text, graph_layout_root text,
      graph_node_count integer, graph_edge_count integer, problem_count integer,
      graph_claim_count integer, status jsonb, reproduce jsonb, row_root text
    )`, [root, json(tables.repositories)]),
    query(tx, `INSERT INTO projection.claims (
      release_root, repository_id, claim_id, claim_root, standing, assertion,
      assertion_kind, conditions, created_at, source_title,
      source_type, evidence_count, imported_object_id, imported_object_root,
      contested, retracted, source_path, record, row_root
    ) SELECT $1, x.* FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, claim_id text, claim_root text, standing text, assertion text,
      assertion_kind text, conditions jsonb, created_at timestamptz, source_title text,
      source_type text, evidence_count integer, imported_object_id text, imported_object_root text,
      contested boolean, retracted boolean, source_path text, record jsonb, row_root text
    )`, [root, json(tables.claims)]),
    query(tx, `INSERT INTO projection.reviews (
      release_root, repository_id, proposal_id, status, kind, target, claim, content_root,
      receipt_root, created_at, reviewed_at, reviewed_by, decision_actor_class,
      decision_session_ref, decision_authority_principal_id, decision_event_id, decision_plan_root,
      decision_provenance, applied_event_id, decision_reason, decision_packet,
      proposed_state_preview, claim_retirement, retired_by_claim_id, row_root
    ) SELECT $1, x.repository_id, x.proposal_id, x.status, x.kind, x.target, x.claim,
      x.content_root, x.receipt_root, x.created_at, x.reviewed_at, x.reviewed_by,
      x.decision_actor_class, x.decision_session_ref, x.decision_authority_principal_id,
      x.decision_event_id, x.decision_plan_root, x.decision_provenance, x.applied_event_id,
      x.decision_reason, x.decision_packet, x.proposed_state_preview,
      x.claim_retirement, x.retired_by_claim_id, x.row_root
    FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, proposal_id text, status text, kind text, target text, claim text,
      content_root text, receipt_root text, created_at timestamptz, reviewed_at timestamptz,
      reviewed_by text, decision_actor_class text, decision_session_ref text,
      decision_authority_principal_id text, decision_event_id text, decision_plan_root text,
      decision_provenance text,
      applied_event_id text, decision_reason text, decision_packet jsonb,
      proposed_state_preview jsonb,
      claim_retirement text, retired_by_claim_id text, row_root text
    )`, [root, json(tables.reviews)]),
    query(tx, `INSERT INTO projection.submissions (
      release_root, repository_id, submission_id, submission_root, proposal_id, claim_id,
      producer_actor, submitted_at, source_path, record, row_root
    ) SELECT $1, x.* FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, submission_id text, submission_root text, proposal_id text, claim_id text,
      producer_actor text, submitted_at timestamptz, source_path text, record jsonb, row_root text
    )`, [root, json(tables.submissions)]),
    query(tx, `INSERT INTO projection.verifications (
      release_root, repository_id, verification_record_id, verification_root, submission_id,
      submission_root, proposal_id, claim_id, outcome, property, does_not_establish,
      verifier_actor, reviewer_kind, reviewer_display_name, reviewer_identifier,
      reviewer_provider, reviewer_version, review_method_root,
      completed_at, source_path, record, row_root
    ) SELECT $1, x.* FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, verification_record_id text, verification_root text, submission_id text,
      submission_root text, proposal_id text, claim_id text, outcome text, property text,
      does_not_establish jsonb, verifier_actor text, reviewer_kind text,
      reviewer_display_name text, reviewer_identifier text, reviewer_provider text,
      reviewer_version text, review_method_root text,
      completed_at timestamptz, source_path text, record jsonb, row_root text
    )`, [root, json(tables.verifications)]),
    query(tx, `INSERT INTO projection.graph_nodes (
      release_root, repository_id, node_id, kind, label, plane, trust, standing,
      href, x, y, content, row_root
    ) SELECT $1, x.* FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, node_id text, kind text, label text, plane text, trust text, standing text,
      href text, x double precision, y double precision, content jsonb, row_root text
    )`, [root, json(tables.graph_nodes)]),
    query(tx, `INSERT INTO projection.graph_edges (
      release_root, repository_id, edge_id, source_id, target_id, relation, trust,
      inferred, source_root, evidence, row_root
    ) SELECT $1, x.* FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, edge_id text, source_id text, target_id text, relation text, trust text,
      inferred boolean, source_root text, evidence text, row_root text
    )`, [root, json(tables.graph_edges)]),
    query(tx, `INSERT INTO projection.commits
      (release_root, repository_id, sha, parent_sha, author_name, committed_at, subject, body, changed_paths, machine, row_root)
      SELECT $1, x.* FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, sha text, parent_sha text, author_name text, committed_at timestamptz,
      subject text, body text, changed_paths jsonb, machine boolean, row_root text
    )`, [root, json(tables.commits)]),
    query(tx, `INSERT INTO projection.repository_revisions
      (release_root, repository_id, git_commit, parent_commit, git_tree,
       source_repository_id, source_index_root, repository_root, replay_state, record, row_root)
      SELECT $1, x.* FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, git_commit text, parent_commit text, git_tree text,
      source_repository_id text, source_index_root text, repository_root text,
      replay_state text, record jsonb, row_root text
    )`, [root, json(tables.repository_revisions)]),
    query(tx, `INSERT INTO projection.repository_transitions
      (release_root, repository_id, commit_sha, parent_sha, repository_root_before, repository_root_after,
       accepted_added, accepted_removed, pending_added, pending_removed, counts,
       comparison_state, before_revision_root, after_revision_root, semantic_delta,
       semantic_delta_root, row_root)
      SELECT $1, x.* FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, commit_sha text, parent_sha text, repository_root_before text, repository_root_after text,
      accepted_added jsonb, accepted_removed jsonb, pending_added jsonb, pending_removed jsonb,
      counts jsonb, comparison_state text, before_revision_root text, after_revision_root text,
      semantic_delta jsonb, semantic_delta_root text, row_root text
    )`, [root, json(tables.repository_transitions)]),
    query(tx, `INSERT INTO projection.frontier_edges
      (release_root, edge_id, problem_entity_id, repository_id,
       source_kind, source_ref, source_root, target_kind, target_ref, target_root,
       relation, basis, basis_ref, nonclaims, row_root)
      SELECT $1, x.* FROM jsonb_to_recordset($2::text::jsonb) AS x(
      edge_id text, problem_entity_id text, repository_id text,
      source_kind text, source_ref text, source_root text,
      target_kind text, target_ref text, target_root text,
      relation text, basis text, basis_ref jsonb, nonclaims jsonb, row_root text
    )`, [root, json(tables.frontier_edges)]),
    /* `search_text` is generated, so it cannot be written at all and does not
       appear here — the one column list above that is shorter than its table. */
    query(tx, `INSERT INTO projection.search_documents
      (release_root, repository_id, kind, document_id, assertion, source_title, standing, href, row_root)
      SELECT $1, x.* FROM jsonb_to_recordset($2::text::jsonb) AS x(
      repository_id text, kind text, document_id text, assertion text, source_title text, standing text,
      href text, row_root text
    )`, [root, json(tables.search_documents)]),
    ...chunkedQueries(
      tx,
      rootOrderedRows(tables.source_declarations.map(sourceDeclarationRow)),
      (rows) => query(
        tx,
        `INSERT INTO projection.source_declarations
         SELECT * FROM jsonb_populate_recordset(
           NULL::projection.source_declarations,
           $1::text::jsonb
         )
         ON CONFLICT (declaration_root) DO NOTHING`,
        [json(rows)],
      ),
    ),
    ...chunkedQueries(
      tx,
      rootOrderedRows(tables.source_observations.map(sourceObservationRow)),
      (rows) => query(
        tx,
        `INSERT INTO projection.source_observations
         SELECT * FROM jsonb_populate_recordset(
           NULL::projection.source_observations,
           $1::text::jsonb
         )
         ON CONFLICT (observation_root) DO NOTHING`,
        [json(rows)],
      ),
    ),
    ...chunkedQueries(
      tx,
      rootOrderedRows(tables.native_records.map(nativeRecordRow)),
      (rows) => query(
        tx,
        `INSERT INTO projection.native_records (
           observation_root,
           source_id,
           native_id,
           native_kind,
           native_revision,
           title,
           summary,
           locators,
           metadata,
           metadata_root,
           content_root,
           availability,
           row_root
         )
         SELECT
           x.observation_root,
           x.source_id,
           x.native_id,
           x.native_kind,
           x.native_revision,
           x.title,
           x.summary,
           x.locators,
           x.metadata,
           x.metadata_root,
           x.content_root,
           x.availability,
           x.row_root
         FROM jsonb_to_recordset($1::text::jsonb) AS x(
           observation_root text,
           source_id text,
           native_id text,
           native_kind text,
           native_revision text,
           title text,
           summary text,
           locators jsonb,
           metadata jsonb,
           metadata_root text,
           content_root text,
           availability text,
           row_root text
         )
         ON CONFLICT (observation_root, native_id) DO NOTHING`,
        [json(rows)],
      ),
    ),
    ...chunkedQueries(
      tx,
      rootOrderedRows(
        tables.release_sources.map((row) => releaseSourceRow(root, row)),
      ),
      (rows) => query(
        tx,
        `INSERT INTO projection.release_sources
         SELECT * FROM jsonb_populate_recordset(
           NULL::projection.release_sources,
           $1::text::jsonb
         )`,
        [json(rows)],
      ),
    ),
    ...chunkedQueries(
      tx,
      rootOrderedRows(
        tables.repository_source_bindings.map(
          (row) => repositorySourceBindingRow(root, row),
        ),
      ),
      (rows) => query(
        tx,
        `INSERT INTO projection.repository_source_bindings
         SELECT * FROM jsonb_populate_recordset(
           NULL::projection.repository_source_bindings,
           $1::text::jsonb
         )`,
        [json(rows)],
      ),
    ),
  ]);
}

async function releaseTableRowRoots(sql, table, root) {
  if (table === "source_declarations") {
    return query(
      sql,
      `SELECT declaration.row_root
       FROM projection.release_sources release_source
       JOIN projection.source_declarations declaration
         USING (declaration_root, source_id)
       WHERE release_source.release_root = $1
       ORDER BY declaration.row_root`,
      [root],
    );
  }
  if (table === "source_observations") {
    return query(
      sql,
      `SELECT observation.row_root
       FROM projection.release_sources release_source
       JOIN projection.source_observations observation
         USING (observation_root, source_id)
       WHERE release_source.release_root = $1
       ORDER BY observation.row_root`,
      [root],
    );
  }
  if (table === "native_records") {
    return query(
      sql,
      `SELECT native_record.row_root
       FROM projection.release_sources release_source
       JOIN projection.native_records native_record
         USING (observation_root, source_id)
       WHERE release_source.release_root = $1
       ORDER BY native_record.row_root`,
      [root],
    );
  }
  return query(
    sql,
    `SELECT row_root
     FROM projection.${table}
     WHERE release_root = $1
     ORDER BY row_root`,
    [root],
  );
}

export async function verifyStoredRelease(sql, root) {
  const releaseRows = await query(sql, "SELECT manifest FROM projection.releases WHERE release_root = $1 LIMIT 1", [root]);
  if (!releaseRows[0]) throw new Error(`unknown candidate release ${root}`);
  const manifest = releaseRows[0].manifest;
  if (manifest.release_root !== root) throw new Error("stored release manifest root mismatch");
  const retiredRoots = Object.keys(manifest.table_roots ?? {})
    .filter((table) => !publicTableOrder.includes(table));
  if (retiredRoots.length) {
    throw new Error(`stored release uses retired table roots: ${retiredRoots.sort().join(", ")}`);
  }
  const counts = {};
  for (const table of publicTableOrder) {
    if (!(table in manifest.table_roots)) continue;
    const rows = await releaseTableRowRoots(sql, table, root);
    const observed = sha256(canonicalJson(rows.map((row) => row.row_root)));
    if (observed !== manifest.table_roots[table]) throw new Error(`${table}: inserted root ${observed} does not match ${manifest.table_roots[table]}`);
    counts[table] = rows.length;
  }
  const graphCounts = await query(sql, `SELECT repository_id, count(*)::integer AS nodes,
    count(*) FILTER (WHERE kind = 'claim')::integer AS claims
    FROM projection.graph_nodes WHERE release_root = $1 GROUP BY repository_id ORDER BY repository_id`, [root]);
  const edgeCounts = await query(sql, `SELECT repository_id, count(*)::integer AS edges
    FROM projection.graph_edges WHERE release_root = $1 GROUP BY repository_id ORDER BY repository_id`, [root]);
  const edges = new Map(edgeCounts.map((row) => [row.repository_id, row.edges]));
  /* `problem_count` counts source-native problem records, not problem-kind
     graph nodes. It was checked against the graph, which is why a release
     could publish 1,217 problem records and a manifest saying `problems: 0`
     and pass verification. */
  const [{ problems }] = await query(sql, `SELECT count(*)::integer AS problems
    FROM projection.release_sources rs
    JOIN projection.native_records n
      ON n.observation_root = rs.observation_root AND n.source_id = rs.source_id
    WHERE rs.release_root = $1 AND n.native_kind = 'problem'`, [root]);
  for (const expected of manifest.source_repositories) {
    const slug = slugForRepositoryId(expected.repository_id);
    if (!slug) throw new Error(`${expected.repository_id}: no exact Repository slug for Problem coverage`);
    const [{ scoped_problems: scopedProblems }] = await query(sql, `SELECT count(*)::integer AS scoped_problems
      FROM projection.release_sources rs
      JOIN projection.source_declarations sd
        ON sd.declaration_root = rs.declaration_root AND sd.source_id = rs.source_id
      JOIN projection.native_records n
        ON n.observation_root = rs.observation_root AND n.source_id = rs.source_id
      WHERE rs.release_root = $1 AND n.native_kind = 'problem'
        AND (sd.coverage -> 'repository_slugs') ? $2`, [root, slug]);
    if (scopedProblems !== expected.problem_count) {
      throw new Error(`${expected.repository_id}: inserted ${scopedProblems} covered source-native problem records, expected ${expected.problem_count}`);
    }
    const observed = graphCounts.find((row) => row.repository_id === expected.repository_id);
    const expectedNodes = expected.graph_node_count;
    if (expectedNodes === 0 && !observed) continue;
    if (!observed || observed.nodes !== expectedNodes || observed.claims !== expected.graph_claim_count || (edges.get(expected.repository_id) ?? 0) !== expected.graph_edge_count) {
      throw new Error(`${expected.repository_id}: inserted graph counts do not match the release manifest`);
    }
  }
  return { ok: true, release_root: root, manifest, counts, problems };
}

/*
  A floor under what a release may publish.

  Everything above this line is self-consistency: the inserted rows re-root to
  the manifest that describes them, and the row counts agree. Every one of those
  checks passes at zero — an empty candidate has an empty table root, which is
  a real root, and it matches. So a build that reached the projection with no
  Claim, no binding and no Problem verified perfectly and activated, and the
  live site went quiet with a green run behind it.

  A repository that legitimately empties is a decision someone makes. This makes
  them make it: a candidate publishing less than half of what the activated
  release publishes is refused, and the refusal names the measure and both
  numbers. Setting the override on the run that publishes it is the decision.
*/
export const corpusRetentionFloor = 0.5;

export const corpusDropOverrideVariable = "VELA_PROJECTION_ALLOW_CORPUS_DROP";

/* What the floor can actually see.
 *
 * The first three measures were `claims`, `problems` and
 * `repository_source_bindings`, which reads well and left the floor guarding one
 * number. `before === 0` skips a measure, and against the live release two of
 * the three are structurally zero: `math` has admitted no Claim, and the
 * Problem binding was deleted as a concept, so nothing writes bindings at all.
 * A release could therefore drop every source record it holds and be refused
 * only if it also lost Erdős problems.
 *
 * `native_records` is the measure with volume — 6,507 rows against 1,217
 * problems — and it is what a broken acquisition actually empties. `problems`
 * stays because it guards a different loss: an acquisition that keeps its
 * records and stops classifying them. `claims` stays because it is zero today
 * and is the first thing a real Decision makes non-zero, and a floor that only
 * starts working once someone remembers to add a measure is the floor that was
 * already here.
 *
 * `repository_source_bindings` is gone rather than kept at zero. Measuring a
 * table no code writes is not caution, it is a line that can never fire
 * pretending to be one that could. */
const corpusMeasures = ["claims", "problems", "native_records"];

export function corpusRetentionRefusals(
  activated,
  candidate,
  floor = corpusRetentionFloor,
) {
  return corpusMeasures.flatMap((measure) => {
    const before = Number(activated?.[measure] ?? 0);
    const after = Number(candidate?.[measure] ?? 0);
    /* Growth from nothing is not a drop, and neither is holding at nothing. */
    if (before === 0 || after >= Math.ceil(before * floor)) return [];
    return [`${measure} ${after}, against ${before} in the activated release`];
  });
}

export function assertCandidateRetainsCorpus(
  activated,
  candidate,
  environment = process.env,
) {
  const refusals = corpusRetentionRefusals(activated, candidate);
  if (refusals.length === 0) return { ok: true, refusals: [], overridden: false };
  if (environment[corpusDropOverrideVariable] === "1") {
    return { ok: true, refusals, overridden: true };
  }
  throw new Error(
    `refusing to activate a release that drops below ${corpusRetentionFloor * 100}% of the activated corpus: `
    + `${refusals.join("; ")}. A repository that legitimately empties is a decision — `
    + `set ${corpusDropOverrideVariable}=1 on the run that publishes it.`,
  );
}

export async function activatedReleaseRoot(sql) {
  const rows = await query(
    sql,
    "SELECT release_root FROM projection.current_release WHERE singleton LIMIT 1",
  );
  return rows[0]?.release_root ?? null;
}

export async function releaseCorpus(sql, root) {
  const rows = await query(
    sql,
    `SELECT
       (SELECT count(*)::integer FROM projection.claims WHERE release_root = $1) AS claims,
       (SELECT count(*)::integer
          FROM projection.release_sources rs
          JOIN projection.native_records n
            ON n.observation_root = rs.observation_root AND n.source_id = rs.source_id
         WHERE rs.release_root = $1) AS native_records,
       (SELECT count(*)::integer
          FROM projection.release_sources rs
          JOIN projection.native_records n
            ON n.observation_root = rs.observation_root AND n.source_id = rs.source_id
         WHERE rs.release_root = $1 AND n.native_kind = 'problem') AS problems`,
    [root],
  );
  return rows[0] ?? { claims: 0, native_records: 0, problems: 0 };
}

export async function verifyCandidate(sql, candidate) {
  const result = await verifyStoredRelease(sql, candidate.manifest.release_root);
  const tables = completeCandidateTables(candidate.tables);
  for (const table of publicTableOrder) {
    if (!(table in candidate.manifest.table_roots)) {
      if (registryTableOrder.includes(table) && tables[table].length === 0) continue;
      throw new Error(`${table}: candidate manifest is missing its table root`);
    }
    if (result.counts[table] !== tables[table].length) {
      throw new Error(`${table}: inserted ${result.counts[table]} rows, expected ${tables[table].length}`);
    }
  }
  const corpus = {
    claims: result.counts.claims ?? 0,
    problems: result.problems ?? 0,
    native_records: result.counts.native_records ?? 0,
  };
  const activatedRoot = await activatedReleaseRoot(sql);
  /* Nothing activated yet is a first release, and re-verifying the activated
     release is not a change. Neither has a predecessor to fall short of. */
  const retention = activatedRoot && activatedRoot !== candidate.manifest.release_root
    ? assertCandidateRetainsCorpus(await releaseCorpus(sql, activatedRoot), corpus)
    : { ok: true, refusals: [], overridden: false };
  return {
    ok: true,
    release_root: candidate.manifest.release_root,
    counts: result.counts,
    corpus,
    retention,
  };
}

export async function activateCandidate(sql, manifest, { expectedCurrentRoot } = {}) {
  const targetRoot = exactProjectionRoot(manifest?.release_root, "candidate release root");
  if (expectedCurrentRoot !== null) {
    exactProjectionRoot(expectedCurrentRoot, "expected current release root");
  }
  const results = await sql.transaction((tx) => [
    query(tx, `SET LOCAL lock_timeout = '${projectionReleaseLockTimeout}'`),
    query(tx, `SET LOCAL statement_timeout = '${projectionReleaseStatementTimeout}'`),
    query(tx, `SET LOCAL idle_in_transaction_session_timeout = '${projectionReleaseIdleTransactionTimeout}'`),
    query(tx, `WITH guard AS MATERIALIZED (
        SELECT pg_advisory_xact_lock($1::bigint) AS locked
      ), current_state AS MATERIALIZED (
        SELECT current.release_root
        FROM projection.current_release current, guard
        WHERE current.singleton
        FOR UPDATE OF current
      ), target_state AS MATERIALIZED (
        SELECT release.release_root, release.activated_at
        FROM projection.releases release, guard
        WHERE release.release_root = $2
        FOR UPDATE OF release
      ), eligible AS MATERIALIZED (
        SELECT target.release_root,
          COALESCE(target.activated_at, $3::timestamptz) AS first_live_at
        FROM target_state target
        WHERE ($4::text IS NULL AND NOT EXISTS (SELECT 1 FROM current_state))
           OR ($4::text IS NOT NULL AND EXISTS (
             SELECT 1 FROM current_state WHERE release_root = $4
           ))
      ), moved AS (
        INSERT INTO projection.current_release (
          singleton, release_root, activated_at, confirmed_at
        )
        SELECT true, eligible.release_root, eligible.first_live_at, now()
        FROM eligible
        ON CONFLICT (singleton) DO UPDATE SET
          release_root = EXCLUDED.release_root,
          activated_at = EXCLUDED.activated_at,
          confirmed_at = EXCLUDED.confirmed_at
        WHERE $4::text IS NOT NULL
          AND projection.current_release.release_root = $4
        RETURNING release_root, activated_at, confirmed_at
      ), marked AS (
        UPDATE projection.releases release
        SET activated_at = COALESCE(release.activated_at, moved.activated_at)
        FROM moved
        WHERE release.release_root = moved.release_root
        RETURNING release.release_root, release.activated_at
      )
      SELECT moved.release_root, marked.activated_at, moved.confirmed_at
      FROM moved JOIN marked USING (release_root)`, [
      projectionReleaseAdvisoryLock,
      targetRoot,
      manifest.activation_time,
      expectedCurrentRoot,
    ]),
  ]);
  const moved = results.at(-1) ?? [];
  if (moved.length !== 1) {
    throw new Error(
      `release activation lost expected-current CAS: expected ${expectedCurrentRoot ?? "no current release"}, target ${targetRoot}`,
    );
  }
  return moved[0];
}

/* A refresh that changed nothing still happened, and that is the fact worth
   recording. `activateCandidate` is not reached on the no-op branch — there is
   nothing to activate — so without this the only instant on the page ages while
   the pipeline stays healthy, and stops aging in exactly the same way when the
   pipeline dies. */
export async function confirmCurrentRelease(sql, root) {
  exactProjectionRoot(root, "expected current release root");
  const results = await sql.transaction((tx) => [
    query(tx, `SET LOCAL lock_timeout = '${projectionReleaseLockTimeout}'`),
    query(tx, `SET LOCAL statement_timeout = '${projectionReleaseStatementTimeout}'`),
    query(tx, `SET LOCAL idle_in_transaction_session_timeout = '${projectionReleaseIdleTransactionTimeout}'`),
    query(tx, `WITH guard AS MATERIALIZED (
        SELECT pg_advisory_xact_lock($1::bigint) AS locked
      )
      UPDATE projection.current_release current
      SET confirmed_at = now()
      FROM guard
      WHERE current.singleton AND current.release_root = $2
      RETURNING current.release_root, current.activated_at, current.confirmed_at`, [
      projectionReleaseAdvisoryLock,
      root,
    ]),
  ]);
  const rows = results.at(-1) ?? [];
  if (rows.length !== 1) {
    throw new Error(`release confirmation lost expected-current CAS: expected ${root}`);
  }
  return rows[0];
}

export async function selectStoredRelease(
  sql,
  { expectedCurrentRoot, targetReleaseRoot },
) {
  const expectedRoot = exactProjectionRoot(
    expectedCurrentRoot,
    "expected current release root",
  );
  const targetRoot = exactProjectionRoot(targetReleaseRoot, "target release root");
  if (expectedRoot === targetRoot) {
    throw new Error("target release is already the expected current release");
  }
  if (typeof sql?.begin !== "function") {
    throw new Error("historical release selection requires an interactive SQL transaction");
  }

  return sql.begin("isolation level serializable read write", async (tx) => {
    await configureReleaseTransaction(tx);
    await query(
      tx,
      "SELECT pg_advisory_xact_lock($1::bigint)",
      [projectionReleaseAdvisoryLock],
    );
    const current = await query(
      tx,
      `SELECT release_root, activated_at, confirmed_at
       FROM projection.current_release
       WHERE singleton
       FOR UPDATE`,
    );
    if (current.length !== 1 || current[0].release_root !== expectedRoot) {
      throw new ReleaseSelectionRefusal(
        releaseSelectionRefusalKinds.expectedCurrentDrift,
        `release selection lost expected-current CAS: expected ${expectedRoot}`,
      );
    }
    const target = await query(
      tx,
      `SELECT release_root, activated_at
       FROM projection.releases
       WHERE release_root = $1
       FOR UPDATE`,
      [targetRoot],
    );
    if (target.length !== 1) throw new Error(`unknown candidate release ${targetRoot}`);
    if (target[0].activated_at === null) {
      throw new Error(`release ${targetRoot} was never activated`);
    }

    await verifyStoredRelease(tx, targetRoot);
    const selected = await query(
      tx,
      `UPDATE projection.current_release current
       SET release_root = target.release_root,
           activated_at = target.activated_at,
           confirmed_at = now()
       FROM projection.releases target
       WHERE current.singleton
         AND current.release_root = $1
         AND target.release_root = $2
         AND target.activated_at IS NOT NULL
       RETURNING current.release_root, current.activated_at, current.confirmed_at`,
      [expectedRoot, targetRoot],
    );
    if (selected.length !== 1) {
      throw new ReleaseSelectionRefusal(
        releaseSelectionRefusalKinds.expectedCurrentDrift,
        `release selection lost expected-current CAS: expected ${expectedRoot}, target ${targetRoot}`,
      );
    }
    return selected[0];
  });
}

export async function currentReleaseConfirmedAt(sql) {
  const rows = await query(
    sql,
    "SELECT confirmed_at FROM projection.current_release WHERE singleton LIMIT 1",
  );
  const value = rows[0]?.confirmed_at ?? null;
  return value === null ? null : new Date(value).toISOString();
}
