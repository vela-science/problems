SET LOCAL ROLE vela_activity_owner;

/*
  Consented, content-free pilot telemetry.

  One row is one product activation or failure signal from an opted-in
  Workbench install: a name from the closed vocabulary below, the moment it
  happened, a random install identifier generated at opt-in, and an optional
  stage duration. Nothing else. No account, workspace, Problem, repository,
  file, instruction text, credential, or signature ever enters this table, and
  no other activity table references it. Retention is enforced at the write:
  every accepted record removes rows older than 90 days.
*/

CREATE TABLE IF NOT EXISTS activity.pilot_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id text NOT NULL CHECK (install_id ~ '^[0-9a-f]{32}$'),
  client_record_id text NOT NULL CHECK (client_record_id ~ '^[0-9a-f]{32}$'),
  signal text NOT NULL CHECK (signal IN (
    'installer_succeeded', 'problem_opened', 'handoff_opened',
    'continuation_started', 'submission_completed', 'submission_failed',
    'check_completed', 'check_failed', 'readback_completed'
  )),
  occurred_at timestamptz NOT NULL,
  stage_ms bigint CHECK (stage_ms IS NULL OR stage_ms BETWEEN 0 AND 86400000),
  authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none'),
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (install_id, client_record_id)
);

CREATE INDEX IF NOT EXISTS activity_pilot_telemetry_received_idx
  ON activity.pilot_telemetry (received_at);

CREATE OR REPLACE FUNCTION activity_api.record_pilot_telemetry(
  p_install_id text,
  p_client_record_id text,
  p_signal text,
  p_occurred_at timestamptz,
  p_stage_ms bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, activity, pg_temp
AS $function$
DECLARE
  inserted_count integer;
BEGIN
  IF p_install_id !~ '^[0-9a-f]{32}$' OR p_client_record_id !~ '^[0-9a-f]{32}$' THEN
    RAISE EXCEPTION 'pilot telemetry identifiers are invalid' USING ERRCODE = '22023';
  END IF;
  IF p_signal IS NULL OR p_signal NOT IN (
    'installer_succeeded', 'problem_opened', 'handoff_opened',
    'continuation_started', 'submission_completed', 'submission_failed',
    'check_completed', 'check_failed', 'readback_completed'
  ) THEN
    RAISE EXCEPTION 'pilot telemetry signal is outside the closed vocabulary' USING ERRCODE = '22023';
  END IF;
  IF p_occurred_at IS NULL
    OR p_occurred_at < now() - interval '30 days'
    OR p_occurred_at > now() + interval '1 day' THEN
    RAISE EXCEPTION 'pilot telemetry timestamp is outside the accepted window' USING ERRCODE = '22023';
  END IF;
  IF p_stage_ms IS NOT NULL AND (p_stage_ms < 0 OR p_stage_ms > 86400000) THEN
    RAISE EXCEPTION 'pilot telemetry stage duration is out of bounds' USING ERRCODE = '22023';
  END IF;

  DELETE FROM activity.pilot_telemetry WHERE received_at < now() - interval '90 days';

  /*
    The per-install budget bounds an honest client. It bounds nothing globally,
    because install_id is minted by the client: an attacker rotates it freely
    and every request lands in a fresh bucket. The ceiling below is the bound
    that actually holds. It reads the received_at index, sits far above any
    plausible pilot volume and far below a flood, and protects the Neon compute
    this database shares with the SELECT-only projection reader that serves
    every public Problem page. It is admission control, not a quota: an
    operator rate rule at the edge remains the first line.
  */
  IF (SELECT count(*) FROM activity.pilot_telemetry
      WHERE received_at > now() - interval '1 hour') >= 50000 THEN
    RAISE EXCEPTION 'pilot telemetry ingestion ceiling is reached' USING ERRCODE = '22023';
  END IF;

  IF (SELECT count(*) FROM activity.pilot_telemetry WHERE install_id = p_install_id) >= 5000 THEN
    RAISE EXCEPTION 'pilot telemetry budget for this install is exhausted' USING ERRCODE = '22023';
  END IF;

  INSERT INTO activity.pilot_telemetry (install_id, client_record_id, signal, occurred_at, stage_ms)
  VALUES (p_install_id, p_client_record_id, p_signal, p_occurred_at, p_stage_ms)
  ON CONFLICT (install_id, client_record_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN
    PERFORM 1 FROM activity.pilot_telemetry
    WHERE install_id = p_install_id AND client_record_id = p_client_record_id
      AND signal = p_signal AND occurred_at = p_occurred_at
      AND stage_ms IS NOT DISTINCT FROM p_stage_ms;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'pilot telemetry record identifier was reused with different content' USING ERRCODE = 'VAI01';
    END IF;
    RETURN jsonb_build_object('stored', false, 'duplicate', true, 'authority_effect', 'none');
  END IF;
  RETURN jsonb_build_object('stored', true, 'duplicate', false, 'authority_effect', 'none');
END
$function$;

REVOKE ALL ON FUNCTION activity_api.record_pilot_telemetry(text, text, text, timestamptz, bigint)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activity_api.record_pilot_telemetry(text, text, text, timestamptz, bigint)
  TO vela_activity_app;
