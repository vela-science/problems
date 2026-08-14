SET LOCAL ROLE vela_activity_owner;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TABLE IF NOT EXISTS activity.workspace_crdt_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES activity.workspaces(id) ON DELETE CASCADE,
  anchor_root text NOT NULL,
  author_account_id uuid NOT NULL REFERENCES activity.accounts(id),
  document_name text NOT NULL CHECK (document_name = 'canvas'),
  update_root text NOT NULL CHECK (update_root ~ '^sha256:[0-9a-f]{64}$'),
  update_bytes bytea NOT NULL CHECK (octet_length(update_bytes) BETWEEN 1 AND 262144),
  authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, anchor_root)
    REFERENCES activity.scientific_anchors(workspace_id, anchor_root) ON DELETE CASCADE,
  UNIQUE (workspace_id, anchor_root, document_name, update_root)
);

CREATE INDEX IF NOT EXISTS activity_workspace_crdt_problem_idx
  ON activity.workspace_crdt_updates (workspace_id, anchor_root, created_at, id);

ALTER TABLE activity.activity_audit_entries
  DROP CONSTRAINT IF EXISTS activity_audit_entries_operation_check;
ALTER TABLE activity.activity_audit_entries
  ADD CONSTRAINT activity_audit_entries_operation_check CHECK (operation IN (
    'workspace.create', 'follow.set', 'approach.create', 'approach.fork',
    'attempt.create', 'attempt.update', 'discussion.add',
    'artifact.attach', 'submission_draft.save', 'crdt_update.append'
  ));

ALTER TABLE activity.activity_audit_entries
  DROP CONSTRAINT IF EXISTS activity_audit_entries_subject_kind_check;
ALTER TABLE activity.activity_audit_entries
  ADD CONSTRAINT activity_audit_entries_subject_kind_check CHECK (subject_kind IN (
    'workspace', 'follow', 'approach', 'attempt', 'discussion',
    'artifact_ref', 'submission_draft', 'crdt_update'
  ));

CREATE OR REPLACE FUNCTION activity_api.append_workspace_crdt_update(
  p_account_id uuid,
  p_workspace_id uuid,
  p_idempotency_key text,
  p_request_root text,
  p_anchor jsonb,
  p_document_name text,
  p_update_root text,
  p_update_base64 text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity, public
AS $function$
DECLARE
  prior activity.idempotency_records%ROWTYPE;
  v_anchor_root text;
  v_update_bytes bytea;
  entry activity.workspace_crdt_updates%ROWTYPE;
  answer jsonb;
BEGIN
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'idempotency key must contain 8 to 200 characters' USING ERRCODE = '22023';
  END IF;
  IF p_request_root !~ '^sha256:[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'request root is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_document_name <> 'canvas' THEN
    RAISE EXCEPTION 'unsupported CRDT document' USING ERRCODE = '22023';
  END IF;
  IF p_update_root !~ '^sha256:[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'CRDT update root is invalid' USING ERRCODE = '22023';
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

  BEGIN
    v_update_bytes := decode(p_update_base64, 'base64');
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'CRDT update is not valid base64' USING ERRCODE = '22023';
  END;
  IF octet_length(v_update_bytes) NOT BETWEEN 1 AND 262144 THEN
    RAISE EXCEPTION 'CRDT update must contain 1 to 262144 bytes' USING ERRCODE = '22023';
  END IF;
  IF p_update_root <> 'sha256:' || encode(public.digest(v_update_bytes, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'CRDT update root does not match bytes' USING ERRCODE = '22023';
  END IF;

  v_anchor_root := activity.ensure_anchor(p_workspace_id, p_anchor);
  INSERT INTO activity.workspace_crdt_updates (
    workspace_id, anchor_root, author_account_id, document_name, update_root, update_bytes
  ) VALUES (
    p_workspace_id, v_anchor_root, p_account_id, p_document_name, p_update_root, v_update_bytes
  )
  ON CONFLICT (workspace_id, anchor_root, document_name, update_root) DO UPDATE
    SET update_root = EXCLUDED.update_root
  RETURNING * INTO entry;

  answer := jsonb_build_object(
    'id', entry.id,
    'workspace_id', entry.workspace_id,
    'anchor_root', entry.anchor_root,
    'author_account_id', entry.author_account_id,
    'document_name', entry.document_name,
    'update_root', entry.update_root,
    'update_base64', encode(entry.update_bytes, 'base64'),
    'byte_size', octet_length(entry.update_bytes),
    'authority_effect', entry.authority_effect,
    'created_at', entry.created_at
  );

  INSERT INTO activity.idempotency_records
    (account_id, idempotency_key, workspace_id, command_kind, request_root, response)
  VALUES
    (p_account_id, p_idempotency_key, p_workspace_id, 'crdt_update.append', p_request_root, answer);
  INSERT INTO activity.activity_audit_entries
    (workspace_id, account_id, anchor_root, operation, subject_kind, subject_id, request_root)
  VALUES
    (p_workspace_id, p_account_id, v_anchor_root, 'crdt_update.append', 'crdt_update', entry.id::text, p_request_root);

  RETURN answer;
END
$function$;

CREATE OR REPLACE FUNCTION activity_api.list_workspace_crdt_updates(
  p_account_id uuid,
  p_workspace_id uuid,
  p_repository_id text,
  p_problem_id text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
BEGIN
  PERFORM activity.require_membership(p_account_id, p_workspace_id);
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', u.id,
      'workspace_id', u.workspace_id,
      'anchor_root', u.anchor_root,
      'author_account_id', u.author_account_id,
      'document_name', u.document_name,
      'update_root', u.update_root,
      'update_base64', encode(u.update_bytes, 'base64'),
      'byte_size', octet_length(u.update_bytes),
      'authority_effect', u.authority_effect,
      'created_at', u.created_at
    ) ORDER BY u.created_at, u.id)
    FROM activity.workspace_crdt_updates u
    JOIN activity.scientific_anchors a
      ON a.workspace_id = u.workspace_id AND a.anchor_root = u.anchor_root
    WHERE u.workspace_id = p_workspace_id
      AND a.repository_id = p_repository_id
      AND a.problem_id = p_problem_id
  ), '[]'::jsonb);
END
$function$;

REVOKE ALL ON FUNCTION activity_api.append_workspace_crdt_update(uuid, uuid, text, text, jsonb, text, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activity_api.append_workspace_crdt_update(uuid, uuid, text, text, jsonb, text, text, text)
  TO vela_activity_app;
REVOKE ALL ON FUNCTION activity_api.list_workspace_crdt_updates(uuid, uuid, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activity_api.list_workspace_crdt_updates(uuid, uuid, text, text)
  TO vela_activity_app;
