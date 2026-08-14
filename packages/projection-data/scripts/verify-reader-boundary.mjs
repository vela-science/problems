import { neon } from "@neondatabase/serverless";
import { projectionReaderIdentity } from "../src/projection-reader.ts";

const databaseUrl = process.env.VELA_PROJECTION_DATABASE_URL;
if (!databaseUrl) throw new Error("set VELA_PROJECTION_DATABASE_URL to the read-only Problems connection string");
const sql = neon(databaseUrl);
const [identity] = await sql.query(`SELECT current_database() AS database, current_user AS role,
  pg_has_role(current_user, $1, 'MEMBER') AS permission_member,
  (SELECT rolinherit FROM pg_roles WHERE rolname = current_user) AS inherits_privileges,
  has_schema_privilege(current_user, 'projection', 'USAGE') AS schema_usage,
  has_schema_privilege(current_user, 'projection', 'CREATE') AS schema_create,
  has_table_privilege(current_user, 'projection.graph_nodes', 'SELECT') AS graph_select,
  has_table_privilege(current_user, 'projection.graph_nodes', 'INSERT,UPDATE,DELETE') AS graph_write`,
  [projectionReaderIdentity.permissionRole]);
if (
  identity?.database !== projectionReaderIdentity.database
  || identity?.role !== projectionReaderIdentity.loginRole
  || !identity.permission_member
  || !identity.inherits_privileges
) {
  throw new Error(`unexpected Problems reader identity: ${JSON.stringify(identity)}`);
}
if (!identity.schema_usage || identity.schema_create || !identity.graph_select || identity.graph_write) {
  throw new Error(`invalid Problems reader grants: ${JSON.stringify(identity)}`);
}
const direct = await sql.query(`SELECT count(*)::integer AS grants
  FROM information_schema.table_privileges WHERE grantee = current_user`);
if (direct[0]?.grants !== 0) throw new Error("Problems reader login has direct table privileges");
const external = await sql.query(`SELECT count(*)::integer AS grants
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE relation.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND namespace.nspname NOT IN ('projection', 'information_schema', 'pg_catalog', 'pg_toast')
    AND (
      has_table_privilege(current_user, relation.oid, 'SELECT')
      OR has_table_privilege(current_user, relation.oid, 'INSERT')
      OR has_table_privilege(current_user, relation.oid, 'UPDATE')
      OR has_table_privilege(current_user, relation.oid, 'DELETE')
      OR has_table_privilege(current_user, relation.oid, 'TRUNCATE')
      OR has_table_privilege(current_user, relation.oid, 'REFERENCES')
      OR has_table_privilege(current_user, relation.oid, 'TRIGGER')
    )`);
if (external[0]?.grants !== 0) throw new Error("Problems reader has effective table privileges outside its schema");
let denied = false;
try {
  await sql.query("UPDATE projection.current_release SET activated_at = activated_at WHERE false");
} catch (error) {
  denied = error && typeof error === "object" && (error.code === "42501" || error.code === "25006");
}
if (!denied) throw new Error("Problems reader write probe did not fail closed");
console.log(JSON.stringify({ ok: true, database: identity.database, role: identity.role, access: "select_only" }));
