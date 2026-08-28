SET LOCAL ROLE vela_activity_owner;

CREATE SCHEMA IF NOT EXISTS activity AUTHORIZATION vela_activity_owner;
CREATE SCHEMA IF NOT EXISTS activity_api AUTHORIZATION vela_activity_owner;

CREATE TABLE IF NOT EXISTS activity.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workos_user_id text NOT NULL UNIQUE CHECK (workos_user_id ~ '^user_[A-Za-z0-9]+$'),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (length(btrim(email)) BETWEEN 3 AND 320),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN activity.accounts.workos_user_id IS
  'Hosted product identity only. It is never a Vela actor or repository principal.';

CREATE TABLE IF NOT EXISTS activity.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  created_by_account_id uuid NOT NULL REFERENCES activity.accounts(id),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity.workspace_memberships (
  workspace_id uuid NOT NULL REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES activity.accounts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, account_id)
);

CREATE TABLE IF NOT EXISTS activity.scientific_anchors (
  workspace_id uuid NOT NULL REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  anchor_root text NOT NULL CHECK (anchor_root ~ '^sha256:[0-9a-f]{64}$'),
  projection_release_root text NOT NULL CHECK (projection_release_root ~ '^sha256:[0-9a-f]{64}$'),
  repository_id text NOT NULL CHECK (length(repository_id) BETWEEN 1 AND 200),
  repository_root text NOT NULL CHECK (repository_root ~ '^sha256:[0-9a-f]{64}$'),
  source_commit text NOT NULL CHECK (source_commit ~ '^[0-9a-f]{40}$'),
  source_tree text NOT NULL CHECK (source_tree ~ '^[0-9a-f]{40}$'),
  problem_id text NOT NULL CHECK (length(problem_id) BETWEEN 1 AND 200),
  problem_record_root text NOT NULL CHECK (problem_record_root ~ '^sha256:[0-9a-f]{64}$'),
  source_observation_root text CHECK (source_observation_root IS NULL OR source_observation_root ~ '^sha256:[0-9a-f]{64}$'),
  claim_id text CHECK (claim_id IS NULL OR claim_id ~ '^vcl_[0-9a-f]{64}$'),
  claim_root text CHECK (claim_root IS NULL OR claim_root ~ '^sha256:[0-9a-f]{64}$'),
  claim_standing text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, anchor_root),
  CHECK ((claim_id IS NULL) = (claim_root IS NULL))
);

CREATE TABLE IF NOT EXISTS activity.follows (
  workspace_id uuid NOT NULL REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES activity.accounts(id) ON DELETE CASCADE,
  anchor_root text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, account_id, anchor_root),
  FOREIGN KEY (workspace_id, anchor_root)
    REFERENCES activity.scientific_anchors(workspace_id, anchor_root) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity.approaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  anchor_root text NOT NULL,
  parent_approach_id uuid,
  created_by_account_id uuid NOT NULL REFERENCES activity.accounts(id),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
  summary text NOT NULL CHECK (length(btrim(summary)) BETWEEN 1 AND 16000),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'paused', 'completed', 'abandoned')),
  authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none'),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, anchor_root, id),
  FOREIGN KEY (workspace_id, anchor_root)
    REFERENCES activity.scientific_anchors(workspace_id, anchor_root) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, anchor_root, parent_approach_id)
    REFERENCES activity.approaches(workspace_id, anchor_root, id)
);

CREATE TABLE IF NOT EXISTS activity.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  anchor_root text NOT NULL,
  approach_id uuid NOT NULL,
  created_by_account_id uuid NOT NULL REFERENCES activity.accounts(id),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
  state text NOT NULL DEFAULT 'planned'
    CHECK (state IN ('planned', 'running', 'paused', 'completed', 'failed', 'abandoned')),
  authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none'),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, anchor_root, id),
  FOREIGN KEY (workspace_id, anchor_root)
    REFERENCES activity.scientific_anchors(workspace_id, anchor_root) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, anchor_root, approach_id)
    REFERENCES activity.approaches(workspace_id, anchor_root, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity.discussion_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  anchor_root text NOT NULL,
  approach_id uuid,
  attempt_id uuid,
  author_account_id uuid NOT NULL REFERENCES activity.accounts(id),
  kind text NOT NULL CHECK (kind IN ('comment', 'note')),
  visibility text NOT NULL CHECK (visibility IN ('workspace', 'private')),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 32000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'comment' OR visibility = 'workspace'),
  FOREIGN KEY (workspace_id, anchor_root)
    REFERENCES activity.scientific_anchors(workspace_id, anchor_root) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, anchor_root, approach_id)
    REFERENCES activity.approaches(workspace_id, anchor_root, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, anchor_root, attempt_id)
    REFERENCES activity.attempts(workspace_id, anchor_root, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity.artifact_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  anchor_root text NOT NULL,
  attempt_id uuid,
  attached_by_account_id uuid NOT NULL REFERENCES activity.accounts(id),
  content_root text NOT NULL CHECK (content_root ~ '^sha256:[0-9a-f]{64}$'),
  metadata_root text CHECK (metadata_root IS NULL OR metadata_root ~ '^sha256:[0-9a-f]{64}$'),
  kind text NOT NULL CHECK (length(btrim(kind)) BETWEEN 1 AND 200),
  path text NOT NULL CHECK (length(btrim(path)) BETWEEN 1 AND 4000),
  media_type text CHECK (media_type IS NULL OR length(media_type) BETWEEN 1 AND 200),
  byte_size bigint CHECK (byte_size IS NULL OR byte_size >= 0),
  locator text CHECK (locator IS NULL OR length(locator) BETWEEN 1 AND 4000),
  authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, anchor_root, content_root, path),
  FOREIGN KEY (workspace_id, anchor_root)
    REFERENCES activity.scientific_anchors(workspace_id, anchor_root) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, anchor_root, attempt_id)
    REFERENCES activity.attempts(workspace_id, anchor_root, id) ON DELETE CASCADE
);

COMMENT ON TABLE activity.artifact_refs IS
  'Content roots and bounded metadata only. Artifact bytes are never stored in Postgres.';

CREATE TABLE IF NOT EXISTS activity.submission_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  anchor_root text NOT NULL,
  created_by_account_id uuid NOT NULL REFERENCES activity.accounts(id),
  schema_name text NOT NULL DEFAULT 'vela.submission.v3' CHECK (schema_name = 'vela.submission.v3'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  payload_root text NOT NULL CHECK (payload_root ~ '^sha256:[0-9a-f]{64}$'),
  authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none'),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, anchor_root)
    REFERENCES activity.scientific_anchors(workspace_id, anchor_root) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity.idempotency_records (
  account_id uuid NOT NULL REFERENCES activity.accounts(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  workspace_id uuid REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  command_kind text NOT NULL,
  request_root text NOT NULL CHECK (request_root ~ '^sha256:[0-9a-f]{64}$'),
  response jsonb NOT NULL CHECK (jsonb_typeof(response) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS activity.activity_audit_entries (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id uuid REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES activity.accounts(id),
  anchor_root text,
  operation text NOT NULL CHECK (operation IN (
    'workspace.create', 'follow.set', 'approach.create', 'approach.fork',
    'attempt.create', 'attempt.update', 'discussion.add',
    'artifact.attach', 'submission_draft.save'
  )),
  subject_kind text NOT NULL CHECK (subject_kind IN (
    'workspace', 'follow', 'approach', 'attempt', 'discussion',
    'artifact_ref', 'submission_draft'
  )),
  subject_id text NOT NULL CHECK (length(subject_id) BETWEEN 1 AND 200),
  request_root text NOT NULL CHECK (request_root ~ '^sha256:[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, anchor_root)
    REFERENCES activity.scientific_anchors(workspace_id, anchor_root) ON DELETE CASCADE,
  CHECK (anchor_root IS NULL OR workspace_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS activity_anchors_problem_idx
  ON activity.scientific_anchors (workspace_id, repository_id, problem_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS activity_approaches_problem_idx
  ON activity.approaches (workspace_id, anchor_root, updated_at DESC);
CREATE INDEX IF NOT EXISTS activity_attempts_approach_idx
  ON activity.attempts (workspace_id, approach_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS activity_discussion_problem_idx
  ON activity.discussion_entries (workspace_id, anchor_root, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_artifact_refs_problem_idx
  ON activity.artifact_refs (workspace_id, anchor_root, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_drafts_problem_idx
  ON activity.submission_drafts (workspace_id, anchor_root, updated_at DESC);
CREATE INDEX IF NOT EXISTS activity_audit_problem_idx
  ON activity.activity_audit_entries (workspace_id, anchor_root, sequence DESC);

CREATE OR REPLACE FUNCTION activity.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, activity
AS $function$
BEGIN
  RAISE EXCEPTION 'activity audit entries are append-only' USING ERRCODE = '42501';
END
$function$;

DROP TRIGGER IF EXISTS activity_audit_append_only ON activity.activity_audit_entries;
CREATE TRIGGER activity_audit_append_only
BEFORE UPDATE OR DELETE ON activity.activity_audit_entries
FOR EACH ROW EXECUTE FUNCTION activity.reject_audit_mutation();

CREATE OR REPLACE FUNCTION activity.require_membership(p_account_id uuid, p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  member_role text;
BEGIN
  SELECT role INTO member_role
  FROM activity.workspace_memberships
  WHERE workspace_id = p_workspace_id AND account_id = p_account_id;
  IF member_role IS NULL THEN
    RAISE EXCEPTION 'workspace membership required' USING ERRCODE = 'VA403';
  END IF;
  RETURN member_role;
END
$function$;

CREATE OR REPLACE FUNCTION activity.ensure_anchor(p_workspace_id uuid, p_anchor jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  root text := p_anchor->>'root';
  existing activity.scientific_anchors%ROWTYPE;
BEGIN
  IF root IS NULL THEN RAISE EXCEPTION 'anchor root is required' USING ERRCODE = '22023'; END IF;
  SELECT * INTO existing FROM activity.scientific_anchors
  WHERE workspace_id = p_workspace_id AND anchor_root = root;
  IF existing.anchor_root IS NOT NULL AND (
    existing.projection_release_root IS DISTINCT FROM p_anchor->>'projection_release_root'
    OR existing.repository_id IS DISTINCT FROM p_anchor->>'repository_id'
    OR existing.repository_root IS DISTINCT FROM p_anchor->>'repository_root'
    OR existing.source_commit IS DISTINCT FROM p_anchor->>'source_commit'
    OR existing.source_tree IS DISTINCT FROM p_anchor->>'source_tree'
    OR existing.problem_id IS DISTINCT FROM p_anchor->>'problem_id'
    OR existing.problem_record_root IS DISTINCT FROM p_anchor->>'problem_record_root'
    OR existing.source_observation_root IS DISTINCT FROM nullif(p_anchor->>'source_observation_root', '')
    OR existing.claim_id IS DISTINCT FROM nullif(p_anchor->>'claim_id', '')
    OR existing.claim_root IS DISTINCT FROM nullif(p_anchor->>'claim_root', '')
    OR existing.claim_standing IS DISTINCT FROM nullif(p_anchor->>'claim_standing', '')
  ) THEN
    RAISE EXCEPTION 'anchor root does not match stored anchor fields' USING ERRCODE = '22023';
  END IF;
  INSERT INTO activity.scientific_anchors (
    anchor_root, workspace_id, projection_release_root, repository_id, repository_root,
    source_commit, source_tree, problem_id, problem_record_root, source_observation_root,
    claim_id, claim_root, claim_standing
  ) VALUES (
    root, p_workspace_id, p_anchor->>'projection_release_root', p_anchor->>'repository_id',
    p_anchor->>'repository_root', p_anchor->>'source_commit', p_anchor->>'source_tree',
    p_anchor->>'problem_id', p_anchor->>'problem_record_root',
    nullif(p_anchor->>'source_observation_root', ''), nullif(p_anchor->>'claim_id', ''),
    nullif(p_anchor->>'claim_root', ''), nullif(p_anchor->>'claim_standing', '')
  ) ON CONFLICT (workspace_id, anchor_root) DO NOTHING;
  RETURN root;
END
$function$;

CREATE OR REPLACE FUNCTION activity.require_anchor_targets(
  p_workspace_id uuid,
  p_anchor_root text,
  p_approach_id uuid,
  p_attempt_id uuid
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  target_approach_id uuid;
BEGIN
  IF p_approach_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM activity.approaches
    WHERE id = p_approach_id
      AND workspace_id = p_workspace_id
      AND anchor_root = p_anchor_root
  ) THEN
    RAISE EXCEPTION 'Approach is not attached to this Problem anchor' USING ERRCODE = 'VA404';
  END IF;

  IF p_attempt_id IS NOT NULL THEN
    SELECT approach_id INTO target_approach_id
    FROM activity.attempts
    WHERE id = p_attempt_id
      AND workspace_id = p_workspace_id
      AND anchor_root = p_anchor_root;
    IF target_approach_id IS NULL THEN
      RAISE EXCEPTION 'Attempt is not attached to this Problem anchor' USING ERRCODE = 'VA404';
    END IF;
    IF p_approach_id IS NOT NULL AND target_approach_id <> p_approach_id THEN
      RAISE EXCEPTION 'Attempt does not belong to the requested Approach' USING ERRCODE = '22023';
    END IF;
  END IF;
END
$function$;

CREATE OR REPLACE FUNCTION activity_api.ensure_account(
  p_workos_user_id text, p_display_name text, p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  answer activity.accounts%ROWTYPE;
BEGIN
  IF p_workos_user_id !~ '^user_[A-Za-z0-9]+$'
    OR length(btrim(p_display_name)) NOT BETWEEN 1 AND 200
    OR length(btrim(p_email)) NOT BETWEEN 3 AND 320 THEN
    RAISE EXCEPTION 'invalid hosted account identity' USING ERRCODE = '22023';
  END IF;
  INSERT INTO activity.accounts (workos_user_id, display_name, email)
  VALUES (p_workos_user_id, btrim(p_display_name), lower(btrim(p_email)))
  ON CONFLICT (workos_user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    updated_at = now()
  RETURNING * INTO answer;
  RETURN to_jsonb(answer);
END
$function$;

CREATE OR REPLACE FUNCTION activity_api.create_workspace(
  p_account_id uuid, p_slug text, p_name text, p_idempotency_key text, p_request_root text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  prior activity.idempotency_records%ROWTYPE;
  workspace activity.workspaces%ROWTYPE;
  answer jsonb;
BEGIN
  PERFORM 1 FROM activity.accounts WHERE id = p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found' USING ERRCODE = 'VA404'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_account_id::text || ':' || p_idempotency_key, 0));
  SELECT * INTO prior FROM activity.idempotency_records
    WHERE account_id = p_account_id AND idempotency_key = p_idempotency_key;
  IF prior.account_id IS NOT NULL THEN
    IF prior.request_root <> p_request_root THEN
      RAISE EXCEPTION 'idempotency key was reused with different input' USING ERRCODE = 'VAI01';
    END IF;
    RETURN prior.response;
  END IF;
  INSERT INTO activity.workspaces (slug, name, created_by_account_id)
  VALUES (p_slug, btrim(p_name), p_account_id) RETURNING * INTO workspace;
  INSERT INTO activity.workspace_memberships (workspace_id, account_id, role)
  VALUES (workspace.id, p_account_id, 'owner');
  answer := to_jsonb(workspace) || jsonb_build_object('role', 'owner');
  INSERT INTO activity.activity_audit_entries
    (workspace_id, account_id, operation, subject_kind, subject_id, request_root)
  VALUES (workspace.id, p_account_id, 'workspace.create', 'workspace', workspace.id::text, p_request_root);
  INSERT INTO activity.idempotency_records
    (account_id, idempotency_key, workspace_id, command_kind, request_root, response)
  VALUES (p_account_id, p_idempotency_key, workspace.id, 'workspace.create', p_request_root, answer);
  RETURN answer;
END
$function$;

/* `list_workspaces` and `get_problem_activity` are defined once each, and not
   here: `workspace-contexts.sql` owns the first and `current-anchor-read.sql`
   the second.

   Both used to be written twice — once in this file and once in the fragment
   that actually takes effect. Every fragment under `schema/` is re-applied on
   every migrate, in filename order, so a schema fragment is a statement of
   desired state rather than a step in a history: a second definition does not
   layer onto the first, it silently wins or loses on alphabetical accident.
   These two lost, which made forty-eight lines here dead code that still read
   as the authoritative definition. `no-duplicate-definitions.test.ts` now fails
   the build if any function is defined in two fragments. */

CREATE OR REPLACE FUNCTION activity_api.export_submission_draft(
  p_account_id uuid, p_workspace_id uuid, p_draft_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  answer jsonb;
BEGIN
  PERFORM activity.require_membership(p_account_id, p_workspace_id);
  SELECT payload INTO answer FROM activity.submission_drafts
  WHERE id = p_draft_id AND workspace_id = p_workspace_id;
  IF answer IS NULL THEN RAISE EXCEPTION 'Submission draft not found' USING ERRCODE = 'VA404'; END IF;
  RETURN answer;
END
$function$;

CREATE OR REPLACE FUNCTION activity_api.execute_command(
  p_account_id uuid,
  p_workspace_id uuid,
  p_kind text,
  p_idempotency_key text,
  p_request_root text,
  p_payload jsonb,
  p_expected_version bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  prior activity.idempotency_records%ROWTYPE;
  v_anchor_root text;
  subject_kind text;
  subject_id text;
  answer jsonb;
  row_count integer;
  source_approach activity.approaches%ROWTYPE;
  approach activity.approaches%ROWTYPE;
  attempt activity.attempts%ROWTYPE;
  entry activity.discussion_entries%ROWTYPE;
  artifact activity.artifact_refs%ROWTYPE;
  draft activity.submission_drafts%ROWTYPE;
  current_state text;
BEGIN
  IF p_kind NOT IN (
    'follow.set', 'approach.create', 'approach.fork', 'attempt.create', 'attempt.update',
    'discussion.add', 'artifact.attach', 'submission_draft.save'
  ) THEN RAISE EXCEPTION 'unsupported activity command' USING ERRCODE = '22023'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'idempotency key must contain 8 to 200 characters' USING ERRCODE = '22023';
  END IF;
  PERFORM activity.require_membership(p_account_id, p_workspace_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_account_id::text || ':' || p_idempotency_key, 0));
  SELECT * INTO prior FROM activity.idempotency_records
    WHERE account_id = p_account_id AND idempotency_key = p_idempotency_key;
  IF prior.account_id IS NOT NULL THEN
    IF prior.request_root <> p_request_root THEN
      RAISE EXCEPTION 'idempotency key was reused with different input' USING ERRCODE = 'VAI01';
    END IF;
    RETURN prior.response;
  END IF;

  IF p_payload ? 'anchor' THEN
    v_anchor_root := activity.ensure_anchor(p_workspace_id, p_payload->'anchor');
  END IF;

  IF p_kind = 'follow.set' THEN
    subject_kind := 'follow'; subject_id := v_anchor_root;
    IF coalesce((p_payload->>'following')::boolean, false) THEN
      INSERT INTO activity.follows (workspace_id, account_id, anchor_root)
      VALUES (p_workspace_id, p_account_id, v_anchor_root) ON CONFLICT DO NOTHING;
      answer := jsonb_build_object('anchor_root', v_anchor_root, 'following', true);
    ELSE
      DELETE FROM activity.follows f WHERE f.workspace_id=p_workspace_id AND f.account_id=p_account_id AND f.anchor_root=v_anchor_root;
      answer := jsonb_build_object('anchor_root', v_anchor_root, 'following', false);
    END IF;

  ELSIF p_kind = 'approach.create' THEN
    INSERT INTO activity.approaches (workspace_id, anchor_root, created_by_account_id, title, summary)
    VALUES (p_workspace_id, v_anchor_root, p_account_id, p_payload->>'title', p_payload->>'summary')
    RETURNING * INTO approach;
    subject_kind := 'approach'; subject_id := approach.id::text; answer := to_jsonb(approach);

  ELSIF p_kind = 'approach.fork' THEN
    SELECT * INTO source_approach FROM activity.approaches
    WHERE id=(p_payload->>'source_approach_id')::uuid AND workspace_id=p_workspace_id FOR UPDATE;
    IF source_approach.id IS NULL THEN RAISE EXCEPTION 'Approach not found' USING ERRCODE='VA404'; END IF;
    IF p_expected_version IS NULL OR source_approach.version <> p_expected_version THEN
      RAISE EXCEPTION 'Approach version conflict' USING ERRCODE='VACAS';
    END IF;
    v_anchor_root := source_approach.anchor_root;
    INSERT INTO activity.approaches
      (workspace_id, anchor_root, parent_approach_id, created_by_account_id, title, summary)
    VALUES (
      p_workspace_id, v_anchor_root, source_approach.id, p_account_id,
      coalesce(nullif(p_payload->>'title',''), source_approach.title || ' (fork)'),
      coalesce(nullif(p_payload->>'summary',''), source_approach.summary)
    ) RETURNING * INTO approach;
    subject_kind := 'approach'; subject_id := approach.id::text; answer := to_jsonb(approach);

  ELSIF p_kind = 'attempt.create' THEN
    SELECT * INTO approach FROM activity.approaches
    WHERE id=(p_payload->>'approach_id')::uuid AND workspace_id=p_workspace_id;
    IF approach.id IS NULL THEN RAISE EXCEPTION 'Approach not found' USING ERRCODE='VA404'; END IF;
    v_anchor_root := approach.anchor_root;
    INSERT INTO activity.attempts
      (workspace_id, anchor_root, approach_id, created_by_account_id, title)
    VALUES (
      p_workspace_id, v_anchor_root, approach.id, p_account_id, p_payload->>'title'
    ) RETURNING * INTO attempt;
    subject_kind := 'attempt'; subject_id := attempt.id::text; answer := to_jsonb(attempt);

  ELSIF p_kind = 'attempt.update' THEN
    SELECT a.state, p.anchor_root INTO current_state, v_anchor_root
    FROM activity.attempts a JOIN activity.approaches p ON p.id=a.approach_id
    WHERE a.id=(p_payload->>'attempt_id')::uuid AND a.workspace_id=p_workspace_id FOR UPDATE OF a;
    IF current_state IS NULL THEN RAISE EXCEPTION 'Attempt not found' USING ERRCODE='VA404'; END IF;
    IF p_payload->>'state' IS NOT NULL AND p_payload->>'state' <> current_state AND NOT (
      (current_state='planned' AND p_payload->>'state' IN ('running','abandoned')) OR
      (current_state='running' AND p_payload->>'state' IN ('paused','completed','failed','abandoned')) OR
      (current_state='paused' AND p_payload->>'state' IN ('running','abandoned'))
    ) THEN RAISE EXCEPTION 'invalid Attempt lifecycle transition' USING ERRCODE='22023'; END IF;
    UPDATE activity.attempts SET
      state=coalesce(nullif(p_payload->>'state',''), state),
      title=coalesce(nullif(p_payload->>'title',''), title),
      version=version+1, updated_at=now()
    WHERE id=(p_payload->>'attempt_id')::uuid AND workspace_id=p_workspace_id AND version=p_expected_version
    RETURNING * INTO attempt;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count <> 1 THEN RAISE EXCEPTION 'Attempt version conflict' USING ERRCODE='VACAS'; END IF;
    subject_kind := 'attempt'; subject_id := attempt.id::text; answer := to_jsonb(attempt);

  ELSIF p_kind = 'discussion.add' THEN
    PERFORM activity.require_anchor_targets(
      p_workspace_id, v_anchor_root, (p_payload->>'approach_id')::uuid, (p_payload->>'attempt_id')::uuid
    );
    INSERT INTO activity.discussion_entries
      (workspace_id, anchor_root, approach_id, attempt_id, author_account_id, kind, visibility, body)
    VALUES (
      p_workspace_id, v_anchor_root, (p_payload->>'approach_id')::uuid,
      (p_payload->>'attempt_id')::uuid, p_account_id, p_payload->>'kind',
      p_payload->>'visibility', p_payload->>'body'
    ) RETURNING * INTO entry;
    subject_kind := 'discussion'; subject_id := entry.id::text; answer := to_jsonb(entry);

  ELSIF p_kind = 'artifact.attach' THEN
    PERFORM activity.require_anchor_targets(
      p_workspace_id, v_anchor_root, NULL, (p_payload->>'attempt_id')::uuid
    );
    INSERT INTO activity.artifact_refs
      (workspace_id, anchor_root, attempt_id, attached_by_account_id, content_root,
       metadata_root, kind, path, media_type, byte_size, locator)
    VALUES (
      p_workspace_id, v_anchor_root, (p_payload->>'attempt_id')::uuid, p_account_id,
      p_payload->>'content_root', nullif(p_payload->>'metadata_root',''), p_payload->>'kind',
      p_payload->>'path', nullif(p_payload->>'media_type',''),
      (p_payload->>'byte_size')::bigint, nullif(p_payload->>'locator','')
    ) RETURNING * INTO artifact;
    subject_kind := 'artifact_ref'; subject_id := artifact.id::text; answer := to_jsonb(artifact);

  ELSIF p_kind = 'submission_draft.save' THEN
    IF p_payload->'payload'->>'schema' <> 'vela.submission.v3'
      OR p_payload->'payload'->'identity'->>'actor_class' <> 'agent'
      OR p_payload->'payload'->'identity'->>'actor_id' <> p_payload->'payload'->'provenance'->>'producer' THEN
      RAISE EXCEPTION 'invalid Submission draft authority boundary' USING ERRCODE='22023';
    END IF;
    IF p_payload->>'draft_id' IS NULL THEN
      INSERT INTO activity.submission_drafts
        (workspace_id, anchor_root, created_by_account_id, payload, payload_root)
      VALUES (
        p_workspace_id, v_anchor_root, p_account_id, p_payload->'payload', p_payload->>'payload_root'
      ) RETURNING * INTO draft;
    ELSE
      UPDATE activity.submission_drafts SET
        anchor_root=v_anchor_root,
        payload=p_payload->'payload',
        payload_root=p_payload->>'payload_root',
        version=version+1, updated_at=now()
      WHERE id=(p_payload->>'draft_id')::uuid AND workspace_id=p_workspace_id AND version=p_expected_version
      RETURNING * INTO draft;
      GET DIAGNOSTICS row_count = ROW_COUNT;
      IF row_count <> 1 THEN RAISE EXCEPTION 'Submission draft version conflict' USING ERRCODE='VACAS'; END IF;
    END IF;
    subject_kind := 'submission_draft'; subject_id := draft.id::text; answer := to_jsonb(draft) - 'payload';
  END IF;

  INSERT INTO activity.activity_audit_entries
    (workspace_id, account_id, anchor_root, operation, subject_kind, subject_id, request_root)
  VALUES (p_workspace_id, p_account_id, v_anchor_root, p_kind, subject_kind, subject_id, p_request_root);
  INSERT INTO activity.idempotency_records
    (account_id, idempotency_key, workspace_id, command_kind, request_root, response)
  VALUES (p_account_id, p_idempotency_key, p_workspace_id, p_kind, p_request_root, answer);
  RETURN answer;
END
$function$;

REVOKE ALL ON SCHEMA activity FROM PUBLIC, vela_activity_app;
REVOKE ALL ON ALL TABLES IN SCHEMA activity FROM PUBLIC, vela_activity_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA activity FROM PUBLIC, vela_activity_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA activity FROM PUBLIC, vela_activity_app;
REVOKE ALL ON SCHEMA activity_api FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA activity_api FROM PUBLIC;
GRANT USAGE ON SCHEMA activity TO vela_activity_migrator;
GRANT USAGE ON SCHEMA activity_api TO vela_activity_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA activity_api TO vela_activity_app;
ALTER DEFAULT PRIVILEGES FOR ROLE vela_activity_owner IN SCHEMA activity
  REVOKE ALL ON TABLES FROM PUBLIC, vela_activity_app;
ALTER DEFAULT PRIVILEGES FOR ROLE vela_activity_owner IN SCHEMA activity_api
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
