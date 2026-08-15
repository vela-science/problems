import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const temporaryRoots: string[] = [];
const root = (digit: string) => `sha256:${digit.repeat(64)}`;
function command(name: string, args: string[]) {
  return execFileSync(name, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, LC_ALL: "C" } });
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
afterEach(() => { for (const path of temporaryRoots.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe("GitHub connection custody", () => {
  test("stores roots and lifecycle metadata but no token or source bytes", () => {
    const sql = readFileSync(resolve(packageRoot, "schema/github-codebases.sql"), "utf8");
    expect(sql).not.toMatch(/access_token|refresh_token|private_key|archive_bytes|source_bytes/iu);
    expect(sql).toContain("authority_effect text NOT NULL DEFAULT 'none'");
    expect(sql).toContain("GitHub delivery identifier was reused with different bytes");
  });

  test("binds installation ownership, deduplicates exact delivery bytes, and revokes private access", async () => {
    const pgBin = process.env.PG_BIN_DIR ?? command("pg_config", ["--bindir"]).trim();
    const port = await availablePort();
    const tempRoot = mkdtempSync(join(tmpdir(), "vela-github-codebases-"));
    temporaryRoots.push(tempRoot);
    const data = join(tempRoot, "postgres");
    const log = join(tempRoot, "postgres.log");
    command(join(pgBin, "initdb"), ["--pgdata", data, "--username", "postgres", "--auth", "trust", "--no-locale", "--no-instructions"]);
    command(join(pgBin, "pg_ctl"), ["--pgdata", data, "--log", log, "--options", `-h 127.0.0.1 -p ${port} -k ${tempRoot}`, "--wait", "start"]);
    const base = `postgres://postgres@127.0.0.1:${port}`;
    const admin = `${base}/postgres?sslmode=disable`;
    const database = `${base}/vela_activity?sslmode=disable`;
    const psql = (url: string, statement: string) => command(join(pgBin, "psql"), [url, "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", statement]).trim();
    const apply = (name: string) => command(join(pgBin, "psql"), [database, "--set", "ON_ERROR_STOP=1", "--single-transaction", "--file", resolve(packageRoot, `schema/${name}`)]);
    try {
      command(join(pgBin, "psql"), [admin, "--set", "ON_ERROR_STOP=1", "--file", resolve(packageRoot, "roles.sql")]);
      psql(admin, "CREATE DATABASE vela_activity");
      psql(database, "GRANT CREATE ON DATABASE vela_activity TO vela_activity_owner");
      apply("base.sql"); apply("github-codebases.sql");
      const account = psql(database, "SELECT activity_api.ensure_account('user_Github1','Ada','ada@example.test')->>'id'");
      const other = psql(database, "SELECT activity_api.ensure_account('user_Github2','Grace','grace@example.test')->>'id'");
      const created = JSON.stringify({ action: "created", installation_id: 100, sender_id: 42, account_id: 42,
        account_node_id: "U_42", account_login: "ada", account_type: "User", repository_selection: "selected",
        permissions: { contents: "read", metadata: "read" } }).replaceAll("'", "''");
      const delivery = "00000000-0000-0000-0000-000000000001";
      const webhook = (payloadRoot: string) => psql(database, `SELECT activity_api.record_github_webhook('${delivery}','installation','${payloadRoot}','${created}'::jsonb)::text`);
      expect(JSON.parse(webhook(root("a"))).duplicate).toBe(false);
      expect(JSON.parse(webhook(root("a"))).duplicate).toBe(true);
      expect(() => webhook(root("b"))).toThrow(/reused with different bytes/iu);
      psql(database, `SELECT activity_api.claim_github_installation('${account}'::uuid,'42',42,100)`);
      expect(() => psql(database, `SELECT activity_api.claim_github_installation('${other}'::uuid,'42',42,100)`)).toThrow(/not attributable/iu);
      const repositories = JSON.stringify([{ id: 200, node_id: "R_200", full_name: "ada/private-science", visibility: "private", default_branch: "main" }]).replaceAll("'", "''");
      psql(database, `SELECT activity_api.sync_github_repositories('${account}'::uuid,100,'${repositories}'::jsonb)`);
      const codebase = JSON.stringify({ installation_id: 100, import_method: "github_app", provider: "github", repository_id: 200,
        repository_node_id: "R_200", full_name: "ada/private-science", canonical_locator: "https://github.com/ada/private-science.git",
        visibility: "private", default_branch: "main", source_commit: "c".repeat(40), source_tree: "d".repeat(40),
        installation_permissions_root: root("e"), inspection_status: "natively_verified", inspection_root: root("f"),
        inspection: { authority_effect: "none" }, receipt_root: root("1"), authority_effect: "none" }).replaceAll("'", "''");
      psql(database, `SELECT activity_api.save_connected_codebase('${account}'::uuid,'${codebase}'::jsonb)`);
      expect(psql(database, "SELECT count(*) FROM activity.connected_codebases")).toBe("1");
      const deleted = JSON.stringify({ action: "deleted", installation_id: 100 }).replaceAll("'", "''");
      psql(database, `SELECT activity_api.record_github_webhook('00000000-0000-0000-0000-000000000002','installation','${root("2")}','${deleted}'::jsonb)`);
      expect(psql(database, "SELECT count(*) FROM activity.connected_codebases")).toBe("0");
    } finally {
      command(join(pgBin, "pg_ctl"), ["--pgdata", data, "--wait", "stop"]);
    }
  }, 60_000);
});
