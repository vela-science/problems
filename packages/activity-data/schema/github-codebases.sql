SET LOCAL ROLE vela_activity_owner;

CREATE TABLE IF NOT EXISTS activity.github_installations (
  installation_id bigint PRIMARY KEY CHECK (installation_id > 0),
  account_id uuid REFERENCES activity.accounts(id) ON DELETE CASCADE,
  workos_identity_id text,
  installer_github_user_id bigint NOT NULL CHECK (installer_github_user_id > 0),
  github_account_id bigint NOT NULL CHECK (github_account_id > 0),
  github_account_node_id text NOT NULL CHECK (length(github_account_node_id) BETWEEN 1 AND 200),
  github_account_login text NOT NULL CHECK (github_account_login ~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$'),
  github_account_type text NOT NULL CHECK (github_account_type IN ('User', 'Organization')),
  repository_selection text NOT NULL CHECK (repository_selection = 'selected'),
  permissions jsonb NOT NULL CHECK (permissions = '{"contents":"read","metadata":"read"}'::jsonb),
  authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none'),
  suspended_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((account_id IS NULL) = (workos_identity_id IS NULL))
);

COMMENT ON TABLE activity.github_installations IS
  'Hosted selected-repository access only. GitHub installation state is never Vela Repository authority.';

CREATE TABLE IF NOT EXISTS activity.github_installation_repositories (
  installation_id bigint NOT NULL REFERENCES activity.github_installations(installation_id) ON DELETE CASCADE,
  repository_id bigint NOT NULL CHECK (repository_id > 0),
  repository_node_id text NOT NULL CHECK (length(repository_node_id) BETWEEN 1 AND 200),
  full_name text NOT NULL CHECK (full_name ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  visibility text NOT NULL CHECK (visibility IN ('public', 'private', 'internal')),
  default_branch text NOT NULL CHECK (length(default_branch) BETWEEN 1 AND 255),
  selected_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  PRIMARY KEY (installation_id, repository_id)
);

CREATE TABLE IF NOT EXISTS activity.github_webhook_deliveries (
  delivery_id text PRIMARY KEY CHECK (delivery_id ~ '^[0-9a-fA-F-]{16,80}$'),
  event_name text NOT NULL CHECK (event_name IN ('installation', 'installation_repositories', 'push')),
  action text NOT NULL CHECK (length(action) BETWEEN 1 AND 80),
  payload_root text NOT NULL CHECK (payload_root ~ '^sha256:[0-9a-f]{64}$'),
  installation_id bigint CHECK (installation_id IS NULL OR installation_id > 0),
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity.connected_codebases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES activity.accounts(id) ON DELETE CASCADE,
  installation_id bigint REFERENCES activity.github_installations(installation_id) ON DELETE CASCADE,
  import_method text NOT NULL CHECK (import_method IN ('github_app', 'public_url')),
  provider text NOT NULL DEFAULT 'github' CHECK (provider = 'github'),
  repository_id bigint NOT NULL CHECK (repository_id > 0),
  repository_node_id text NOT NULL CHECK (length(repository_node_id) BETWEEN 1 AND 200),
  full_name text NOT NULL CHECK (full_name ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  canonical_locator text NOT NULL CHECK (canonical_locator ~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\.git$'),
  visibility text NOT NULL CHECK (visibility IN ('public', 'private', 'internal')),
  default_branch text NOT NULL CHECK (length(default_branch) BETWEEN 1 AND 255),
  source_commit text NOT NULL CHECK (source_commit ~ '^[0-9a-f]{40}$'),
  source_tree text NOT NULL CHECK (source_tree ~ '^[0-9a-f]{40}$'),
  installation_permissions_root text CHECK (
    installation_permissions_root IS NULL OR installation_permissions_root ~ '^sha256:[0-9a-f]{64}$'
  ),
  inspection_status text NOT NULL CHECK (
    inspection_status IN ('connected', 'structurally_inspected', 'natively_verified', 'unsupported')
  ),
  inspection_root text NOT NULL CHECK (inspection_root ~ '^sha256:[0-9a-f]{64}$'),
  inspection jsonb NOT NULL CHECK (jsonb_typeof(inspection) = 'object'),
  receipt_root text NOT NULL CHECK (receipt_root ~ '^sha256:[0-9a-f]{64}$'),
  accessibility text NOT NULL DEFAULT 'accessible' CHECK (accessibility IN ('accessible', 'revoked')),
  sync_state text NOT NULL DEFAULT 'pinned' CHECK (sync_state IN ('pinned', 'branch_moved', 'unavailable')),
  authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, repository_id, source_commit)
);

COMMENT ON TABLE activity.connected_codebases IS
  'Rooted, immutable inspection receipts. A connected codebase is not necessarily a Vela Authority Repository.';

CREATE INDEX IF NOT EXISTS activity_github_installations_account_idx
  ON activity.github_installations (account_id, updated_at DESC) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS activity_github_repositories_installation_idx
  ON activity.github_installation_repositories (installation_id, full_name) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS activity_connected_codebases_account_idx
  ON activity.connected_codebases (account_id, created_at DESC);

CREATE OR REPLACE FUNCTION activity_api.record_github_webhook(
  p_delivery_id text,
  p_event_name text,
  p_payload_root text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  p_action text := coalesce(p_payload->>'action', 'push');
  p_installation_id bigint := nullif(p_payload->>'installation_id', '')::bigint;
  inserted_count integer;
  repository jsonb;
BEGIN
  IF p_event_name NOT IN ('installation', 'installation_repositories', 'push')
    OR p_delivery_id !~ '^[0-9a-fA-F-]{16,80}$'
    OR p_payload_root !~ '^sha256:[0-9a-f]{64}$'
    OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'invalid GitHub webhook envelope' USING ERRCODE = '22023';
  END IF;
  INSERT INTO activity.github_webhook_deliveries
    (delivery_id, event_name, action, payload_root, installation_id)
  VALUES (p_delivery_id, p_event_name, p_action, p_payload_root, p_installation_id)
  ON CONFLICT (delivery_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN
    PERFORM 1 FROM activity.github_webhook_deliveries
    WHERE delivery_id=p_delivery_id AND event_name=p_event_name AND payload_root=p_payload_root;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'GitHub delivery identifier was reused with different bytes' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('duplicate', true, 'authority_effect', 'none');
  END IF;

  IF p_installation_id IS NULL THEN
    RAISE EXCEPTION 'GitHub webhook has no installation' USING ERRCODE = '22023';
  ELSIF p_event_name = 'installation' AND p_action = 'created' THEN
    INSERT INTO activity.github_installations (
      installation_id, installer_github_user_id, github_account_id, github_account_node_id,
      github_account_login, github_account_type, repository_selection, permissions
    ) VALUES (
      p_installation_id, (p_payload->>'sender_id')::bigint, (p_payload->>'account_id')::bigint,
      p_payload->>'account_node_id', p_payload->>'account_login', p_payload->>'account_type',
      p_payload->>'repository_selection', p_payload->'permissions'
    )
    ON CONFLICT (installation_id) DO UPDATE SET
      installer_github_user_id = EXCLUDED.installer_github_user_id,
      github_account_id = EXCLUDED.github_account_id,
      github_account_node_id = EXCLUDED.github_account_node_id,
      github_account_login = EXCLUDED.github_account_login,
      github_account_type = EXCLUDED.github_account_type,
      repository_selection = EXCLUDED.repository_selection,
      permissions = EXCLUDED.permissions,
      suspended_at = NULL,
      removed_at = NULL,
      updated_at = now();
  ELSIF p_event_name = 'installation' AND p_action = 'deleted' THEN
    DELETE FROM activity.connected_codebases
    WHERE installation_id = p_installation_id AND visibility <> 'public';
    DELETE FROM activity.github_installation_repositories WHERE installation_id = p_installation_id;
    UPDATE activity.github_installations SET removed_at=now(), updated_at=now()
    WHERE installation_id=p_installation_id;
  ELSIF p_event_name = 'installation' AND p_action = 'suspend' THEN
    UPDATE activity.github_installations SET suspended_at=now(), updated_at=now()
    WHERE installation_id=p_installation_id;
    UPDATE activity.connected_codebases SET accessibility='revoked', sync_state='unavailable', updated_at=now()
    WHERE installation_id=p_installation_id;
  ELSIF p_event_name = 'installation' AND p_action IN ('unsuspend', 'new_permissions_accepted') THEN
    UPDATE activity.github_installations SET suspended_at=NULL, updated_at=now()
    WHERE installation_id=p_installation_id;
  ELSIF p_event_name = 'installation_repositories' THEN
    IF p_action = 'added' THEN
      FOR repository IN SELECT * FROM jsonb_array_elements(p_payload->'repositories') LOOP
        INSERT INTO activity.github_installation_repositories (
          installation_id, repository_id, repository_node_id, full_name, visibility, default_branch
        ) VALUES (
          p_installation_id, (repository->>'id')::bigint, repository->>'node_id', repository->>'full_name',
          repository->>'visibility', repository->>'default_branch'
        ) ON CONFLICT (installation_id, repository_id) DO UPDATE SET
          repository_node_id=EXCLUDED.repository_node_id, full_name=EXCLUDED.full_name,
          visibility=EXCLUDED.visibility, default_branch=EXCLUDED.default_branch,
          removed_at=NULL, selected_at=now();
      END LOOP;
    ELSIF p_action = 'removed' THEN
      FOR repository IN SELECT * FROM jsonb_array_elements(p_payload->'repositories') LOOP
        DELETE FROM activity.connected_codebases
        WHERE installation_id=p_installation_id AND repository_id=(repository->>'id')::bigint
          AND visibility <> 'public';
        UPDATE activity.github_installation_repositories SET removed_at=now()
        WHERE installation_id=p_installation_id AND repository_id=(repository->>'id')::bigint;
      END LOOP;
    END IF;
  ELSIF p_event_name = 'push' THEN
    UPDATE activity.connected_codebases SET sync_state='branch_moved', updated_at=now()
    WHERE installation_id=p_installation_id
      AND repository_id=(p_payload->>'repository_id')::bigint
      AND p_payload->>'ref' = 'refs/heads/' || default_branch
      AND source_commit <> p_payload->>'after';
  END IF;
  RETURN jsonb_build_object('duplicate', false, 'authority_effect', 'none');
END
$function$;

CREATE OR REPLACE FUNCTION activity_api.claim_github_installation(
  p_account_id uuid,
  p_workos_identity_id text,
  p_github_user_id bigint,
  p_installation_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  answer activity.github_installations%ROWTYPE;
BEGIN
  PERFORM 1 FROM activity.accounts WHERE id=p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found' USING ERRCODE='VA404'; END IF;
  UPDATE activity.github_installations SET
    account_id=p_account_id, workos_identity_id=p_workos_identity_id, updated_at=now()
  WHERE installation_id=p_installation_id
    AND installer_github_user_id=p_github_user_id
    AND removed_at IS NULL
    AND (account_id IS NULL OR account_id=p_account_id)
  RETURNING * INTO answer;
  IF answer.installation_id IS NULL THEN
    RAISE EXCEPTION 'GitHub installation is not attributable to this hosted identity' USING ERRCODE='VA403';
  END IF;
  RETURN to_jsonb(answer);
END
$function$;

CREATE OR REPLACE FUNCTION activity_api.sync_github_repositories(
  p_account_id uuid,
  p_installation_id bigint,
  p_repositories jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  repository jsonb;
BEGIN
  IF jsonb_typeof(p_repositories) <> 'array' OR jsonb_array_length(p_repositories) > 500 THEN
    RAISE EXCEPTION 'invalid GitHub repository inventory' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM activity.github_installations
  WHERE installation_id=p_installation_id AND account_id=p_account_id
    AND removed_at IS NULL AND suspended_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'active GitHub installation not found' USING ERRCODE='VA404'; END IF;
  UPDATE activity.github_installation_repositories SET removed_at=now()
  WHERE installation_id=p_installation_id;
  FOR repository IN SELECT * FROM jsonb_array_elements(p_repositories) LOOP
    INSERT INTO activity.github_installation_repositories (
      installation_id, repository_id, repository_node_id, full_name, visibility, default_branch
    ) VALUES (
      p_installation_id, (repository->>'id')::bigint, repository->>'node_id', repository->>'full_name',
      repository->>'visibility', repository->>'default_branch'
    ) ON CONFLICT (installation_id, repository_id) DO UPDATE SET
      repository_node_id=EXCLUDED.repository_node_id, full_name=EXCLUDED.full_name,
      visibility=EXCLUDED.visibility, default_branch=EXCLUDED.default_branch,
      removed_at=NULL, selected_at=now();
  END LOOP;
  RETURN jsonb_build_object('count', jsonb_array_length(p_repositories), 'authority_effect', 'none');
END
$function$;

CREATE OR REPLACE FUNCTION activity_api.list_github_connections(p_account_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
  SELECT jsonb_build_object(
    'installations', coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.github_account_login)
      FROM activity.github_installations i
      WHERE i.account_id=p_account_id AND i.removed_at IS NULL), '[]'::jsonb),
    'repositories', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.full_name)
      FROM activity.github_installation_repositories r
      JOIN activity.github_installations i ON i.installation_id=r.installation_id
      WHERE i.account_id=p_account_id AND i.removed_at IS NULL AND r.removed_at IS NULL), '[]'::jsonb),
    'codebases', coalesce((SELECT jsonb_agg(to_jsonb(c) - 'inspection' ORDER BY c.created_at DESC)
      FROM activity.connected_codebases c WHERE c.account_id=p_account_id), '[]'::jsonb)
  )
$function$;

CREATE OR REPLACE FUNCTION activity_api.save_connected_codebase(
  p_account_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
DECLARE
  answer activity.connected_codebases%ROWTYPE;
  p_installation_id bigint := nullif(p_payload->>'installation_id', '')::bigint;
BEGIN
  PERFORM 1 FROM activity.accounts WHERE id=p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found' USING ERRCODE='VA404'; END IF;
  IF p_payload->>'authority_effect' <> 'none' OR p_payload->>'provider' <> 'github' THEN
    RAISE EXCEPTION 'connected codebase cannot carry scientific authority' USING ERRCODE='22023';
  END IF;
  IF p_payload->>'import_method' = 'github_app' THEN
    PERFORM 1 FROM activity.github_installation_repositories r
    JOIN activity.github_installations i ON i.installation_id=r.installation_id
    WHERE r.installation_id=p_installation_id AND r.repository_id=(p_payload->>'repository_id')::bigint
      AND i.account_id=p_account_id AND i.removed_at IS NULL AND i.suspended_at IS NULL
      AND r.removed_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'selected GitHub repository access required' USING ERRCODE='VA403'; END IF;
  ELSIF p_payload->>'import_method' <> 'public_url' OR p_payload->>'visibility' <> 'public' THEN
    RAISE EXCEPTION 'manual import is restricted to public codebases' USING ERRCODE='VA403';
  END IF;
  INSERT INTO activity.connected_codebases (
    account_id, installation_id, import_method, provider, repository_id, repository_node_id,
    full_name, canonical_locator, visibility, default_branch, source_commit, source_tree,
    installation_permissions_root, inspection_status, inspection_root, inspection,
    receipt_root, authority_effect
  ) VALUES (
    p_account_id, p_installation_id, p_payload->>'import_method', p_payload->>'provider',
    (p_payload->>'repository_id')::bigint, p_payload->>'repository_node_id', p_payload->>'full_name',
    p_payload->>'canonical_locator', p_payload->>'visibility', p_payload->>'default_branch',
    p_payload->>'source_commit', p_payload->>'source_tree',
    nullif(p_payload->>'installation_permissions_root', ''), p_payload->>'inspection_status',
    p_payload->>'inspection_root', p_payload->'inspection', p_payload->>'receipt_root', 'none'
  ) ON CONFLICT (account_id, repository_id, source_commit) DO UPDATE SET
    installation_id=EXCLUDED.installation_id, import_method=EXCLUDED.import_method,
    installation_permissions_root=EXCLUDED.installation_permissions_root,
    inspection_status=EXCLUDED.inspection_status, inspection_root=EXCLUDED.inspection_root,
    inspection=EXCLUDED.inspection, receipt_root=EXCLUDED.receipt_root,
    accessibility='accessible', sync_state='pinned', updated_at=now()
  RETURNING * INTO answer;
  RETURN to_jsonb(answer) - 'inspection';
END
$function$;

CREATE OR REPLACE FUNCTION activity_api.get_connected_codebase(p_account_id uuid, p_codebase_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, activity
AS $function$
  SELECT to_jsonb(c) FROM activity.connected_codebases c
  WHERE c.id=p_codebase_id AND c.account_id=p_account_id
$function$;

REVOKE ALL ON ALL TABLES IN SCHEMA activity FROM PUBLIC, vela_activity_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA activity_api FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activity_api.record_github_webhook(text,text,text,jsonb) TO vela_activity_app;
GRANT EXECUTE ON FUNCTION activity_api.claim_github_installation(uuid,text,bigint,bigint) TO vela_activity_app;
GRANT EXECUTE ON FUNCTION activity_api.sync_github_repositories(uuid,bigint,jsonb) TO vela_activity_app;
GRANT EXECUTE ON FUNCTION activity_api.list_github_connections(uuid) TO vela_activity_app;
GRANT EXECUTE ON FUNCTION activity_api.save_connected_codebase(uuid,jsonb) TO vela_activity_app;
GRANT EXECUTE ON FUNCTION activity_api.get_connected_codebase(uuid,uuid) TO vela_activity_app;
