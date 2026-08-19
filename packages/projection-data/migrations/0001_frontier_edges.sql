-- 0001: additive frontier_edges projection table.
--
-- Immutable once applied; `scripts/schema.mjs` records this file's SHA-256 in
-- projection.schema_migrations. The final shape is also stated in schema.sql,
-- which a clean reconstruction applies first — every statement here is
-- idempotent so both orders land on the same schema.

CREATE TABLE IF NOT EXISTS projection.frontier_edges (
  release_root text NOT NULL REFERENCES projection.releases(release_root) ON DELETE CASCADE,
  edge_id text NOT NULL,
  problem_entity_id text,
  repository_id text,
  source_kind text NOT NULL CHECK (source_kind IN (
    'problem', 'occurrence', 'claim', 'proposal', 'submission',
    'verification', 'transition', 'artifact', 'external_reference'
  )),
  source_ref text NOT NULL CHECK (length(source_ref) > 0),
  source_root text CHECK (source_root IS NULL OR source_root ~ '^sha256:[0-9a-f]{64}$'),
  target_kind text NOT NULL CHECK (target_kind IN (
    'problem', 'occurrence', 'claim', 'proposal', 'submission',
    'verification', 'transition', 'artifact', 'external_reference'
  )),
  target_ref text NOT NULL CHECK (length(target_ref) > 0),
  target_root text CHECK (target_root IS NULL OR target_root ~ '^sha256:[0-9a-f]{64}$'),
  relation text NOT NULL CHECK (relation IN (
    'occurrence_of', 'formalizes', 'evidence_for', 'verified_by', 'proposed_by',
    'decided_by', 'corrects', 'supersedes', 'state_change',
    'external_dependency', 'grouped_with'
  )),
  basis text NOT NULL CHECK (basis IN (
    'source_asserted', 'mechanically_verified', 'authority_decided',
    'exact_derivation', 'heuristic_advisory'
  )),
  basis_ref jsonb NOT NULL CHECK (jsonb_typeof(basis_ref) = 'object'),
  nonclaims jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(nonclaims) = 'array'),
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, edge_id)
);

CREATE INDEX IF NOT EXISTS projection_frontier_edges_problem_idx
  ON projection.frontier_edges (release_root, problem_entity_id, relation);

GRANT SELECT ON TABLE projection.frontier_edges TO vela_projection_reader;
