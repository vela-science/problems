import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { sqlStatements } from "./sql-statements.mjs";

const root = resolve(import.meta.dirname, "..");
const schemaFiles = readdirSync(resolve(root, "schema"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => ({ name, source: readFileSync(resolve(root, "schema", name), "utf8") }));
const schemaRoot = `sha256:${createHash("sha256").update(JSON.stringify(
  schemaFiles.map(({ name, source }) => ({
    name,
    root: `sha256:${createHash("sha256").update(source).digest("hex")}`,
  })),
)).digest("hex")}`;

const expectedTables = [
  "accounts",
  "activity_audit_entries",
  "approaches",
  "artifact_refs",
  "attempts",
  "connected_codebases",
  "discussion_entries",
  "follows",
  "github_installation_repositories",
  "github_installations",
  "github_webhook_deliveries",
  "idempotency_records",
  "scientific_anchors",
  "submission_drafts",
  "workspace_crdt_updates",
  "workspace_memberships",
  "workspaces",
];

const migrate = process.argv.includes("--migrate");
const check = process.argv.includes("--check");
if (migrate === check) throw new Error("choose exactly one of --migrate or --check");
const databaseUrl = migrate
  ? process.env.VELA_ACTIVITY_MIGRATOR_DATABASE_URL
  : process.env.VELA_ACTIVITY_DATABASE_URL;
if (!databaseUrl) throw new Error(migrate
  ? "VELA_ACTIVITY_MIGRATOR_DATABASE_URL is required to initialize activity data"
  : "VELA_ACTIVITY_DATABASE_URL is required to check activity data");
const sql = neon(databaseUrl);
const [identity] = await sql.query("SELECT current_database() AS database, current_user AS role");
const expectedRole = migrate ? "vela_activity_migrator" : "vela_activity_app";
if (identity?.database !== "vela_activity" || identity?.role !== expectedRole) {
  throw new Error(`unexpected activity database identity: ${JSON.stringify(identity)}`);
}

async function assertCurrentShape(connection) {
  const tables = await connection.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'activity' ORDER BY tablename",
  );
  if (JSON.stringify(tables.map(({ tablename }) => tablename)) !== JSON.stringify(expectedTables)) {
    throw new Error("activity database does not match the clean current table inventory");
  }
  const columns = await connection.query(`SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'activity'
    ORDER BY table_name, ordinal_position`);
  const unexpected = new Set([
    "approaches.target_id", "approaches.target_packet_root", "approaches.target_record_root",
    "attempts.provider", "attempts.external_session_id", "attempts.locator",
    "attempts.execution_packet_root", "attempts.execution_profile_root",
    "attempts.execution_verifier_capsule_root", "attempts.execution_result_contract_root",
    "artifact_refs.execution_packet_root", "artifact_refs.execution_profile_root",
    "artifact_refs.execution_verifier_capsule_root", "artifact_refs.execution_result_contract_root",
    "submission_drafts.artifact_id", "submission_drafts.execution_packet_root",
    "submission_drafts.execution_profile_root", "submission_drafts.execution_verifier_capsule_root",
    "submission_drafts.execution_result_contract_root",
  ]);
  const present = columns
    .map(({ table_name, column_name }) => `${table_name}.${column_name}`)
    .filter((name) => unexpected.has(name));
  if (present.length) throw new Error(`activity database contains retired columns: ${present.join(", ")}`);
}

if (migrate) {
  await sql.transaction((transaction) => schemaFiles.flatMap(({ source }) => (
    sqlStatements(source).map((statement) => transaction.query(statement))
  )));
  await assertCurrentShape(sql);
} else {
  await assertCurrentShape(sql);
  const [access] = await sql.query(`SELECT
    has_schema_privilege(current_user, 'activity_api', 'USAGE') AS api_usage,
    has_schema_privilege(current_user, 'activity', 'USAGE') AS storage_usage,
    has_database_privilege(current_user, 'vela_activity', 'TEMP') AS temporary_access,
    has_table_privilege(current_user, (
      SELECT relation.oid FROM pg_catalog.pg_class relation
      JOIN pg_catalog.pg_namespace namespace ON namespace.oid=relation.relnamespace
      WHERE namespace.nspname='activity' AND relation.relname='accounts'
    ), 'SELECT,INSERT,UPDATE,DELETE') AS base_access,
    has_function_privilege(current_user, 'activity_api.ensure_account(text,text,text)', 'EXECUTE') AS account_api,
    has_function_privilege(current_user, 'activity_api.list_github_connections(uuid)', 'EXECUTE') AS github_api`);
  if (!access?.api_usage || access.storage_usage || access.temporary_access || access.base_access || !access.account_api || !access.github_api) {
    throw new Error(`activity application role boundary failed: ${JSON.stringify(access)}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  mode: migrate ? "initialize" : "check",
  database: identity.database,
  role: identity.role,
  schema_root: schemaRoot,
  schema_files: schemaFiles.map(({ name }) => name),
  tables: expectedTables.length,
}));
