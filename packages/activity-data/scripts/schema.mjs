import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { assertExactMigrationLedger, planMigrations } from "./migration-plan.mjs";
import { sqlStatements } from "./sql-statements.mjs";

const root = resolve(import.meta.dirname, "..");
const migrations = readdirSync(resolve(root, "migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => {
    const source = readFileSync(resolve(root, "migrations", name), "utf8");
    return {
      id: name.slice(0, -4),
      source,
      root: `sha256:${createHash("sha256").update(source).digest("hex")}`,
    };
  });

const migrate = process.argv.includes("--migrate");
const check = process.argv.includes("--check");
if (migrate === check) throw new Error("choose exactly one of --migrate or --check");
const databaseUrl = migrate
  ? process.env.VELA_ACTIVITY_MIGRATOR_DATABASE_URL
  : process.env.VELA_ACTIVITY_DATABASE_URL;
if (!databaseUrl) throw new Error(migrate
  ? "VELA_ACTIVITY_MIGRATOR_DATABASE_URL is required to migrate activity data"
  : "VELA_ACTIVITY_DATABASE_URL is required to check activity data");
const sql = neon(databaseUrl);
const [identity] = await sql.query("SELECT current_database() AS database, current_user AS role");
const expectedRole = migrate ? "vela_activity_migrator" : "vela_activity_app";
if (identity?.database !== "vela_activity" || identity?.role !== expectedRole) {
  throw new Error(`unexpected activity database identity: ${JSON.stringify(identity)}`);
}

if (migrate) {
  const [ledger] = await sql.query("SELECT to_regclass('activity.schema_migrations') IS NOT NULL AS exists");
  let installedRows = [];
  if (ledger?.exists) {
    installedRows = await sql.query(
      "SELECT migration_id, migration_root FROM activity.schema_migrations",
    );
  }
  for (const migration of planMigrations(migrations, installedRows)) {
    await sql.transaction((transaction) => [
      ...sqlStatements(migration.source).map((statement) => transaction.query(statement)),
      transaction.query(
        `INSERT INTO activity.schema_migrations (migration_id, migration_root)
         VALUES ($1, $2) ON CONFLICT (migration_id) DO NOTHING`,
        [migration.id, migration.root],
      ),
    ]);
  }
  const finalLedger = await sql.query(
    "SELECT migration_id, migration_root FROM activity.schema_migrations ORDER BY migration_id",
  );
  assertExactMigrationLedger(migrations, finalLedger);
} else {
  const [access] = await sql.query(`SELECT
    has_schema_privilege(current_user, 'activity_api', 'USAGE') AS api_usage,
    has_schema_privilege(current_user, 'activity', 'USAGE') AS storage_usage,
    has_database_privilege(current_user, 'vela_activity', 'TEMP') AS temporary_access,
    has_table_privilege(current_user, (
      SELECT relation.oid FROM pg_catalog.pg_class relation
      JOIN pg_catalog.pg_namespace namespace ON namespace.oid=relation.relnamespace
      WHERE namespace.nspname='activity' AND relation.relname='accounts'
    ), 'SELECT,INSERT,UPDATE,DELETE') AS base_access,
    has_function_privilege(current_user, 'activity_api.ensure_account(text,text,text)', 'EXECUTE') AS account_api`);
  if (!access?.api_usage || access.storage_usage || access.temporary_access || access.base_access || !access.account_api) {
    throw new Error(`activity application role boundary failed: ${JSON.stringify(access)}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  mode: migrate ? "migrate" : "check",
  database: identity.database,
  role: identity.role,
  migrations: migrations.map(({ id, root }) => ({ id, root })),
}));
