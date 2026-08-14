import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
/* Through `neon-client`, not `@neondatabase/serverless` directly. It is the
   one place the driver is configured, and the only reason this file held a
   second import was that it predated the loopback endpoint. That mattered:
   `VELA_NEON_FETCH_ENDPOINT` made every other caller runnable against a local
   Postgres and left the migration runner — the one whose failures reach
   production first — the only thing that could not be tried before it ran
   there. `localNeonFetchEndpoint` refuses the variable outside development. */
import { neon } from "../src/neon-client";
import { projectionReaderIdentity } from "../src/projection-reader.ts";
import { sqlStatements } from "./sql-statements.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(packageRoot, "schema.sql");
const schemaSql = readFileSync(schemaPath, "utf8");
const schemaRoot = `sha256:${createHash("sha256").update(schemaSql).digest("hex")}`;
const migrationsPath = join(packageRoot, "migrations");
const migrations = readdirSync(migrationsPath)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => {
    const sql = readFileSync(join(migrationsPath, name), "utf8");
    return {
      id: name.slice(0, -4),
      root: `sha256:${createHash("sha256").update(sql).digest("hex")}`,
      sql,
    };
  });
const migrationSetRoot = `sha256:${createHash("sha256")
  .update(JSON.stringify(migrations.map(({ id, root }) => ({ id, root }))))
  .digest("hex")}`;

const migrate = process.argv.includes("--migrate");
const check = process.argv.includes("--check") || !migrate;
if (migrate === check) throw new Error("choose exactly one of --migrate or --check");

const databaseUrl = migrate
  ? process.env.VELA_PROJECTION_WRITER_DATABASE_URL
  : process.env.VELA_PROJECTION_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(migrate
    ? "set VELA_PROJECTION_WRITER_DATABASE_URL to migrate the schema"
    : "set VELA_PROJECTION_DATABASE_URL to check the schema");
}

const tableNames = Array.from(
  schemaSql.matchAll(/CREATE TABLE IF NOT EXISTS projection\.([a-z_]+)\s*\(/gu),
  (match) => match[1],
);
const publicTableNames = tableNames;
const indexNames = Array.from(
  schemaSql.matchAll(/CREATE INDEX IF NOT EXISTS ([a-z_]+)\s+/gu),
  (match) => match[1],
);
if (!tableNames.length || !indexNames.length) {
  throw new Error("current Problems schema has no table or index inventory");
}
if (new Set(tableNames).size !== tableNames.length) {
  throw new Error("current Problems schema repeats a table definition");
}
const sql = neon(databaseUrl);
const statements = sqlStatements;

/* Three states, not two. The ledger disagreeing with the checkout can mean the
database carries a migration nobody here wrote, or that a migration was
rewritten after it was applied — both are real errors. It can also mean this
checkout adds a migration the refresh has not run yet, which is the ordinary
state between merging a schema change and the refresh that applies it. Strict
equality called all three a mismatch, so `db:check` in CI failed for the whole
window and there was no way to land a migration without one red run. Returns
the pending set so a caller that must not tolerate it can say so. */
async function assertMigrationLedger(connection, { allowPending = false } = {}) {
  const installedRows = await connection.query(
    "SELECT migration_id, migration_root FROM projection.schema_migrations ORDER BY migration_id",
  );
  const installed = new Map(installedRows.map((row) => [row.migration_id, row.migration_root]));
  const expectedIds = new Set(migrations.map(({ id }) => id));
  const unknown = installedRows.filter(({ migration_id }) => !expectedIds.has(migration_id));
  if (unknown.length) {
    throw new Error(
      `database contains migrations unknown to this checkout: ${unknown.map(({ migration_id }) => migration_id).join(", ")}`,
    );
  }
  for (const migration of migrations) {
    const root = installed.get(migration.id);
    if (root && root !== migration.root) {
      throw new Error(`migration ${migration.id} was rewritten after it was applied`);
    }
  }
  const pending = migrations.filter(({ id }) => !installed.has(id)).map(({ id }) => id);
  if (pending.length && !allowPending) {
    throw new Error(`Problems migrations are not applied: ${pending.join(", ")}`);
  }
  return pending;
}

if (migrate) {
  const identity = await sql.query(
    "SELECT current_database() AS database, current_user AS role",
  );
  if (
    identity[0]?.database !== "vela_projection"
    || identity[0]?.role !== "neondb_owner"
  ) {
    throw new Error("schema migration requires vela_projection as neondb_owner");
  }
  await sql.transaction((transaction) => (
    statements(schemaSql).map((statement) => transaction.query(statement))
  ));
  const pendingIds = await assertMigrationLedger(sql, { allowPending: true });
  const pending = migrations.filter(({ id }) => pendingIds.includes(id));
  if (pending.length) {
    await sql.transaction((transaction) => [
      ...pending.flatMap((migration) => [
        ...statements(migration.sql).map((statement) => transaction.query(statement)),
        transaction.query(
          "INSERT INTO projection.schema_migrations (migration_id, migration_root) VALUES ($1, $2)",
          [migration.id, migration.root],
        ),
      ]),
    ]);
  }
  /* Strict here, and this is the call that keeps the relaxation above honest:
     after migrate runs, nothing may still be pending. */
  await assertMigrationLedger(sql);
  console.log(JSON.stringify({
    ok: true,
    mode: "migrate",
    schema_root: schemaRoot,
    tables: publicTableNames.length,
    migration_set_root: migrationSetRoot,
    migrations: migrations.length,
    indexes: indexNames.length,
  }));
} else {
  const identity = await sql.query(
    `SELECT current_database() AS database, current_user AS role,
       pg_has_role(current_user, $1, 'MEMBER') AS permission_member,
       (SELECT rolinherit FROM pg_roles WHERE rolname = current_user) AS inherits_privileges`,
    [projectionReaderIdentity.permissionRole],
  );
  if (
    identity[0]?.database !== projectionReaderIdentity.database
    || identity[0]?.role !== projectionReaderIdentity.loginRole
    || identity[0]?.permission_member !== true
    || identity[0]?.inherits_privileges !== true
  ) {
    throw new Error(
      `schema check requires ${projectionReaderIdentity.database} as ${projectionReaderIdentity.loginRole} inheriting ${projectionReaderIdentity.permissionRole}`,
    );
  }
  const relations = await sql.query(
    `SELECT expected.name, to_regclass('projection.' || expected.name) AS relation
     FROM unnest($1::text[]) AS expected(name)
     ORDER BY expected.name`,
    [tableNames],
  );
  const missingTables = relations
    .filter(({ relation }) => relation === null)
    .map(({ name }) => name);
  if (missingTables.length) {
    throw new Error(`current schema is missing tables: ${missingTables.join(", ")}`);
  }
  const pendingMigrations = await assertMigrationLedger(sql, { allowPending: true });
  const indexes = await sql.query(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'projection' AND indexname = ANY($1::text[])
     ORDER BY indexname`,
    [indexNames],
  );
  const installedIndexes = new Set(indexes.map(({ indexname }) => indexname));
  const missingIndexes = indexNames.filter((name) => !installedIndexes.has(name));
  if (missingIndexes.length) {
    throw new Error(`current schema is missing indexes: ${missingIndexes.join(", ")}`);
  }
  const privileges = await sql.query(
    `SELECT
       bool_and(has_table_privilege(current_user, 'projection.' || name, 'SELECT')) AS can_select,
       bool_or(has_table_privilege(
         current_user,
         'projection.' || name,
         'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
       )) AS can_write
     FROM unnest($1::text[]) AS expected(name)`,
    [publicTableNames],
  );
  if (privileges[0]?.can_select !== true || privileges[0]?.can_write !== false) {
    throw new Error("projection reader privileges do not match the current schema");
  }
  console.log(JSON.stringify({
    ok: true,
    mode: "check",
    schema_root: schemaRoot,
    tables: publicTableNames.length,
    migration_set_root: migrationSetRoot,
    migrations: migrations.length,
    /* Surfaced rather than thrown: a migration the refresh has not applied yet
       is expected, but it must be visible or it could sit pending forever. */
    pending_migrations: pendingMigrations,
    indexes: indexNames.length,
    reader: identity[0].role,
  }));
}
