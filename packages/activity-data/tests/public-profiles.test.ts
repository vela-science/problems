import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const sql = readFileSync(resolve(import.meta.dir, "../schema/public-profiles.sql"), "utf8");
const activitySource = readFileSync(resolve(import.meta.dir, "../src/activity.ts"), "utf8");

describe("public profile storage boundary", () => {
  test("is private by default and never exposes account identity through public reads", () => {
    expect(sql).toContain("visibility text NOT NULL DEFAULT 'private'");
    expect(sql).toContain("to_jsonb(profile) - 'account_id'");
    expect(sql).toContain("profile.status='active'");
    expect(sql).toContain("REVOKE ALL ON activity.public_profiles");
  });

  test("retires account presentation without rewriting attribution or releasing handles", () => {
    expect(sql).toContain("ON DELETE SET NULL");
    expect(sql).toContain("activity_account_profile_tombstone");
    expect(sql).toContain("status='deleted'");
    expect(sql).toContain("DELETE FROM activity.public_profile_performers");
    expect(sql).not.toContain("DELETE FROM activity.public_profile_handles");
  });

  test("keeps exact performer links outside the public account form", () => {
    expect(sql).toContain("verification_kind IN ('signed_record', 'connected_github', 'connected_orcid', 'source_owner')");
    expect(sql).toContain("profile.visibility='public'");
    expect(sql).not.toMatch(/get_profile_for_performer[\s\S]*profile\.visibility IN \('public', 'unlisted'\)/u);
    expect(sql).not.toMatch(/save_public_profile[\s\S]*INSERT INTO activity\.public_profile_performers/u);
  });

  test("binds text parameters explicitly for PostgreSQL function resolution", () => {
    expect(activitySource).toContain("get_public_profile($1::text, $2::uuid)");
    expect(activitySource).toContain("get_profile_for_performer($1::text)");
  });
});
