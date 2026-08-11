DO $database$
BEGIN
  IF current_database() <> 'vela_activity' THEN
    RAISE EXCEPTION 'database-privileges.sql must run in vela_activity';
  END IF;
END
$database$;

REVOKE CONNECT ON DATABASE vela_activity FROM PUBLIC;
GRANT CONNECT ON DATABASE vela_activity TO
  vela_activity_owner,
  vela_activity_migrator,
  vela_activity_app;
GRANT CREATE ON DATABASE vela_activity TO vela_activity_owner;

-- Database CONNECT defaults to PUBLIC in Postgres. These explicit revocations
-- make the two hosted planes an actual role boundary rather than two names.
REVOKE CONNECT, TEMP ON DATABASE vela_observatory FROM PUBLIC;
GRANT CONNECT ON DATABASE vela_observatory TO
  observatory_projection_reader,
  observatory_reader,
  vela_local_reader,
  vela_hub_prod;
