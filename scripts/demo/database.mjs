import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { projectionReaderIdentity } from "../../packages/projection-data/src/projection-reader.ts";
import { sqlStatements } from "./sql-statements.mjs";

/* One Postgres, in this process, with no Postgres installed.
 *
 * The projection is normally rebuilt into Neon by a digest-pinned Vela binary
 * reading canonical Git repositories, and the reconstruction verifier spins up
 * real local clusters with initdb and pg_ctl to prove that build is
 * deterministic. Both are correct and neither is something a person cloning
 * this repository should have to arrange. PGlite is Postgres compiled to
 * WebAssembly: `bun install` is the whole dependency.
 *
 * The two planes stay separate here, as they are in production — separate
 * schemas, separate roles, separate reader boundary — because merging them for
 * local convenience would make the one property this application is about
 * untestable outside production. */

const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

export const DEMO_ROLES = Object.freeze({
  projectionReader: projectionReaderIdentity.loginRole,
  activityApp: "vela_activity_app",
});

/* The activity plane separates who owns the schema, who migrates it, and who
   the application connects as. Production creates these in Neon; the demo
   creates the same three so the GRANT and REVOKE statements in the schema mean
   here what they mean there. */
const ACTIVITY_ROLES = ["vela_activity_owner", "vela_activity_migrator", "vela_activity_app"];

/* One statement at a time. See sql-statements.mjs for why `exec` on the whole
   file is not equivalent. */
async function run(db, sql, label) {
  for (const statement of sqlStatements(sql)) {
    try {
      await db.exec(statement);
    } catch (error) {
      throw new Error(`${label}: ${error.message}\n  in: ${statement.slice(0, 160)}`);
    }
  }
}

async function installRoles(db) {
  const { permissionRole, loginRole } = projectionReaderIdentity;
  await db.exec(`
    CREATE ROLE ${permissionRole} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
    CREATE ROLE ${loginRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
    GRANT ${permissionRole} TO ${loginRole};
  `);
  for (const role of ACTIVITY_ROLES) {
    await db.exec(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;`);
    /* `ALTER DEFAULT PRIVILEGES FOR ROLE x` requires membership in x, and the
       schema sets defaults for the owner. Neon's migrator has that membership;
       here the bootstrapping superuser is granted it explicitly. */
    await db.exec(`GRANT ${role} TO CURRENT_USER;`);
  }
}

function projectionMigrations() {
  const directory = resolve(root, "packages/projection-data/migrations");
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, body: readFileSync(resolve(directory, name), "utf8") }));
}

/* Order matters: base.sql declares the schema, the command allowlist and the
   audit table every other file writes into. The rest are additive and sorted
   so a new file cannot silently depend on load order. */
function activitySchemas() {
  const directory = resolve(root, "packages/activity-data/schema");
  const names = readdirSync(directory).filter((name) => name.endsWith(".sql")).sort();
  const ordered = ["base.sql", ...names.filter((name) => name !== "base.sql")];
  return ordered.map((name) => ({ name, body: readFileSync(resolve(directory, name), "utf8") }));
}

export async function createDemoDatabase({ onStep = () => {} } = {}) {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec("CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;");
  onStep("pgcrypto");

  await installRoles(db);
  onStep("roles");

  await run(db, read("packages/projection-data/schema.sql"), "projection schema");
  for (const migration of projectionMigrations()) {
    await run(db, migration.body, `projection migration ${migration.name}`);
    onStep(`projection migration ${migration.name}`);
  }
  onStep("projection schema");

  for (const schema of activitySchemas()) {
    await run(db, schema.body, `activity schema ${schema.name}`);
  }
  onStep("activity schema");

  return db;
}
