import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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
      if (!address || typeof address === "string") return reject(new Error("failed to allocate PostgreSQL port"));
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

afterEach(() => {
  for (const path of temporaryRoots.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("Workspace CRDT activity migration", () => {
  test("keeps collaborative bytes append-only, rooted, bounded, and outside scientific authority", () => {
    const migration = read("migrations/20260813_workspace_crdt.sql");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS activity.workspace_crdt_updates");
    expect(migration).toContain("UNIQUE (workspace_id, anchor_root, document_name, update_root)");
    expect(migration).toContain("authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none')");
    expect(migration).toContain("octet_length(update_bytes) BETWEEN 1 AND 262144");
    expect(migration).toContain("public.digest(v_update_bytes, 'sha256')");
    expect(migration).toContain("PERFORM activity.require_membership(p_account_id, p_workspace_id)");
    expect(migration).toContain("v_anchor_root := activity.ensure_anchor(p_workspace_id, p_anchor)");
    expect(migration).not.toMatch(/\b(?:Decision|Verification|Standing)\b/u);
  });

  test("applies after current activity migrations and enforces roots, tenancy, idempotency, and audit", async () => {
    const pgBin = process.env.PG_BIN_DIR ?? command("pg_config", ["--bindir"]).trim();
    const port = await availablePort();
    const tempRoot = mkdtempSync(join(tmpdir(), "vela-workspace-crdt-"));
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
      for (const migration of [
        "20260811_activity_v1.sql",
        "20260812_current_anchor_read.sql",
        "20260812_target_bound_approach.sql",
        "20260813_execution_binding_lineage.sql",
        "20260813_problem_scoped_workspaces.sql",
        "20260813_workspace_crdt.sql",
        "20260814_problem_scoped_activity.sql",
      ]) applyFile(`migrations/${migration}`);

      const accountA = psql(database, "SELECT activity_api.ensure_account('user_A1','Alice','alice@example.test')->>'id'");
      const accountB = psql(database, "SELECT activity_api.ensure_account('user_B2','Bob','bob@example.test')->>'id'");
      const workspace = psql(database, `SELECT activity_api.create_workspace(
        '${accountA}'::uuid, 'crdt-test', 'CRDT test', 'workspace-key-a', '${root("a")}'
      )->>'id'`);
      const anchor = JSON.stringify({
        root: root("1"), projection_release_root: root("2"), repository_id: "math",
        repository_root: root("3"), source_commit: "4".repeat(40), source_tree: "5".repeat(40),
        problem_id: "321", problem_record_root: root("6"), source_observation_root: null,
        claim_id: null, claim_root: null, claim_standing: null,
      }).replaceAll("'", "''");
      const updateRoot = "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
      const append = (account: string, key: string, requestRoot: string, update = updateRoot) => psql(database, `
        SELECT activity_api.append_workspace_crdt_update(
          '${account}'::uuid, '${workspace}'::uuid, '${key}', '${requestRoot}',
          '${anchor}'::jsonb, 'canvas', '${update}', 'aGVsbG8='
        )::text
      `);

      const created = JSON.parse(append(accountA, "crdt-key-1", root("7")));
      expect(created).toMatchObject({
        workspace_id: workspace,
        anchor_root: root("1"),
        author_account_id: accountA,
        document_name: "canvas",
        update_root: updateRoot,
        update_base64: "aGVsbG8=",
        byte_size: 5,
        authority_effect: "none",
      });
      expect(JSON.parse(append(accountA, "crdt-key-1", root("7"))).id).toBe(created.id);
      expect(() => append(accountA, "crdt-key-1", root("8"))).toThrow(/idempotency key was reused/iu);
      expect(() => append(accountA, "crdt-key-2", root("9"), root("f"))).toThrow(/root does not match bytes/iu);
      expect(() => append(accountB, "crdt-key-3", root("b"))).toThrow(/membership required/iu);
      expect(() => psql(database, `SELECT activity_api.list_workspace_crdt_updates(
        '${accountB}'::uuid, '${workspace}'::uuid, 'math', '321'
      )`)).toThrow(/membership required/iu);

      const listed = JSON.parse(psql(database, `SELECT activity_api.list_workspace_crdt_updates(
        '${accountA}'::uuid, '${workspace}'::uuid, 'math', '321'
      )::text`));
      expect(listed).toHaveLength(1);
      expect(listed[0].id).toBe(created.id);
      expect(JSON.parse(psql(database, `SELECT activity_api.list_workspace_crdt_updates(
        '${accountA}'::uuid, '${workspace}'::uuid, 'math', 'not-321'
      )::text`))).toEqual([]);
      expect(psql(database, `SELECT count(*) FROM activity.activity_audit_entries
        WHERE operation='crdt_update.append' AND subject_id='${created.id}'`)).toBe("1");
      expect(() => psql(database, `UPDATE activity.workspace_crdt_updates SET authority_effect='standing'
        WHERE id='${created.id}'::uuid`)).toThrow(/workspace_crdt_updates_authority_effect_check/iu);
    } finally {
      command(join(pgBin, "pg_ctl"), ["--pgdata", data, "--wait", "stop"]);
    }
  }, 60_000);
});
