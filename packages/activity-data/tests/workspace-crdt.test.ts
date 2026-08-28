import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { withActivityPostgres } from "./activity-postgres";

const packageRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(packageRoot, path), "utf8");
const root = (digit: string) => `sha256:${digit.repeat(64).slice(0, 64)}`;

describe("Workspace CRDT activity schema", () => {
  test("keeps collaborative bytes append-only, rooted, bounded, and outside scientific authority", () => {
    const migration = read("schema/workspace-crdt.sql");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS activity.workspace_crdt_updates");
    expect(migration).toContain("UNIQUE (workspace_id, anchor_root, document_name, update_root)");
    expect(migration).toContain("authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none')");
    expect(migration).toContain("octet_length(update_bytes) BETWEEN 1 AND 262144");
    expect(migration).toContain("public.digest(v_update_bytes, 'sha256')");
    expect(migration).toContain("PERFORM activity.require_membership(p_account_id, p_workspace_id)");
    expect(migration).toContain("v_anchor_root := activity.ensure_anchor(p_workspace_id, p_anchor)");
    expect(migration).not.toMatch(/\b(?:Decision|Verification|Standing)\b/u);
  });

  test("applies from the clean schema and enforces roots, tenancy, idempotency, and audit", async () => {
    await withActivityPostgres("workspace-crdt", ({ psql }) => {
      const accountA = psql("SELECT activity_api.ensure_account('user_A1','Alice','alice@example.test')->>'id'");
      const accountB = psql("SELECT activity_api.ensure_account('user_B2','Bob','bob@example.test')->>'id'");
      const workspace = psql(`SELECT activity_api.create_workspace(
        '${accountA}'::uuid, 'crdt-test', 'CRDT test', 'workspace-key-a', '${root("a")}'
      )->>'id'`);
      const anchor = JSON.stringify({
        root: root("1"), projection_release_root: root("2"), repository_id: "math",
        repository_root: root("3"), source_commit: "4".repeat(40), source_tree: "5".repeat(40),
        problem_id: "321", problem_record_root: root("6"), source_observation_root: null,
        claim_id: null, claim_root: null, claim_standing: null,
      }).replaceAll("'", "''");
      const updateRoot = "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
      const append = (account: string, key: string, requestRoot: string, update = updateRoot) => psql(`
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
      expect(() => psql(`SELECT activity_api.list_workspace_crdt_updates(
        '${accountB}'::uuid, '${workspace}'::uuid, 'math', '321'
      )`)).toThrow(/membership required/iu);

      const listed = JSON.parse(psql(`SELECT activity_api.list_workspace_crdt_updates(
        '${accountA}'::uuid, '${workspace}'::uuid, 'math', '321'
      )::text`));
      expect(listed).toHaveLength(1);
      expect(listed[0].id).toBe(created.id);
      expect(JSON.parse(psql(`SELECT activity_api.list_workspace_crdt_updates(
        '${accountA}'::uuid, '${workspace}'::uuid, 'math', 'not-321'
      )::text`))).toEqual([]);
      expect(psql(`SELECT count(*) FROM activity.activity_audit_entries
        WHERE operation='crdt_update.append' AND subject_id='${created.id}'`)).toBe("1");
      expect(() => psql(`UPDATE activity.workspace_crdt_updates SET authority_effect='standing'
        WHERE id='${created.id}'::uuid`)).toThrow(/workspace_crdt_updates_authority_effect_check/iu);
    });
  }, 60_000);
});
