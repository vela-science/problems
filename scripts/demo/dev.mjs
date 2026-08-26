#!/usr/bin/env bun
/* `bun run dev:demo` — the whole application, from a clean clone, with no
 * credentials of any kind.
 *
 * Production reads a Neon projection built by a digest-pinned Vela binary from
 * canonical Git repositories, and a hosted activity database beside it. Neither
 * is something a person evaluating this repository should have to arrange, and
 * publishing a database URL so they don't have to would be worse than the
 * inconvenience.
 *
 * So both planes are built here, in this process: real schemas, real role
 * topology, real projected rows, served over the same protocol the application
 * speaks to Neon. There is one application code path, not a demo one — the app
 * cannot tell the difference, which is the only way this proves anything.
 *
 * Sign-in is absent rather than faked. Without the four WorkOS variables the
 * application already degrades to a fully readable public Problems, so the
 * read-only WebMCP tools work and the write tools explain why they cannot.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createDemoDatabase } from "./database.mjs";
import { createSqlServer } from "./sql-server.mjs";
import { sqlStatements } from "./sql-statements.mjs";

const root = resolve(import.meta.dirname, "../..");
const started = Date.now();
const step = (message) => process.stderr.write(`  ${String((Date.now() - started) / 1000).padStart(5)}s  ${message}\n`);

process.stderr.write("\nproblems.science — local demo\n\n");

const db = await createDemoDatabase({ onStep: step });

const seed = readFileSync(resolve(import.meta.dirname, "seed.sql"), "utf8");
const statements = sqlStatements(seed);
for (const statement of statements) await db.exec(statement);
step(`seed loaded (${statements.length} rows)`);

const release = await db.query("select release_root from projection.current_release");
const root_ = release.rows[0]?.release_root;
if (!root_) throw new Error("the demo seed activated no release");

const { endpoint, close } = await createSqlServer(db);
step(`postgres serving ${endpoint}`);

process.stderr.write(`\n  projection release  ${root_}\n`);
process.stderr.write("  accounts            disabled (no WorkOS credentials, by design)\n");
process.stderr.write("\n  Open  http://localhost:3000/problems/erdos-problems/321\n");
process.stderr.write("  Tools http://localhost:3000/problems/erdos-problems/321?webmcp\n\n");

/* Both planes point at the one endpoint. They stay separate schemas with
   separate roles, exactly as in production; sharing a process is a local
   convenience and not a merge of the two planes. */
const child = spawn("bun", ["run", "--filter", "@vela/problems", "dev"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    VELA_NEON_FETCH_ENDPOINT: endpoint,
    VELA_PROJECTION_DATABASE_URL: `postgresql://vela_projection_reader_20260813:demo@127.0.0.1/vela_projection`,
    VELA_ACTIVITY_DATABASE_URL: `postgresql://vela_activity_app:demo@127.0.0.1/vela_activity`,
    /* Left unset deliberately: WORKOS_*, GITHUB_APP_*. */
  },
});

const shutdown = async (signal) => {
  child.kill(signal);
  await close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
child.on("exit", (code) => void close().then(() => process.exit(code ?? 0)));
