-- Current disposable projection-data schema for the Problems product.
-- Canonical scientific state remains in the Repository Git repositories.

CREATE SCHEMA IF NOT EXISTS projection;

CREATE TABLE IF NOT EXISTS projection.releases (
  release_root text PRIMARY KEY CHECK (release_root ~ '^sha256:[0-9a-f]{64}$'),
  manifest jsonb NOT NULL,
  generated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);

CREATE TABLE IF NOT EXISTS projection.schema_migrations (
  migration_id text PRIMARY KEY,
  migration_root text NOT NULL CHECK (migration_root ~ '^sha256:[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projection.current_release (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  release_root text NOT NULL REFERENCES projection.releases(release_root),
  activated_at timestamptz NOT NULL DEFAULT now(),
  -- When a refresh last re-derived this release and agreed with it.
  --
  -- `activated_at` answers "when did this release first go live", which a
  -- reader takes for "how old is what I am looking at". Those diverge without
  -- bound the moment the source repositories go quiet: a refresh that finds
  -- nothing changed re-derives the same root and returns early, so after six
  -- weeks of nightly runs that each confirmed the state, the footer still shows
  -- a six-week-old instant — indistinguishable from a refresh that has been
  -- broken for six weeks. Those are the two cases a freshness stamp exists to
  -- tell apart.
  --
  -- Deliberately wall-clock and deliberately outside `releaseIdentityFields`:
  -- it is not part of what the release IS, so it must never enter a root.
  confirmed_at timestamptz
);

CREATE TABLE IF NOT EXISTS projection.repositories (
  release_root text NOT NULL REFERENCES projection.releases(release_root) ON DELETE CASCADE,
  repository_id text NOT NULL CHECK (repository_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  name text NOT NULL,
  source_remote text NOT NULL,
  source_commit text NOT NULL CHECK (source_commit ~ '^[0-9a-f]{40}$'),
  source_tree text NOT NULL CHECK (source_tree ~ '^[0-9a-f]{40}$'),
  committed_at timestamptz NOT NULL,
  origin_id text NOT NULL CHECK (origin_id ~ '^vro_[0-9a-f]{16}$'),
  origin_root text NOT NULL CHECK (origin_root ~ '^sha256:[0-9a-f]{64}$'),
  repository_root text NOT NULL CHECK (repository_root ~ '^sha256:[0-9a-f]{64}$'),
  authority_keyset_root text NOT NULL CHECK (authority_keyset_root ~ '^sha256:[0-9a-f]{64}$'),
  authority_policy_root text NOT NULL CHECK (authority_policy_root ~ '^sha256:[0-9a-f]{64}$'),
  graph_source_root text,
  graph_layout_root text,
  graph_node_count integer NOT NULL DEFAULT 0 CHECK (graph_node_count >= 0),
  graph_edge_count integer NOT NULL DEFAULT 0 CHECK (graph_edge_count >= 0),
  problem_count integer NOT NULL DEFAULT 0 CHECK (problem_count >= 0),
  graph_claim_count integer NOT NULL DEFAULT 0 CHECK (graph_claim_count >= 0),
  status jsonb NOT NULL,
  reproduce jsonb NOT NULL,
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id)
);

COMMENT ON COLUMN projection.repositories.origin_root IS
  'Exact vela.repository-origin.v1 byte root for the current repository projection.';

CREATE TABLE IF NOT EXISTS projection.claims (
  release_root text NOT NULL,
  repository_id text NOT NULL,
  claim_id text NOT NULL,
  claim_root text NOT NULL CHECK (claim_root ~ '^sha256:[0-9a-f]{64}$'),
  standing text NOT NULL CHECK (standing IN ('accepted', 'unassessed', 'corrected', 'superseded', 'retracted')),
  assertion text NOT NULL,
  assertion_kind text NOT NULL,
  conditions jsonb NOT NULL,
  created_at timestamptz,
  source_title text,
  source_type text,
  evidence_count integer NOT NULL CHECK (evidence_count >= 0),
  imported_object_id text,
  imported_object_root text CHECK (imported_object_root IS NULL OR imported_object_root ~ '^sha256:[0-9a-f]{64}$'),
  contested boolean NOT NULL DEFAULT false,
  retracted boolean NOT NULL DEFAULT false,
  source_path text NOT NULL,
  record jsonb NOT NULL,
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id, claim_id),
  UNIQUE (release_root, repository_id, claim_root),
  FOREIGN KEY (release_root, repository_id)
    REFERENCES projection.repositories(release_root, repository_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projection.reviews (
  release_root text NOT NULL,
  repository_id text NOT NULL,
  proposal_id text NOT NULL,
  status text NOT NULL,
  kind text NOT NULL,
  target text NOT NULL,
  claim text NOT NULL,
  content_root text,
  receipt_root text,
  created_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  decision_actor_class text
    CHECK (decision_actor_class IS NULL OR decision_actor_class IN ('human', 'agent')),
  decision_session_ref text,
  decision_authority_principal_id text,
  decision_event_id text,
  decision_plan_root text,
  decision_provenance text NOT NULL,
  applied_event_id text,
  decision_reason text,
  decision_packet jsonb,
  proposed_state_preview jsonb,
  -- What became of the Claim after this Proposal was accepted. `status` is the
  -- Proposal's own axis and stays `accepted`; this is the Claim's. NULL means
  -- the Claim is still whatever the Proposal made it.
  claim_retirement text
    CHECK (claim_retirement IS NULL OR claim_retirement IN ('corrected', 'superseded')),
  retired_by_claim_id text,
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id, proposal_id),
  FOREIGN KEY (release_root, repository_id)
    REFERENCES projection.repositories(release_root, repository_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projection.submissions (
  release_root text NOT NULL,
  repository_id text NOT NULL,
  submission_id text NOT NULL,
  submission_root text NOT NULL CHECK (submission_root ~ '^sha256:[0-9a-f]{64}$'),
  proposal_id text NOT NULL,
  claim_id text,
  producer_actor text,
  submitted_at timestamptz,
  source_path text NOT NULL,
  record jsonb NOT NULL,
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id, submission_id),
  FOREIGN KEY (release_root, repository_id)
    REFERENCES projection.repositories(release_root, repository_id) ON DELETE CASCADE,
  FOREIGN KEY (release_root, repository_id, proposal_id)
    REFERENCES projection.reviews(release_root, repository_id, proposal_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projection.verifications (
  release_root text NOT NULL,
  repository_id text NOT NULL,
  verification_record_id text NOT NULL,
  verification_root text NOT NULL CHECK (verification_root ~ '^sha256:[0-9a-f]{64}$'),
  submission_id text NOT NULL,
  submission_root text NOT NULL CHECK (submission_root ~ '^sha256:[0-9a-f]{64}$'),
  proposal_id text NOT NULL,
  claim_id text,
  outcome text NOT NULL,
  -- The exact property this record observed, and the limits it declared.
  -- Both live in `record` too; they are columns so a surface can count them.
  -- Nullable because both are optional on the record, and an absent scope is
  -- not the same statement as an empty one.
  property text,
  does_not_establish jsonb,
  verifier_actor text NOT NULL,
  -- Optional typed performer provenance. Historical and non-review methods
  -- remain NULL rather than being guessed from an actor or profile string.
  reviewer_kind text CHECK (
    reviewer_kind IS NULL OR reviewer_kind IN ('human', 'ai_model', 'organization', 'deterministic_tool')
  ),
  reviewer_display_name text,
  reviewer_identifier text,
  reviewer_provider text,
  reviewer_version text,
  review_method_root text CHECK (
    review_method_root IS NULL OR review_method_root ~ '^sha256:[0-9a-f]{64}$'
  ),
  completed_at timestamptz,
  source_path text NOT NULL,
  record jsonb NOT NULL,
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id, verification_record_id),
  FOREIGN KEY (release_root, repository_id, submission_id)
    REFERENCES projection.submissions(release_root, repository_id, submission_id) ON DELETE CASCADE,
  FOREIGN KEY (release_root, repository_id, proposal_id)
    REFERENCES projection.reviews(release_root, repository_id, proposal_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projection.graph_nodes (
  release_root text NOT NULL,
  repository_id text NOT NULL,
  node_id text NOT NULL,
  kind text NOT NULL,
  label text NOT NULL,
  plane text,
  trust text,
  standing text NOT NULL,
  href text,
  x double precision NOT NULL,
  y double precision NOT NULL,
  content jsonb NOT NULL,
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id, node_id),
  FOREIGN KEY (release_root, repository_id)
    REFERENCES projection.repositories(release_root, repository_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projection.graph_edges (
  release_root text NOT NULL,
  repository_id text NOT NULL,
  edge_id text NOT NULL,
  source_id text NOT NULL,
  target_id text NOT NULL,
  relation text NOT NULL,
  trust text,
  inferred boolean NOT NULL,
  source_root text,
  evidence text,
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id, edge_id),
  FOREIGN KEY (release_root, repository_id, source_id)
    REFERENCES projection.graph_nodes(release_root, repository_id, node_id) ON DELETE CASCADE,
  FOREIGN KEY (release_root, repository_id, target_id)
    REFERENCES projection.graph_nodes(release_root, repository_id, node_id) ON DELETE CASCADE
);

/* The Repository's own history.
   The projection retained one commit per Repository per release — twelve rows
   against seven hundred real commits — so a product whose claim is that
   scientific state lives in Git could not name a single commit but the head it
   happened to pin. Author name only: the repositories are public, but a read
   model has no reason to hold addresses. */
CREATE TABLE IF NOT EXISTS projection.commits (
  release_root text NOT NULL,
  repository_id text NOT NULL,
  sha text NOT NULL CHECK (sha ~ '^[0-9a-f]{40}$'),
  parent_sha text CHECK (parent_sha IS NULL OR parent_sha ~ '^[0-9a-f]{40}$'),
  author_name text NOT NULL,
  committed_at timestamptz NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  changed_paths jsonb NOT NULL CHECK (jsonb_typeof(changed_paths) = 'array'),
  /* Written by the CLI rather than by hand. Derivable from the subject, stored
     because the two populations are the thing worth separating on screen and a
     reader should not have to know the CLI's prefix to see it. */
  machine boolean NOT NULL,
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id, sha),
  FOREIGN KEY (release_root, repository_id)
    REFERENCES projection.repositories(release_root, repository_id) ON DELETE CASCADE
);

/* Exact historical read states. The projected Repository id owns the route;
   source_repository_id is the identity replayed at that Git commit and may
   differ across an explicitly visible re-genesis boundary. A revision is exact
   only when replay_state is verified and repository_root is present. */
CREATE TABLE IF NOT EXISTS projection.repository_revisions (
  release_root text NOT NULL,
  repository_id text NOT NULL,
  git_commit text NOT NULL CHECK (git_commit ~ '^[0-9a-f]{40}$'),
  parent_commit text CHECK (parent_commit IS NULL OR parent_commit ~ '^[0-9a-f]{40}$'),
  git_tree text NOT NULL CHECK (git_tree ~ '^[0-9a-f]{40}$'),
  source_repository_id text NOT NULL CHECK (length(source_repository_id) > 0),
  source_index_root text NOT NULL CHECK (source_index_root ~ '^sha256:[0-9a-f]{64}$'),
  repository_root text CHECK (repository_root IS NULL OR repository_root ~ '^sha256:[0-9a-f]{64}$'),
  replay_state text NOT NULL CHECK (replay_state IN ('verified', 'unavailable')),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  CHECK (
    (replay_state = 'verified' AND repository_root IS NOT NULL)
    OR (replay_state = 'unavailable' AND repository_root IS NULL)
  ),
  PRIMARY KEY (release_root, repository_id, git_commit),
  UNIQUE (release_root, repository_id, row_root),
  FOREIGN KEY (release_root, repository_id)
    REFERENCES projection.repositories(release_root, repository_id) ON DELETE CASCADE
);

/* What a commit did to scientific state, parsed rather than diffed.
   `.vela/repository.json` is 842,088 bytes on one line, so `git diff` reports a
   Decision as one insertion and one deletion and GitHub's diff view is no
   better. The story is the index delta: one Claim moving from pending to
   accepted. Only commits that touch the index get a row — 56 of 495 in the
   largest Repository. */
CREATE TABLE IF NOT EXISTS projection.repository_transitions (
  release_root text NOT NULL,
  repository_id text NOT NULL,
  commit_sha text NOT NULL CHECK (commit_sha ~ '^[0-9a-f]{40}$'),
  parent_sha text CHECK (parent_sha IS NULL OR parent_sha ~ '^[0-9a-f]{40}$'),
  repository_root_before text CHECK (repository_root_before IS NULL OR repository_root_before ~ '^sha256:[0-9a-f]{64}$'),
  repository_root_after text NOT NULL CHECK (repository_root_after ~ '^sha256:[0-9a-f]{64}$'),
  accepted_added jsonb NOT NULL CHECK (jsonb_typeof(accepted_added) = 'array'),
  accepted_removed jsonb NOT NULL CHECK (jsonb_typeof(accepted_removed) = 'array'),
  pending_added jsonb NOT NULL CHECK (jsonb_typeof(pending_added) = 'array'),
  pending_removed jsonb NOT NULL CHECK (jsonb_typeof(pending_removed) = 'array'),
  counts jsonb NOT NULL CHECK (jsonb_typeof(counts) = 'object'),
  comparison_state text NOT NULL CHECK (comparison_state IN ('verified', 'unavailable')),
  before_revision_root text CHECK (before_revision_root IS NULL OR before_revision_root ~ '^sha256:[0-9a-f]{64}$'),
  after_revision_root text CHECK (after_revision_root IS NULL OR after_revision_root ~ '^sha256:[0-9a-f]{64}$'),
  semantic_delta jsonb CHECK (semantic_delta IS NULL OR jsonb_typeof(semantic_delta) = 'object'),
  semantic_delta_root text CHECK (semantic_delta_root IS NULL OR semantic_delta_root ~ '^sha256:[0-9a-f]{64}$'),
  CHECK (
    (comparison_state = 'verified' AND before_revision_root IS NOT NULL
      AND after_revision_root IS NOT NULL AND semantic_delta IS NOT NULL
      AND semantic_delta_root IS NOT NULL)
    OR (comparison_state = 'unavailable' AND semantic_delta IS NULL
      AND semantic_delta_root IS NULL)
  ),
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id, commit_sha),
  FOREIGN KEY (release_root, repository_id, commit_sha)
    REFERENCES projection.commits(release_root, repository_id, sha) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projection.search_documents (
  release_root text NOT NULL,
  repository_id text NOT NULL,
  kind text NOT NULL,
  document_id text NOT NULL,
  assertion text NOT NULL,
  source_title text,
  standing text NOT NULL,
  href text NOT NULL,
  /* Generated, because it is a restatement of three columns in its own row and
     nothing else. The builder used to compute it in JavaScript and insert it,
     which put the definition of "what is searchable" in a different language in
     a different file from the data, and left nothing able to say the two agreed.
     They did — 0 of 12,510 retained rows differed — but only by inspection. */
  search_text text GENERATED ALWAYS AS (
    lower(document_id || ' ' || assertion || ' ' || coalesce(source_title, ''))
  ) STORED,
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id, kind, document_id),
  FOREIGN KEY (release_root, repository_id)
    REFERENCES projection.repositories(release_root, repository_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projection.source_declarations (
  declaration_root text PRIMARY KEY CHECK (declaration_root ~ '^sha256:[0-9a-f]{64}$'),
  source_id text NOT NULL CHECK (length(source_id) > 0),
  native_namespace text NOT NULL CHECK (length(native_namespace) > 0),
  publisher_or_maintainer text NOT NULL CHECK (length(publisher_or_maintainer) > 0),
  locators jsonb NOT NULL CHECK (jsonb_typeof(locators) = 'array'),
  attributed_claims jsonb NOT NULL CHECK (jsonb_typeof(attributed_claims) = 'array'),
  source_kind text NOT NULL CHECK (length(source_kind) > 0),
  rights jsonb NOT NULL CHECK (jsonb_typeof(rights) = 'object'),
  snapshot_policy jsonb NOT NULL CHECK (jsonb_typeof(snapshot_policy) = 'object'),
  adapter jsonb NOT NULL CHECK (jsonb_typeof(adapter) = 'object'),
  coverage jsonb NOT NULL CHECK (jsonb_typeof(coverage) = 'object'),
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  UNIQUE (declaration_root, source_id)
);

CREATE TABLE IF NOT EXISTS projection.source_observations (
  observation_root text PRIMARY KEY CHECK (observation_root ~ '^sha256:[0-9a-f]{64}$'),
  source_id text NOT NULL CHECK (length(source_id) > 0),
  observation_id text NOT NULL CHECK (length(observation_id) > 0),
  declaration_root text NOT NULL CHECK (declaration_root ~ '^sha256:[0-9a-f]{64}$'),
  acquisition_root text NOT NULL CHECK (acquisition_root ~ '^sha256:[0-9a-f]{64}$'),
  observed_at text NOT NULL CHECK (length(observed_at) > 0),
  native_revision jsonb NOT NULL CHECK (jsonb_typeof(native_revision) = 'object'),
  snapshot_root text CHECK (snapshot_root IS NULL OR snapshot_root ~ '^sha256:[0-9a-f]{64}$'),
  snapshot_state text NOT NULL CONSTRAINT source_observations_snapshot_state_check CHECK (
    snapshot_state IN ('reference_only', 'content_root_only', 'retained_exact_bytes', 'existing_repository_bytes')
  ),
  projected_record_count bigint NOT NULL CHECK (projected_record_count >= 0),
  projected_records_root text NOT NULL CHECK (projected_records_root ~ '^sha256:[0-9a-f]{64}$'),
  coverage jsonb NOT NULL CHECK (jsonb_typeof(coverage) = 'object'),
  omissions jsonb NOT NULL CHECK (jsonb_typeof(omissions) = 'array'),
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  UNIQUE (observation_root, source_id),
  FOREIGN KEY (declaration_root, source_id)
    REFERENCES projection.source_declarations(declaration_root, source_id),
  CONSTRAINT source_observations_snapshot_root_present_check CHECK (
    (snapshot_state IN ('retained_exact_bytes', 'existing_repository_bytes') AND snapshot_root IS NOT NULL)
    OR (snapshot_state IN ('reference_only', 'content_root_only') AND snapshot_root IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS projection.native_records (
  observation_root text NOT NULL CHECK (observation_root ~ '^sha256:[0-9a-f]{64}$'),
  source_id text NOT NULL CHECK (length(source_id) > 0),
  native_id text NOT NULL CHECK (length(native_id) > 0),
  native_kind text NOT NULL CHECK (length(native_kind) > 0),
  native_revision text,
  title text NOT NULL CHECK (length(title) > 0),
  summary text,
  locators jsonb NOT NULL CHECK (jsonb_typeof(locators) = 'array'),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  metadata_root text NOT NULL CHECK (metadata_root ~ '^sha256:[0-9a-f]{64}$'),
  content_root text CHECK (content_root IS NULL OR content_root ~ '^sha256:[0-9a-f]{64}$'),
  availability text NOT NULL CHECK (
    availability IN ('available', 'reference_only', 'tombstoned', 'inaccessible')
  ),
  search_document tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', native_id || ' ' || title || ' ' || COALESCE(summary, ''))
  ) STORED,
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (observation_root, native_id),
  FOREIGN KEY (observation_root, source_id)
    REFERENCES projection.source_observations(observation_root, source_id) ON DELETE CASCADE,
  CHECK (availability <> 'available' OR content_root IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS projection.release_sources (
  release_root text NOT NULL
    REFERENCES projection.releases(release_root) ON DELETE CASCADE
    CHECK (release_root ~ '^sha256:[0-9a-f]{64}$'),
  source_id text NOT NULL CHECK (length(source_id) > 0),
  declaration_root text NOT NULL CHECK (declaration_root ~ '^sha256:[0-9a-f]{64}$'),
  observation_root text NOT NULL CHECK (observation_root ~ '^sha256:[0-9a-f]{64}$'),
  native_record_count bigint NOT NULL CHECK (native_record_count >= 0),
  repository_binding_count bigint NOT NULL CHECK (repository_binding_count >= 0),
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, source_id),
  FOREIGN KEY (declaration_root, source_id)
    REFERENCES projection.source_declarations(declaration_root, source_id),
  FOREIGN KEY (observation_root, source_id)
    REFERENCES projection.source_observations(observation_root, source_id)
);

CREATE TABLE IF NOT EXISTS projection.repository_source_bindings (
  release_root text NOT NULL CHECK (release_root ~ '^sha256:[0-9a-f]{64}$'),
  repository_id text NOT NULL,
  binding_id text NOT NULL CHECK (length(binding_id) > 0),
  source_id text NOT NULL,
  observation_root text NOT NULL CHECK (observation_root ~ '^sha256:[0-9a-f]{64}$'),
  native_id text,
  native_record_root text CHECK (native_record_root IS NULL OR native_record_root ~ '^sha256:[0-9a-f]{64}$'),
  binding_kind text NOT NULL CHECK (binding_kind IN ('reference', 'snapshot', 'admission')),
  repository_object_kind text NOT NULL CHECK (length(repository_object_kind) > 0),
  repository_object_id text NOT NULL CHECK (length(repository_object_id) > 0),
  repository_object_root text NOT NULL CHECK (repository_object_root ~ '^sha256:[0-9a-f]{64}$'),
  local_standing_effect text NOT NULL CHECK (
    local_standing_effect IN ('none', 'pending', 'accepted', 'rejected', 'withdrawn')
  ),
  binding_root text NOT NULL CHECK (binding_root ~ '^sha256:[0-9a-f]{64}$'),
  row_root text NOT NULL CHECK (row_root ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (release_root, repository_id, binding_id),
  FOREIGN KEY (release_root, repository_id)
    REFERENCES projection.repositories(release_root, repository_id) ON DELETE CASCADE,
  FOREIGN KEY (release_root, source_id)
    REFERENCES projection.release_sources(release_root, source_id) ON DELETE CASCADE,
  FOREIGN KEY (observation_root, source_id)
    REFERENCES projection.source_observations(observation_root, source_id),
  CHECK (binding_kind = 'admission' OR local_standing_effect = 'none'),
  CHECK (native_record_root IS NULL OR native_id IS NOT NULL),
  CHECK (binding_kind <> 'snapshot' OR native_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS projection_claims_standing_idx
  ON projection.claims (release_root, repository_id, standing, claim_id);
CREATE INDEX IF NOT EXISTS projection_claims_imported_object_idx
  ON projection.claims (release_root, repository_id, imported_object_id);
CREATE INDEX IF NOT EXISTS projection_reviews_status_idx
  ON projection.reviews (release_root, repository_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS projection_submissions_proposal_idx
  ON projection.submissions (release_root, repository_id, proposal_id);
CREATE INDEX IF NOT EXISTS projection_verifications_proposal_idx
  ON projection.verifications (release_root, repository_id, proposal_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS verifications_property_idx
  ON projection.verifications (release_root, repository_id, property);
CREATE INDEX IF NOT EXISTS reviews_claim_retirement_idx
  ON projection.reviews (release_root, repository_id, claim_retirement);
CREATE INDEX IF NOT EXISTS projection_graph_nodes_kind_idx
  ON projection.graph_nodes (release_root, repository_id, kind, node_id);
CREATE INDEX IF NOT EXISTS projection_graph_edges_source_idx
  ON projection.graph_edges (release_root, repository_id, source_id);
CREATE INDEX IF NOT EXISTS projection_graph_edges_target_idx
  ON projection.graph_edges (release_root, repository_id, target_id);
CREATE INDEX IF NOT EXISTS projection_commits_recent_idx
  ON projection.commits (release_root, repository_id, committed_at DESC, sha);
CREATE INDEX IF NOT EXISTS projection_repository_revisions_commit_idx
  ON projection.repository_revisions (release_root, repository_id, git_commit);
CREATE INDEX IF NOT EXISTS projection_search_documents_idx
  ON projection.search_documents (release_root, repository_id, kind, standing, document_id);
CREATE INDEX IF NOT EXISTS projection_source_observations_latest_idx
  ON projection.source_observations (source_id, observed_at DESC, observation_id);
CREATE INDEX IF NOT EXISTS projection_native_records_page_idx
  ON projection.native_records (observation_root, native_kind, native_id)
  INCLUDE (availability, metadata_root, content_root, row_root);
CREATE INDEX IF NOT EXISTS projection_native_records_search_idx
  ON projection.native_records USING gin (search_document);
CREATE INDEX IF NOT EXISTS projection_release_sources_observation_idx
  ON projection.release_sources (release_root, observation_root, source_id);
CREATE INDEX IF NOT EXISTS projection_repository_source_bindings_object_idx
  ON projection.repository_source_bindings (
    release_root, repository_id, repository_object_kind, repository_object_id
  );
CREATE INDEX IF NOT EXISTS projection_repository_source_bindings_native_idx
  ON projection.repository_source_bindings (
    release_root, source_id, observation_root, native_id, repository_id
  );

-- Projection grants belong to the stable NOLOGIN permission role. Versioned
-- runtime logins inherit this role and receive no direct schema or table grant.
REVOKE ALL ON SCHEMA public FROM vela_projection_reader;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM vela_projection_reader;
REVOKE CREATE ON SCHEMA public FROM vela_projection_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA projection
  REVOKE ALL PRIVILEGES ON TABLES FROM vela_projection_reader;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA projection
  FROM vela_projection_reader;
REVOKE CREATE ON SCHEMA projection FROM vela_projection_reader;
GRANT USAGE ON SCHEMA projection TO vela_projection_reader;
GRANT SELECT ON TABLE
  projection.releases,
  projection.schema_migrations,
  projection.current_release,
  projection.repositories,
  projection.claims,
  projection.reviews,
  projection.submissions,
  projection.verifications,
  projection.graph_nodes,
  projection.graph_edges,
  projection.commits,
  projection.repository_revisions,
  projection.repository_transitions,
  projection.search_documents,
  projection.source_declarations,
  projection.source_observations,
  projection.native_records,
  projection.release_sources,
  projection.repository_source_bindings
TO vela_projection_reader;
