import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  disposableReconstructionSql,
  installProjectionReaderRoles,
  withReconstructionDeadline,
} from "../scripts/reconstruct-projection.mjs";
import { sqlStatements } from "../scripts/sql-statements.mjs";
import { projectionReaderIdentity } from "../src/projection-reader";

const attemptRoots: string[] = [];

function command(name: string, args: string[]) {
  return execFileSync(name, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, LC_ALL: "C" },
  });
}

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("failed to allocate PostgreSQL port"));
        return;
      }
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

afterEach(() => {
  for (const root of attemptRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("disposable reconstruction SQL clients", () => {
  test("run two fresh clusters without prepared-name reuse and propagate query failure", async () => {
    const pgBin = process.env.PG_BIN_DIR ?? command("pg_config", ["--bindir"]).trim();
    const port = await availablePort();

    for (const attempt of [1, 2]) {
      const root = mkdtempSync(join(tmpdir(), `vela-reconstruction-sql-${attempt}-`));
      attemptRoots.push(root);
      const data = join(root, "postgres");
      const log = join(root, "postgres.log");
      command(join(pgBin, "initdb"), [
        "--pgdata", data,
        "--username", "postgres",
        "--auth", "trust",
        "--no-locale",
        "--no-instructions",
      ]);
      command(join(pgBin, "pg_ctl"), [
        "--pgdata", data,
        "--log", log,
        "--options", `-h 127.0.0.1 -p ${port} -k ${root} -c statement_timeout=5s`,
        "--wait",
        "start",
      ]);

      let admin;
      let owner;
      try {
        const base = `postgres://postgres@127.0.0.1:${port}`;
        admin = disposableReconstructionSql(`${base}/postgres?sslmode=disable`);
        await admin.unsafe("CREATE DATABASE vela_projection");
        await admin.close({ timeout: 5 });
        admin = undefined;

        owner = disposableReconstructionSql(`${base}/vela_projection?sslmode=disable`);
        if (attempt === 1) {
          await owner.unsafe("CREATE TABLE collision_probe (first integer NOT NULL)");
          await owner.unsafe("INSERT INTO collision_probe (first) VALUES ($1)", [1]);
        } else {
          await owner.unsafe(
            "CREATE TABLE collision_probe (first integer NOT NULL, second integer NOT NULL)",
          );
          await owner.unsafe(
            "INSERT INTO collision_probe (first, second) VALUES ($1, $2)",
            [1, 2],
          );
        }

        const prepared = await owner.unsafe(
          "SELECT count(*)::integer AS count FROM pg_prepared_statements",
        );
        expect(prepared[0]?.count).toBe(0);

        const startedAt = performance.now();
        await expect(withReconstructionDeadline(
          owner.unsafe("SELECT 1 / 0"),
          `attempt ${attempt} failure probe`,
          1_000,
        )).rejects.toThrow(/division by zero/iu);
        expect(performance.now() - startedAt).toBeLessThan(1_000);
      } finally {
        if (owner) {
          try { await owner.close({ timeout: 5 }); } catch {}
        }
        if (admin) {
          try { await admin.close({ timeout: 5 }); } catch {}
        }
        command(join(pgBin, "pg_ctl"), ["--pgdata", data, "--wait", "stop"]);
      }
    }
  }, 60_000);

  test("reconstructs a NOLOGIN permission role and a least-privilege versioned login", async () => {
    const pgBin = process.env.PG_BIN_DIR ?? command("pg_config", ["--bindir"]).trim();
    const port = await availablePort();
    const root = mkdtempSync(join(tmpdir(), "vela-reconstruction-reader-"));
    attemptRoots.push(root);
    const data = join(root, "postgres");
    const log = join(root, "postgres.log");
    command(join(pgBin, "initdb"), [
      "--pgdata", data,
      "--username", "postgres",
      "--auth", "trust",
      "--no-locale",
      "--no-instructions",
    ]);
    command(join(pgBin, "pg_ctl"), [
      "--pgdata", data,
      "--log", log,
      "--options", `-h 127.0.0.1 -p ${port} -k ${root} -c statement_timeout=5s`,
      "--wait",
      "start",
    ]);

    let admin;
    let owner;
    let reader;
    try {
      const base = `postgres://postgres@127.0.0.1:${port}`;
      admin = disposableReconstructionSql(`${base}/postgres?sslmode=disable`);
      await installProjectionReaderRoles(admin);
      const roles = await admin.unsafe(
        `SELECT rolname, rolcanlogin, rolinherit, rolsuper, rolcreatedb,
           rolcreaterole, rolreplication, rolbypassrls
         FROM pg_roles WHERE rolname IN ($1, $2) ORDER BY rolname`,
        [
          projectionReaderIdentity.permissionRole,
          projectionReaderIdentity.loginRole,
        ],
      );
      expect(roles).toEqual([
        {
          rolname: "vela_projection_reader",
          rolcanlogin: false,
          rolinherit: true,
          rolsuper: false,
          rolcreatedb: false,
          rolcreaterole: false,
          rolreplication: false,
          rolbypassrls: false,
        },
        {
          rolname: projectionReaderIdentity.loginRole,
          rolcanlogin: true,
          rolinherit: true,
          rolsuper: false,
          rolcreatedb: false,
          rolcreaterole: false,
          rolreplication: false,
          rolbypassrls: false,
        },
      ]);
      const [membership] = await admin.unsafe(
        "SELECT pg_has_role($1, $2, 'MEMBER') AS member",
        [
          projectionReaderIdentity.loginRole,
          projectionReaderIdentity.permissionRole,
        ],
      );
      expect(membership?.member).toBe(true);
      await admin.unsafe(`CREATE DATABASE ${projectionReaderIdentity.database}`);
      await admin.close({ timeout: 5 });
      admin = undefined;

      owner = disposableReconstructionSql(
        `${base}/${projectionReaderIdentity.database}?sslmode=disable`,
      );
      const schema = readFileSync(resolve(import.meta.dir, "../schema.sql"), "utf8");
      for (const statement of sqlStatements(schema)) await owner.unsafe(statement);

      const readerUrl = `postgres://${projectionReaderIdentity.loginRole}@127.0.0.1:${port}/${projectionReaderIdentity.database}?sslmode=disable`;
      reader = disposableReconstructionSql(readerUrl);
      const [boundary] = await reader.unsafe(`SELECT
        current_user AS role,
        has_schema_privilege(current_user, 'projection', 'USAGE') AS schema_usage,
        has_schema_privilege(current_user, 'projection', 'CREATE') AS schema_create,
        has_table_privilege(current_user, 'projection.current_release', 'SELECT') AS table_select,
        has_table_privilege(current_user, 'projection.current_release', 'INSERT,UPDATE,DELETE') AS table_write,
        (SELECT count(*)::integer FROM information_schema.table_privileges
          WHERE grantee = current_user) AS direct_table_grants`);
      expect(boundary).toEqual({
        role: projectionReaderIdentity.loginRole,
        schema_usage: true,
        schema_create: false,
        table_select: true,
        table_write: false,
        direct_table_grants: 0,
      });
      /* Bun.SQL can lose the rejection after a server-side protocol error —
         the exact failure mode this file's first test guards. Use the matching
         PostgreSQL client for the two deliberate denial probes so a missing
         rejection cannot turn the security assertion into a one-minute hang. */
      const refused = (statement: string) => () => execFileSync(
        join(pgBin, "psql"),
        [readerUrl, "--set", "ON_ERROR_STOP=1", "--command", statement],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 5_000 },
      );
      expect(refused(
        "UPDATE projection.current_release SET confirmed_at = confirmed_at WHERE false",
      )).toThrow(/permission denied/iu);
      expect(refused(
        "CREATE TABLE projection.reader_must_not_create (id integer)",
      )).toThrow(/permission denied/iu);
    } finally {
      if (reader) {
        try { await reader.close({ timeout: 5 }); } catch {}
      }
      if (owner) {
        try { await owner.close({ timeout: 5 }); } catch {}
      }
      if (admin) {
        try { await admin.close({ timeout: 5 }); } catch {}
      }
      command(join(pgBin, "pg_ctl"), ["--pgdata", data, "--wait", "stop"]);
    }
  }, 60_000);

  test("bounds a lost client promise", async () => {
    const startedAt = performance.now();
    await expect(withReconstructionDeadline(
      new Promise(() => {}),
      "lost protocol response",
      25,
    )).rejects.toThrow("reconstruction query timed out: lost protocol response");
    expect(performance.now() - startedAt).toBeLessThan(500);
  });
});
