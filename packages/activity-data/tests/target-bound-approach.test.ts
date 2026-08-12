import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { sqlStatements } from "../scripts/sql-statements.mjs";

const packageRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(packageRoot, path), "utf8");
const temporaryRoots: string[] = [];
const root = (digit: string) => `sha256:${digit.repeat(64).slice(0, 64)}`;

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
      if (!address || typeof address === "string") {
        reject(new Error("failed to allocate PostgreSQL port"));
        return;
      }
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

afterEach(() => {
  for (const path of temporaryRoots.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("Target-bound Approach migration contract", () => {
  test("is additive, non-authoritative, immutable, and parseable as one rooted migration", () => {
    const migration = read("migrations/20260812_target_bound_approach.sql");
    expect(sqlStatements(migration).length).toBeGreaterThan(8);
    expect(migration).toContain("ADD COLUMN target_id text");
    expect(migration).toContain("ADD COLUMN target_packet_root text");
    expect(migration).toContain("ADD COLUMN target_record_root text");
    expect(migration).toContain("ADD COLUMN authority_effect text NOT NULL DEFAULT 'none'");
    expect(migration).toContain("CHECK (authority_effect = 'none')");
    expect(migration).toContain("target_id = btrim(target_id)");
    expect(migration).toContain("WHERE target_id IS NOT NULL");
    expect(migration).toContain("source_approach.target_id");
    expect(migration).toContain("source_approach.target_packet_root");
    expect(migration).toContain("source_approach.target_record_root");
    expect(migration).not.toMatch(/CREATE TABLE\s+activity\.(?:targets|relations)|FOREIGN KEY[^;]+target_/isu);
    expect(migration).not.toMatch(/approach\.(?:update|rebind)|target\.(?:update|rebind)/iu);
    expect(migration).not.toMatch(/Decision|Verification|Standing|scientific State write/iu);
    expect(migration).not.toMatch(/\bDROP\b/iu);
  });

  test("keeps old creation bytes unbound while new request identity covers every binding field", () => {
    const source = read("src/activity.ts");
    expect(source).toContain("if (target === undefined) return {};");
    expect(source).toContain("target_id: null");
    expect(source).toContain("target_packet_root: null");
    expect(source).toContain("target_record_root: null");
    expect(source).toContain("...normalizedApproachTarget(input.target)");
    expect(source).not.toContain("authority_effect:");
  });

  test("applies to a disposable local database and enforces compatibility, tenancy, retries, and inheritance", async () => {
    const pgBin = process.env.PG_BIN_DIR ?? command("pg_config", ["--bindir"]).trim();
    const port = await availablePort();
    const tempRoot = mkdtempSync(join(tmpdir(), "vela-target-approach-"));
    temporaryRoots.push(tempRoot);
    const data = join(tempRoot, "postgres");
    const log = join(tempRoot, "postgres.log");
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
      "--options", `-h 127.0.0.1 -p ${port} -k ${tempRoot} -c statement_timeout=5s`,
      "--wait",
      "start",
    ]);
    const base = `postgres://postgres@127.0.0.1:${port}`;
    const admin = `${base}/postgres?sslmode=disable`;
    const database = `${base}/vela_activity?sslmode=disable`;
    const psql = (url: string, statement: string) => command(join(pgBin, "psql"), [
      url,
      "--set", "ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--command", statement,
    ]).trim();
    const applyFile = (path: string) => command(join(pgBin, "psql"), [
      database,
      "--set", "ON_ERROR_STOP=1",
      "--single-transaction",
      "--file", resolve(packageRoot, path),
    ]);

    try {
      command(join(pgBin, "psql"), [admin, "--set", "ON_ERROR_STOP=1", "--file", resolve(packageRoot, "roles.sql")]);
      psql(admin, "CREATE DATABASE vela_activity");
      psql(database, "GRANT CREATE ON DATABASE vela_activity TO vela_activity_owner");
      applyFile("migrations/20260811_activity_v1.sql");
      applyFile("migrations/20260812_current_anchor_read.sql");

      const accountA = psql(database, "SELECT activity_api.ensure_account('user_A1','Alice','alice@example.test')->>'id'");
      const accountB = psql(database, "SELECT activity_api.ensure_account('user_B2','Bob','bob@example.test')->>'id'");
      const workspace = psql(database, `SELECT activity_api.create_workspace(
        '${accountA}'::uuid, 'target-test', 'Target test', 'workspace-key-a', '${root("a")}'
      )->>'id'`);
      const anchor = {
        root: root("1"),
        projection_release_root: root("2"),
        repository_id: "math",
        repository_root: root("3"),
        source_commit: "4".repeat(40),
        source_tree: "5".repeat(40),
        problem_id: "321",
        problem_record_root: root("6"),
        source_observation_root: null,
        claim_id: null,
        claim_root: null,
        claim_standing: null,
      };
      const create = (account: string, key: string, requestRoot: string, payload: object) => psql(
        database,
        `SELECT activity_api.execute_command(
          '${account}'::uuid, '${workspace}'::uuid, 'approach.create', ${sqlLiteral(key)},
          ${sqlLiteral(requestRoot)}, ${sqlLiteral(JSON.stringify(payload))}::jsonb, NULL
        )::text`,
      );

      const oldPayload = { anchor, title: "Old client", summary: "Omitted binding fields." };
      const beforeMigration = JSON.parse(create(accountA, "approach-before-key", root("0"), {
        ...oldPayload,
        title: "Retained before migration",
      }));
      expect(beforeMigration).not.toHaveProperty("target_id");

      applyFile("migrations/20260812_target_bound_approach.sql");

      const retained = JSON.parse(psql(database, `SELECT to_jsonb(a)::text
        FROM activity.approaches a WHERE id='${beforeMigration.id}'::uuid`));
      expect(retained).toMatchObject({
        id: beforeMigration.id,
        title: "Retained before migration",
        version: beforeMigration.version,
        created_at: beforeMigration.created_at,
        updated_at: beforeMigration.updated_at,
        target_id: null,
        target_packet_root: null,
        target_record_root: null,
        authority_effect: "none",
      });

      // This is the safe application rollback/deployment-window path: the old
      // command payload remains valid after the additive schema migration.
      const oldResponse = JSON.parse(create(accountA, "approach-old-key", root("7"), oldPayload));
      expect(oldResponse).toMatchObject({
        target_id: null,
        target_packet_root: null,
        target_record_root: null,
        authority_effect: "none",
      });

      const boundPayload = {
        anchor,
        title: "Bound client",
        summary: "Exact packet.",
        target_id: "math:321:bounded-search",
        target_packet_root: root("8"),
        target_record_root: null,
        authority_effect: "standing",
      };
      const firstBound = JSON.parse(create(accountA, "approach-bound-key", root("9"), boundPayload));
      const repeatedBound = JSON.parse(create(accountA, "approach-bound-key", root("9"), boundPayload));
      expect(repeatedBound.id).toBe(firstBound.id);
      expect(firstBound).toMatchObject({
        target_id: "math:321:bounded-search",
        target_packet_root: root("8"),
        target_record_root: null,
        authority_effect: "none",
      });

      const fork = JSON.parse(psql(database, `SELECT activity_api.execute_command(
        '${accountA}'::uuid, '${workspace}'::uuid, 'approach.fork', 'approach-fork-key',
        '${root("b")}', ${sqlLiteral(JSON.stringify({
          source_approach_id: firstBound.id,
          title: null,
          summary: null,
        }))}::jsonb, 1
      )::text`));
      expect(fork).toMatchObject({
        parent_approach_id: firstBound.id,
        target_id: "math:321:bounded-search",
        target_packet_root: root("8"),
        target_record_root: null,
        authority_effect: "none",
      });

      const activity = JSON.parse(psql(database, `SELECT activity_api.get_problem_activity(
        '${accountA}'::uuid, '${workspace}'::uuid, 'math', '321'
      )::text`));
      expect(activity.approaches).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: oldResponse.id, target_id: null, authority_effect: "none" }),
        expect.objectContaining({ id: firstBound.id, target_packet_root: root("8"), authority_effect: "none" }),
      ]));
      expect(psql(database, `SELECT request_root FROM activity.activity_audit_entries
        WHERE subject_id='${firstBound.id}'`)).toBe(root("9"));

      expect(() => create(accountA, "approach-partial-key", root("c"), {
        ...oldPayload,
        target_id: "math:321:partial",
      })).toThrow(/Target binding is partial/iu);
      expect(() => create(accountA, "approach-malformed-key", root("d"), {
        ...oldPayload,
        target_id: "math:321:malformed",
        target_packet_root: "sha256:short",
        target_record_root: null,
      })).toThrow(/activity_approaches_target_binding_check/iu);
      expect(() => create(accountA, "approach-padded-key", root("a"), {
        ...oldPayload,
        target_id: " math:321:padded ",
        target_packet_root: root("8"),
        target_record_root: null,
      })).toThrow(/activity_approaches_target_binding_check/iu);
      expect(() => create(accountA, "approach-bound-key", root("e"), boundPayload))
        .toThrow(/idempotency key was reused with different input/iu);
      expect(() => create(accountB, "approach-cross-key", root("f"), oldPayload))
        .toThrow(/workspace membership required/iu);
      expect(() => psql(database, `SELECT activity_api.get_problem_activity(
        '${accountB}'::uuid, '${workspace}'::uuid, 'math', '321'
      )`)).toThrow(/workspace membership required/iu);
      expect(() => psql(database, `SELECT activity_api.execute_command(
        '${accountA}'::uuid, '${workspace}'::uuid, 'approach.rebind', 'approach-rebind-key',
        '${root("0")}', '{}'::jsonb, NULL
      )`)).toThrow(/unsupported activity command/iu);
      expect(() => psql(database, `UPDATE activity.approaches
        SET authority_effect='standing' WHERE id='${firstBound.id}'::uuid`))
        .toThrow(/activity_approaches_authority_effect_check/iu);
    } finally {
      command(join(pgBin, "pg_ctl"), ["--pgdata", data, "--wait", "stop"]);
    }
  }, 60_000);
});
