import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PILOT_TELEMETRY_SIGNALS, pilotTelemetryRecord } from "../src/pilot-telemetry";

const packageRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(packageRoot, path), "utf8");
const temporaryRoots: string[] = [];

function command(name: string, args: string[]) {
  return execFileSync(name, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, LC_ALL: "C" },
  });
}

async function availablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("failed to allocate PostgreSQL port"));
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

afterEach(() => {
  for (const path of temporaryRoots.splice(0)) rmSync(path, { recursive: true, force: true });
});

const INSTALL_ID = "a".repeat(32);
const record = (overrides: Record<string, unknown> = {}) => ({
  schema: "vela.pilot-telemetry.v1",
  install_id: INSTALL_ID,
  record_id: "b".repeat(32),
  signal: "continuation_started",
  occurred_at: "2026-08-19T12:00:00Z",
  stage_ms: 4200,
  ...overrides,
});

describe("pilot telemetry wire contract", () => {
  test("accepts exactly the four content-free facts and nothing else", () => {
    expect(pilotTelemetryRecord.safeParse(record()).success).toBe(true);
    const minimal = record();
    delete (minimal as Record<string, unknown>).stage_ms;
    expect(pilotTelemetryRecord.safeParse(minimal).success).toBe(true);

    for (const rejected of [
      record({ prompt: "prove it" }),
      record({ file_path: "/private/checkout" }),
      record({ token: "x" }),
      record({ schema: "vela.pilot-telemetry.v2" }),
      record({ install_id: "A".repeat(32) }),
      record({ record_id: "b".repeat(31) }),
      record({ signal: "transcript_uploaded" }),
      record({ occurred_at: "yesterday" }),
      record({ occurred_at: 1755600000 }),
      record({ stage_ms: -1 }),
      record({ stage_ms: 86_400_001 }),
      record({ stage_ms: 12.5 }),
    ]) {
      expect(pilotTelemetryRecord.safeParse(rejected).success).toBe(false);
    }
  });

  test("keeps the signal vocabulary closed and identical in code and schema", () => {
    const sql = read("schema/pilot-telemetry.sql");
    for (const signal of PILOT_TELEMETRY_SIGNALS) expect(sql).toContain(`'${signal}'`);
    const checked = [...sql.matchAll(/'([a-z_]+)'/gu)].map((match) => match[1]);
    for (const value of checked.filter((name) => name.endsWith("_succeeded") || name.endsWith("_completed") || name.endsWith("_failed") || name.endsWith("_opened") || name.endsWith("_started"))) {
      expect(PILOT_TELEMETRY_SIGNALS).toContain(value as (typeof PILOT_TELEMETRY_SIGNALS)[number]);
    }
  });

  test("stores no identity, contents, or references to any other activity table", () => {
    const sql = read("schema/pilot-telemetry.sql");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS activity.pilot_telemetry");
    expect(sql).toContain("UNIQUE (install_id, client_record_id)");
    expect(sql).toContain("authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none')");
    expect(sql).toContain("DELETE FROM activity.pilot_telemetry WHERE received_at < now() - interval '90 days'");
    expect(sql).not.toMatch(/REFERENCES activity\./u);
    expect(sql).not.toMatch(/\b(?:account_id|workspace_id|email|payload|body|prompt|bytea|jsonb_typeof)\b/u);
    expect(sql).not.toMatch(/\b(?:Decision|Verification|Standing)\b/u);
  });
});

describe("pilot telemetry activity schema", () => {
  test("applies from the clean schema and enforces vocabulary, dedupe, window, and retention", async () => {
    const pgBin = process.env.PG_BIN_DIR ?? command("pg_config", ["--bindir"]).trim();
    const port = await availablePort();
    const tempRoot = mkdtempSync(join(tmpdir(), "vela-pilot-telemetry-"));
    temporaryRoots.push(tempRoot);
    const data = join(tempRoot, "postgres");
    const log = join(tempRoot, "postgres.log");
    command(join(pgBin, "initdb"), [
      "--pgdata", data, "--username", "postgres", "--auth", "trust", "--no-locale", "--no-instructions",
    ]);
    command(join(pgBin, "pg_ctl"), [
      "--pgdata", data, "--log", log,
      "--options", `-h 127.0.0.1 -p ${port} -k ${tempRoot} -c statement_timeout=5s`,
      "--wait", "start",
    ]);
    const base = `postgres://postgres@127.0.0.1:${port}`;
    const admin = `${base}/postgres?sslmode=disable`;
    const database = `${base}/vela_activity?sslmode=disable`;
    const psql = (url: string, statement: string) => command(join(pgBin, "psql"), [
      url, "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", statement,
    ]).trim();
    const applyFile = (path: string) => command(join(pgBin, "psql"), [
      database, "--set", "ON_ERROR_STOP=1", "--single-transaction", "--file", resolve(packageRoot, path),
    ]);

    try {
      command(join(pgBin, "psql"), [admin, "--set", "ON_ERROR_STOP=1", "--file", resolve(packageRoot, "roles.sql")]);
      psql(admin, "CREATE DATABASE vela_activity");
      psql(database, "GRANT CREATE ON DATABASE vela_activity TO vela_activity_owner");
      for (const fragment of ["base.sql", "pilot-telemetry.sql"]) applyFile(`schema/${fragment}`);

      const call = (recordId: string, signal: string, occurredAt: string, stageMs: string) => psql(database, `
        SELECT activity_api.record_pilot_telemetry(
          '${INSTALL_ID}', '${recordId}', '${signal}', '${occurredAt}'::timestamptz, ${stageMs}
        )::text
      `);
      const first = "1".repeat(32);
      const now = new Date().toISOString();

      expect(JSON.parse(call(first, "continuation_started", now, "4200"))).toEqual({
        stored: true, duplicate: false, authority_effect: "none",
      });
      expect(JSON.parse(call(first, "continuation_started", now, "4200"))).toEqual({
        stored: false, duplicate: true, authority_effect: "none",
      });
      expect(() => call(first, "check_completed", now, "4200")).toThrow(/reused with different content/iu);
      expect(() => call("2".repeat(32), "transcript_uploaded", now, "NULL")).toThrow(/closed vocabulary/iu);
      expect(() => call("3".repeat(32), "check_completed", "2020-01-01T00:00:00Z", "NULL")).toThrow(/accepted window/iu);
      expect(() => call("4".repeat(32), "check_completed", now, "86400001")).toThrow(/out of bounds/iu);
      expect(() => psql(database, `SELECT activity_api.record_pilot_telemetry(
        'not-an-install-id', '${"5".repeat(32)}', 'check_completed', now(), NULL)`)).toThrow(/identifiers are invalid/iu);

      /* Retention is a property of the write path itself. */
      psql(database, `UPDATE activity.pilot_telemetry SET received_at = now() - interval '91 days'
        WHERE client_record_id = '${first}'`);
      expect(JSON.parse(call("6".repeat(32), "readback_completed", now, "NULL")).stored).toBe(true);
      expect(psql(database, `SELECT count(*) FROM activity.pilot_telemetry WHERE client_record_id = '${first}'`)).toBe("0");

      /* The application role executes the API but never touches the table. */
      expect(psql(database, `SELECT has_function_privilege('vela_activity_app',
        'activity_api.record_pilot_telemetry(text,text,text,timestamptz,bigint)', 'EXECUTE')`)).toBe("t");
      expect(psql(database, `SELECT has_table_privilege('vela_activity_app',
        'activity.pilot_telemetry', 'SELECT,INSERT,UPDATE,DELETE')`)).toBe("f");
    } finally {
      command(join(pgBin, "pg_ctl"), ["--pgdata", data, "--wait", "stop"]);
    }
  }, 60_000);
});
