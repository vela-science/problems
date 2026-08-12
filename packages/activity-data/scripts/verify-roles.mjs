import { neon } from "@neondatabase/serverless";
import { observatoryProjectionReaderIdentity } from "@vela/observatory-data/projection-reader";

const migratorUrl = process.env.VELA_ACTIVITY_MIGRATOR_DATABASE_URL;
const appUrl = process.env.VELA_ACTIVITY_DATABASE_URL;
if (!migratorUrl || !appUrl) {
  throw new Error("VELA_ACTIVITY_MIGRATOR_DATABASE_URL and VELA_ACTIVITY_DATABASE_URL are required");
}
const admin = neon(migratorUrl);
const app = neon(appUrl);
const [matrix] = await admin.query(`SELECT
  has_database_privilege('vela_activity_app', 'vela_activity', 'CONNECT') AS activity_connect,
  has_database_privilege('vela_activity_app', 'vela_activity', 'TEMP') AS activity_temp,
  has_database_privilege('vela_activity_migrator', 'vela_activity', 'TEMP') AS migrator_temp,
  has_database_privilege('vela_activity_app', 'vela_observatory', 'CONNECT') AS observatory_connect,
  has_database_privilege($1, 'vela_activity', 'CONNECT') AS observatory_reader_activity_connect,
  has_schema_privilege('vela_activity_app', 'activity_api', 'USAGE') AS api_usage,
  has_schema_privilege('vela_activity_app', 'activity', 'USAGE') AS storage_usage,
  has_table_privilege('vela_activity_app', (
    SELECT relation.oid FROM pg_catalog.pg_class relation
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid=relation.relnamespace
    WHERE namespace.nspname='activity' AND relation.relname='accounts'
  ), 'SELECT,INSERT,UPDATE,DELETE') AS base_access,
  has_function_privilege('vela_activity_app', (
    SELECT procedure.oid FROM pg_catalog.pg_proc procedure
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid=procedure.pronamespace
    WHERE namespace.nspname='activity_api' AND procedure.proname='execute_command'
  ), 'EXECUTE') AS command_execute`, [observatoryProjectionReaderIdentity.loginRole]);
if (!matrix?.activity_connect || matrix.activity_temp || matrix.migrator_temp || matrix.observatory_connect || !matrix.api_usage
  || matrix.observatory_reader_activity_connect || matrix.storage_usage
  || matrix.base_access || !matrix.command_execute) {
  throw new Error(`activity role matrix failed: ${JSON.stringify(matrix)}`);
}
let denied = false;
try {
  await app.query("SELECT count(*) FROM activity.accounts");
} catch (error) {
  denied = error && typeof error === "object" && "code" in error && error.code === "42501";
}
if (!denied) throw new Error("activity app base-table probe did not fail closed");
console.log(JSON.stringify({ ok: true, schema: "vela.activity-role-proof.v1", ...matrix, base_probe_denied: true }));
