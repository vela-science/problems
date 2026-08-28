import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PILOT_TELEMETRY_SIGNALS, pilotTelemetryRecord } from "../src/pilot-telemetry";
import { withActivityPostgres } from "./activity-postgres";

const packageRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(packageRoot, path), "utf8");

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
    /* install_id is client-minted, so the per-install budget bounds only an
       honest client. The global ceiling is the bound that survives rotation,
       and it reads the received_at index. */
    expect(sql).toContain("WHERE received_at > now() - interval '1 hour') >= 50000");
    expect(sql).toContain("pilot telemetry ingestion ceiling is reached");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS activity_pilot_telemetry_received_idx");
    expect(sql).not.toMatch(/REFERENCES activity\./u);
    expect(sql).not.toMatch(/\b(?:account_id|workspace_id|email|payload|body|prompt|bytea|jsonb_typeof)\b/u);
    expect(sql).not.toMatch(/\b(?:Decision|Verification|Standing)\b/u);
  });
});

describe("pilot telemetry activity schema", () => {
  test("applies from the clean schema and enforces vocabulary, dedupe, window, retention, and both admission bounds", async () => {
    await withActivityPostgres("pilot-telemetry", ({ psql }) => {
      const call = (recordId: string, signal: string, occurredAt: string, stageMs: string) => psql(`
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
      expect(() => psql(`SELECT activity_api.record_pilot_telemetry(
        'not-an-install-id', '${"5".repeat(32)}', 'check_completed', now(), NULL)`)).toThrow(/identifiers are invalid/iu);

      /* Retention is a property of the write path itself. */
      psql(`UPDATE activity.pilot_telemetry SET received_at = now() - interval '91 days'
        WHERE client_record_id = '${first}'`);
      expect(JSON.parse(call("6".repeat(32), "readback_completed", now, "NULL")).stored).toBe(true);
      expect(psql(`SELECT count(*) FROM activity.pilot_telemetry WHERE client_record_id = '${first}'`)).toBe("0");

      /* The application role executes the API but never touches the table. */
      expect(psql(`SELECT has_function_privilege('vela_activity_app',
        'activity_api.record_pilot_telemetry(text,text,text,timestamptz,bigint)', 'EXECUTE')`)).toBe("t");
      expect(psql(`SELECT has_table_privilege('vela_activity_app',
        'activity.pilot_telemetry', 'SELECT,INSERT,UPDATE,DELETE')`)).toBe("f");

      /* The per-install budget bounds an honest client that keeps one
         install_id. Rows are seeded directly so the branch is reached without
         5,000 round trips. */
      psql("DELETE FROM activity.pilot_telemetry");
      psql(`INSERT INTO activity.pilot_telemetry
        (install_id, client_record_id, signal, occurred_at)
        SELECT '${INSTALL_ID}', md5(i::text), 'problem_opened', now()
        FROM generate_series(1, 5000) AS i`);
      expect(() => call("7".repeat(32), "problem_opened", now, "NULL"))
        .toThrow(/budget for this install is exhausted/iu);
      /* A different install_id is unaffected, which is exactly why the
         per-install budget is not a global bound: install_id is client-minted
         and an attacker rotates it. */
      expect(JSON.parse(psql(`SELECT activity_api.record_pilot_telemetry(
        '${"c".repeat(32)}', '${"8".repeat(32)}', 'problem_opened', now(), NULL)::text`)).stored).toBe(true);

      /* The global ceiling is the bound that holds against rotation. */
      psql("DELETE FROM activity.pilot_telemetry");
      psql(`INSERT INTO activity.pilot_telemetry
        (install_id, client_record_id, signal, occurred_at, received_at)
        SELECT md5(i::text), md5(('r' || i)::text), 'problem_opened', now(), now()
        FROM generate_series(1, 50000) AS i`);
      expect(() => psql(`SELECT activity_api.record_pilot_telemetry(
        '${"d".repeat(32)}', '${"9".repeat(32)}', 'problem_opened', now(), NULL)`))
        .toThrow(/ingestion ceiling is reached/iu);
      /* The ceiling reads the trailing hour, so it releases as rows age out of
         the window rather than latching permanently. */
      psql("UPDATE activity.pilot_telemetry SET received_at = now() - interval '2 hours'");
      expect(JSON.parse(psql(`SELECT activity_api.record_pilot_telemetry(
        '${"d".repeat(32)}', '${"9".repeat(32)}', 'problem_opened', now(), NULL)::text`)).stored).toBe(true);
    });
  }, 60_000);
});
