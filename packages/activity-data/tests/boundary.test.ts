import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(packageRoot, path), "utf8");

describe("activity authority and tenant boundary", () => {
  test("runtime database client has one activity-only credential", () => {
    const source = read("src/client.ts");
    expect(source).toContain("VELA_ACTIVITY_DATABASE_URL");
    expect(source).not.toMatch(/PROBLEMS_DATABASE_URL|AUTHORITY|PRIVATE_KEY|SIGNING_KEY/);
  });

  test("proves both directions of the hosted database boundary", () => {
    const verifier = read("scripts/verify-roles.mjs");
    expect(verifier).toContain("projection_reader_activity_connect");
    expect(verifier).toContain("projectionReaderIdentity.loginRole");
  });

  test("stores rooted artifact metadata, not large bytes or canonical decisions", () => {
    const sql = read("schema/base.sql");
    expect(sql).toContain("Content roots and bounded metadata only");
    expect(sql).not.toMatch(/artifact_(?:bytes|blob)|bytea/iu);
    expect(sql).not.toMatch(/'Decision'|'Event'|'Standing'|decision\.create|standing\.write/);
    expect(sql).toContain("activity audit entries are append-only");
  });

  test("keys anchors per workspace and enforces same-anchor activity", () => {
    const sql = read("schema/base.sql");
    expect(sql).toContain("PRIMARY KEY (workspace_id, anchor_root)");
    expect(sql.match(/REFERENCES activity\.scientific_anchors\(workspace_id, anchor_root\)/g)?.length)
      .toBeGreaterThanOrEqual(7);
    expect(sql).toContain("activity.require_anchor_targets");
    expect(sql).toContain("Attempt does not belong to the requested Approach");
    expect(sql).toContain("ON CONFLICT (workspace_id, anchor_root) DO NOTHING");
  });

  test("keeps bootstrap, database creation, and the clean schema as distinct phases", () => {
    expect(read("roles.sql")).not.toMatch(/^\s*CREATE DATABASE/m);
    expect(read("README.md")).toContain("standalone autocommit statement");
    expect(read("database-privileges.sql")).toContain("current_database() <> 'vela_activity'");
    expect(read("database-privileges.sql")).toContain("REVOKE CONNECT, TEMP ON DATABASE vela_activity FROM PUBLIC");
    expect(read("database-privileges.sql")).toContain("vela_projection_reader;");
    expect(read("database-privileges.sql")).not.toContain("vela_projection_reader_20260812");
    const sql = read("schema/base.sql");
    expect(read("README.md")).toContain("clean pre-release baseline");
    expect(sql).toContain("GRANT USAGE ON SCHEMA activity_api TO vela_activity_app");
    expect(sql).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA activity FROM PUBLIC, vela_activity_app");
  });

  test("keeps Attempts scientific and omits generic session provenance", () => {
    const source = read("src/activity.ts");
    expect(source).toContain('title: patch.title ?? null');
    expect(source).not.toMatch(/externalSessionId|session locator/iu);
  });

  test("reads current following without hiding historical anchored work", () => {
    const migration = read("schema/current-anchor-read.sql");
    const source = read("src/activity.ts");
    expect(migration).toContain("'followedAnchorRoots'");
    expect(migration).not.toContain("'following'");
    expect(migration).toContain("jsonb_agg(f.anchor_root ORDER BY f.anchor_root)");
    expect(migration).toContain("FROM activity.approaches x JOIN anchors a");
    expect(migration).not.toContain("DROP FUNCTION");
    expect(source).toContain("query.currentAnchorRoot");
    expect(source).toContain("parseProblemActivity(rows[0]?.result, query.currentAnchorRoot)");
    expect(source).toContain("get_problem_activity($1::uuid, $2::uuid, $3, $4)");
    expect(source).toContain("list_workspace_crdt_updates($1::uuid, $2::uuid, $3, $4)");
  });
});
