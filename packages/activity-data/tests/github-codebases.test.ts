import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { withActivityPostgres } from "./activity-postgres";

const packageRoot = resolve(import.meta.dirname, "..");
const root = (digit: string) => `sha256:${digit.repeat(64)}`;

describe("GitHub connection custody", () => {
  test("stores roots and lifecycle metadata but no token or source bytes", () => {
    const sql = readFileSync(resolve(packageRoot, "schema/github-codebases.sql"), "utf8");
    expect(sql).not.toMatch(/access_token|refresh_token|private_key|archive_bytes|source_bytes/iu);
    expect(sql).toContain("authority_effect text NOT NULL DEFAULT 'none'");
    expect(sql).toContain("GitHub delivery identifier was reused with different bytes");
  });

  test("binds installation ownership, deduplicates exact delivery bytes, and revokes private access", async () => {
    await withActivityPostgres("github-codebases", ({ psql }) => {
      const account = psql("SELECT activity_api.ensure_account('user_Github1','Ada','ada@example.test')->>'id'");
      const other = psql("SELECT activity_api.ensure_account('user_Github2','Grace','grace@example.test')->>'id'");
      const created = JSON.stringify({ action: "created", installation_id: 100, sender_id: 42, account_id: 42,
        account_node_id: "U_42", account_login: "ada", account_type: "User", repository_selection: "selected",
        permissions: { contents: "read", metadata: "read" } }).replaceAll("'", "''");
      const delivery = "00000000-0000-0000-0000-000000000001";
      const webhook = (payloadRoot: string) => psql(`SELECT activity_api.record_github_webhook('${delivery}','installation','${payloadRoot}','${created}'::jsonb)::text`);
      expect(JSON.parse(webhook(root("a"))).duplicate).toBe(false);
      expect(JSON.parse(webhook(root("a"))).duplicate).toBe(true);
      expect(() => webhook(root("b"))).toThrow(/reused with different bytes/iu);
      psql(`SELECT activity_api.claim_github_installation('${account}'::uuid,'42',42,100)`);
      expect(() => psql(`SELECT activity_api.claim_github_installation('${other}'::uuid,'42',42,100)`)).toThrow(/not attributable/iu);
      const repositories = JSON.stringify([{ id: 200, node_id: "R_200", full_name: "ada/private-science", visibility: "private", default_branch: "main" }]).replaceAll("'", "''");
      psql(`SELECT activity_api.sync_github_repositories('${account}'::uuid,100,'${repositories}'::jsonb)`);
      const codebase = JSON.stringify({ installation_id: 100, import_method: "github_app", provider: "github", repository_id: 200,
        repository_node_id: "R_200", full_name: "ada/private-science", canonical_locator: "https://github.com/ada/private-science.git",
        visibility: "private", default_branch: "main", source_commit: "c".repeat(40), source_tree: "d".repeat(40),
        installation_permissions_root: root("e"), inspection_status: "natively_verified", inspection_root: root("f"),
        inspection: { authority_effect: "none" }, receipt_root: root("1"), authority_effect: "none" }).replaceAll("'", "''");
      psql(`SELECT activity_api.save_connected_codebase('${account}'::uuid,'${codebase}'::jsonb)`);
      expect(psql("SELECT count(*) FROM activity.connected_codebases")).toBe("1");
      const deleted = JSON.stringify({ action: "deleted", installation_id: 100 }).replaceAll("'", "''");
      psql(`SELECT activity_api.record_github_webhook('00000000-0000-0000-0000-000000000002','installation','${root("2")}','${deleted}'::jsonb)`);
      expect(psql("SELECT count(*) FROM activity.connected_codebases")).toBe("0");
    });
  }, 60_000);
});
