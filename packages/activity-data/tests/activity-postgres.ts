import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");

/* One throwaway PostgreSQL, for the suites that must execute SQL rather than
 * read it.
 *
 * This bootstrap — allocate a port, initdb, pg_ctl, create the roles, create the
 * database, apply the schema, tear down — was written out three times, once per
 * suite, and each copy hand-listed which fragments to apply. That list is the
 * part that rots: deleting `problem-workspaces.sql` left a stale entry in one of
 * them, and a suite applying a subset is testing a database shape that is not
 * the one `schema.mjs` deploys.
 *
 * So the fragment list is not a list. It is the same `readdir().sort()` the
 * migration runner uses, which makes the test database the deployed shape by
 * construction and cannot drift from it.
 *
 * The proof that matters for what actually serves traffic is
 * `scripts/live-proof.mjs`, run against Neon. This harness is for the
 * constraint-level facts that would mean writing throwaway rows to a real
 * database to observe: a CHECK rejecting a value, a byte cap, a trigger.
 */
export type ActivityPostgres = {
  /** Run a statement and return its single scalar result, trimmed. */
  psql: (statement: string) => string;
  /** Connection URL for the freshly built `vela_activity` database. */
  url: string;
};

const run = (name: string, args: string[]) => execFileSync(name, args, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, LC_ALL: "C" },
});

async function availablePort(): Promise<number> {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return fail(new Error("failed to allocate PostgreSQL port"));
      server.close((error) => error ? fail(error) : done(address.port));
    });
  });
}

export async function withActivityPostgres<T>(
  label: string,
  body: (database: ActivityPostgres) => T | Promise<T>,
): Promise<T> {
  const pgBin = process.env.PG_BIN_DIR ?? run("pg_config", ["--bindir"]).trim();
  const port = await availablePort();
  const tempRoot = mkdtempSync(join(tmpdir(), `vela-${label}-`));
  const data = join(tempRoot, "postgres");
  run(join(pgBin, "initdb"), [
    "--pgdata", data, "--username", "postgres", "--auth", "trust", "--no-locale", "--no-instructions",
  ]);
  run(join(pgBin, "pg_ctl"), [
    "--pgdata", data, "--log", join(tempRoot, "postgres.log"),
    "--options", `-h 127.0.0.1 -p ${port} -k ${tempRoot} -c statement_timeout=5s`,
    "--wait", "start",
  ]);
  const base = `postgres://postgres@127.0.0.1:${port}`;
  const admin = `${base}/postgres?sslmode=disable`;
  const url = `${base}/vela_activity?sslmode=disable`;
  const psql = (statement: string, target = url) => run(join(pgBin, "psql"), [
    target, "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", statement,
  ]).trim();
  const applyFile = (path: string, target = url) => run(join(pgBin, "psql"), [
    target, "--set", "ON_ERROR_STOP=1", "--single-transaction", "--file", resolve(packageRoot, path),
  ]);

  try {
    applyFile("roles.sql", admin);
    psql("CREATE DATABASE vela_activity", admin);
    psql("GRANT CREATE ON DATABASE vela_activity TO vela_activity_owner");
    /* Exactly what `scripts/schema.mjs` applies, in exactly its order. */
    for (const fragment of readdirSync(resolve(packageRoot, "schema")).filter((name) => name.endsWith(".sql")).sort()) {
      applyFile(`schema/${fragment}`);
    }
    return await body({ psql: (statement: string) => psql(statement), url });
  } finally {
    run(join(pgBin, "pg_ctl"), ["--pgdata", data, "--wait", "stop"]);
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
