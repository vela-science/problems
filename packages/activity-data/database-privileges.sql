DO $database$
BEGIN
  IF current_database() <> 'vela_activity' THEN
    RAISE EXCEPTION 'database-privileges.sql must run in vela_activity';
  END IF;
END
$database$;

REVOKE CONNECT, TEMP ON DATABASE vela_activity FROM PUBLIC;
-- Neon-created login roles can carry a direct database CONNECT grant even
-- after PUBLIC is closed. Revoke both the stable permission role and the
-- current rotated login so the projection reader cannot cross planes.
REVOKE CONNECT, TEMP ON DATABASE vela_activity FROM
  vela_projection_reader,
  vela_projection_reader_20260813;
GRANT CONNECT ON DATABASE vela_activity TO
  vela_activity_owner,
  vela_activity_migrator,
  vela_activity_app;
GRANT CREATE ON DATABASE vela_activity TO vela_activity_owner;

-- Database CONNECT defaults to PUBLIC in Postgres. These explicit revocations
-- make the two hosted planes an actual role boundary rather than two names.
-- Problems CONNECT belongs to its stable NOLOGIN permission role; rotated
-- reader logins inherit it and are never granted cross-plane access directly.
REVOKE CONNECT, TEMP ON DATABASE vela_projection FROM PUBLIC;
GRANT CONNECT ON DATABASE vela_projection TO
  vela_projection_reader;
