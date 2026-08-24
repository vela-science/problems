-- 0002: additive Formal Conjectures frontier-census tables.
--
-- Immutable once applied; `scripts/schema.mjs` records this file's SHA-256 in
-- projection.schema_migrations. The final shape is also stated in schema.sql,
-- which a clean reconstruction applies first — every statement here is
-- idempotent so both orders land on the same schema.
--
-- A census snapshot is a derived, disposable projection over an external
-- corpus checkout, not over a Vela projection release: it is rooted by the
-- SHA-256 of its census file rather than by release_root, and it carries its
-- own exact corpus commit and toolchain. Snapshots are append-only; a
-- re-ingest of identical census bytes is a no-op by primary key.

CREATE TABLE IF NOT EXISTS projection.fc_frontier_snapshots (
  census_root text PRIMARY KEY CHECK (census_root ~ '^sha256:[0-9a-f]{64}$'),
  corpus_repository text NOT NULL CHECK (length(corpus_repository) > 0),
  corpus_commit text NOT NULL CHECK (corpus_commit ~ '^[0-9a-f]{40}$'),
  upstream_equivalent text,
  lean_toolchain text NOT NULL CHECK (length(lean_toolchain) > 0),
  measured_on date NOT NULL,
  authored_declarations integer NOT NULL CHECK (authored_declarations > 0),
  family_count integer NOT NULL CHECK (family_count > 0),
  prove_count integer NOT NULL CHECK (prove_count >= 0),
  state_count integer NOT NULL CHECK (state_count >= 0),
  repair_count integer NOT NULL CHECK (repair_count >= 0),
  kernel_settled_count integer NOT NULL CHECK (kernel_settled_count >= 0),
  compiler_settled_count integer NOT NULL CHECK (compiler_settled_count >= 0),
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projection.fc_frontier_families (
  census_root text NOT NULL
    REFERENCES projection.fc_frontier_snapshots(census_root) ON DELETE CASCADE,
  family text NOT NULL CHECK (length(family) > 0),
  prove_count integer NOT NULL CHECK (prove_count >= 0),
  state_count integer NOT NULL CHECK (state_count >= 0),
  repair_count integer NOT NULL CHECK (repair_count >= 0),
  kernel_settled_count integer NOT NULL CHECK (kernel_settled_count >= 0),
  compiler_settled_count integer NOT NULL CHECK (compiler_settled_count >= 0),
  PRIMARY KEY (census_root, family)
);

CREATE INDEX IF NOT EXISTS fc_frontier_families_by_prove
  ON projection.fc_frontier_families (census_root, prove_count DESC, family);

CREATE TABLE IF NOT EXISTS projection.fc_frontier_repairs (
  census_root text NOT NULL
    REFERENCES projection.fc_frontier_snapshots(census_root) ON DELETE CASCADE,
  declaration text NOT NULL CHECK (length(declaration) > 0),
  PRIMARY KEY (census_root, declaration)
);

GRANT SELECT ON TABLE
  projection.fc_frontier_snapshots,
  projection.fc_frontier_families,
  projection.fc_frontier_repairs
TO vela_projection_reader;
