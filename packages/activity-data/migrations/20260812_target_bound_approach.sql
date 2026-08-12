SET LOCAL ROLE vela_activity_owner;

ALTER TABLE activity.approaches
  ADD COLUMN target_id text,
  ADD COLUMN target_packet_root text,
  ADD COLUMN target_record_root text,
  ADD COLUMN authority_effect text NOT NULL DEFAULT 'none';

ALTER TABLE activity.approaches
  ADD CONSTRAINT activity_approaches_target_binding_check CHECK (
    (
      target_id IS NULL
      AND target_packet_root IS NULL
      AND target_record_root IS NULL
    ) OR (
      target_id IS NOT NULL
      AND target_packet_root IS NOT NULL
      AND length(btrim(target_id)) BETWEEN 1 AND 1000
      AND target_id = btrim(target_id)
      AND target_packet_root ~ '^sha256:[0-9a-f]{64}$'
      AND (
        target_record_root IS NULL
        OR target_record_root ~ '^sha256:[0-9a-f]{64}$'
      )
    )
  ),
  ADD CONSTRAINT activity_approaches_authority_effect_check
    CHECK (authority_effect = 'none');

CREATE INDEX activity_approaches_target_idx
  ON activity.approaches
    (workspace_id, anchor_root, target_id, updated_at DESC)
  WHERE target_id IS NOT NULL;

COMMENT ON COLUMN activity.approaches.target_packet_root IS
  'Exact source-owned work-packet root retained as non-authoritative Workspace provenance.';
COMMENT ON COLUMN activity.approaches.authority_effect IS
  'Literal none: Target binding is activity-plane association and has no scientific authority effect.';

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
  request activity.work_requests%ROWTYPE;
  artifact activity.artifact_refs%ROWTYPE;
  draft activity.submission_drafts%ROWTYPE;
  current_state text;
BEGIN
  IF p_kind NOT IN (
    'follow.set', 'approach.create', 'approach.fork', 'attempt.create', 'attempt.update',
    'discussion.add', 'work_request.create', 'artifact.attach', 'submission_draft.save'
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
    IF NOT (
      (
        p_payload->>'target_id' IS NULL
        AND p_payload->>'target_packet_root' IS NULL
        AND p_payload->>'target_record_root' IS NULL
      ) OR (
        p_payload->>'target_id' IS NOT NULL
        AND p_payload->>'target_packet_root' IS NOT NULL
      )
    ) THEN
      RAISE EXCEPTION 'Approach Target binding is partial' USING ERRCODE='22023';
    END IF;
    INSERT INTO activity.approaches
      (workspace_id, anchor_root, created_by_account_id, title, summary,
       target_id, target_packet_root, target_record_root)
    VALUES (
      p_workspace_id, v_anchor_root, p_account_id, p_payload->>'title', p_payload->>'summary',
      p_payload->>'target_id', p_payload->>'target_packet_root', p_payload->>'target_record_root'
    ) RETURNING * INTO approach;
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
      (workspace_id, anchor_root, parent_approach_id, created_by_account_id, title, summary,
       target_id, target_packet_root, target_record_root, authority_effect)
    VALUES (
      p_workspace_id, v_anchor_root, source_approach.id, p_account_id,
      coalesce(nullif(p_payload->>'title',''), source_approach.title || ' (fork)'),
      coalesce(nullif(p_payload->>'summary',''), source_approach.summary),
      source_approach.target_id, source_approach.target_packet_root,
      source_approach.target_record_root, source_approach.authority_effect
    ) RETURNING * INTO approach;
    subject_kind := 'approach'; subject_id := approach.id::text; answer := to_jsonb(approach);

  ELSIF p_kind = 'attempt.create' THEN
    SELECT * INTO approach FROM activity.approaches
    WHERE id=(p_payload->>'approach_id')::uuid AND workspace_id=p_workspace_id;
    IF approach.id IS NULL THEN RAISE EXCEPTION 'Approach not found' USING ERRCODE='VA404'; END IF;
    v_anchor_root := approach.anchor_root;
    INSERT INTO activity.attempts
      (workspace_id, anchor_root, approach_id, created_by_account_id, provider, external_session_id, locator, title)
    VALUES (
      p_workspace_id, v_anchor_root, approach.id, p_account_id, p_payload->>'provider',
      nullif(p_payload->>'external_session_id',''), nullif(p_payload->>'locator',''), p_payload->>'title'
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
      external_session_id=CASE WHEN coalesce((p_payload->>'set_external_session_id')::boolean,false) THEN nullif(p_payload->>'external_session_id','') ELSE external_session_id END,
      locator=CASE WHEN coalesce((p_payload->>'set_locator')::boolean,false) THEN nullif(p_payload->>'locator','') ELSE locator END,
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

  ELSIF p_kind = 'work_request.create' THEN
    PERFORM activity.require_anchor_targets(
      p_workspace_id, v_anchor_root, (p_payload->>'approach_id')::uuid, (p_payload->>'attempt_id')::uuid
    );
    IF p_payload->>'assignee_account_id' IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM activity.workspace_memberships
      WHERE workspace_id=p_workspace_id AND account_id=(p_payload->>'assignee_account_id')::uuid
    ) THEN RAISE EXCEPTION 'assignee must be a workspace member' USING ERRCODE='VA403'; END IF;
    INSERT INTO activity.work_requests
      (workspace_id, anchor_root, approach_id, attempt_id, created_by_account_id,
       assignee_account_id, kind, title, detail)
    VALUES (
      p_workspace_id, v_anchor_root, (p_payload->>'approach_id')::uuid,
      (p_payload->>'attempt_id')::uuid, p_account_id,
      (p_payload->>'assignee_account_id')::uuid, p_payload->>'kind',
      p_payload->>'title', p_payload->>'detail'
    ) RETURNING * INTO request;
    subject_kind := 'work_request'; subject_id := request.id::text; answer := to_jsonb(request);

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
    IF p_payload->'payload'->>'schema' <> 'vela.submission.v2'
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

REVOKE ALL ON FUNCTION activity_api.execute_command(uuid, uuid, text, text, text, jsonb, bigint)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activity_api.execute_command(uuid, uuid, text, text, text, jsonb, bigint)
  TO vela_activity_app;
