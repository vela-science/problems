import { describe, expect, test } from "bun:test";
import { neon } from "@neondatabase/serverless";
import { canonicalJson, sha256 } from "../src/canonical";
import { claimRecordById, projectionManifest } from "../src/index";

const databaseUrl = process.env.VELA_PROJECTION_DATABASE_URL;
if (process.env.VELA_REQUIRE_PROJECTION_TESTS === "1" && !databaseUrl) {
  throw new Error(
    "Canonical record integrity tests require VELA_PROJECTION_DATABASE_URL",
  );
}
const describeDatabase = databaseUrl ? describe : describe.skip;
const sql = databaseUrl ? neon(databaseUrl) : null;

/* Claims are canonical payload objects, so their root remains directly
   recomputable here. Submission and Verification roots address their signed
   DSSE envelopes; Core authenticates those envelopes and exports the payload.
   Web deliberately does not retain or reinterpret a second envelope reader.
   Their exact root remains bound to the canonical source path instead. */
const emptyRelease = (table: string) =>
  `the release retains no ${table}; nothing to address`;

describeDatabase("Core-authenticated records retain exact source bindings", () => {
  test("every retained Claim payload canonicalises to its root", async () => {
    const { release_root } = await projectionManifest();
    const rows = await sql!.query(
      "SELECT claim_root AS root, record FROM projection.claims WHERE release_root = $1",
      [release_root],
    ) as { root: string; record: unknown }[];
    const mismatched = rows
      .filter((row) => sha256(canonicalJson(row.record)) !== row.root)
      .map((row) => row.root);
    expect(mismatched).toEqual([]);
  });

  for (const family of [
    { table: "submissions", root: "submission_root" },
    { table: "verifications", root: "verification_root" },
  ] as const) {
    test(`every retained ${family.table} row keeps its Core object path`, async () => {
      const { release_root } = await projectionManifest();
      const rows = await sql!.query(
        `SELECT ${family.root} AS root, source_path FROM projection.${family.table} WHERE release_root = $1`,
        [release_root],
      ) as { root: string; source_path: string }[];
      expect(rows.every(({ root, source_path }) => (
        source_path === `records/${family.table}/sha256/${root.replace("sha256:", "")}.json`
      ))).toBe(true);
    });
  }

  /* The filename under `records/` is the same digest, which is what makes the
     GitHub permalink the Problems now renders resolve to exactly the bytes
     it showed. Asserted on the read path the Claim page actually uses. */
  test("a Claim's source path names the same digest its root does", async () => {
    const { release_root } = await projectionManifest();
    const rows = await sql!.query(
      `SELECT repository_id, claim_id FROM projection.claims
       WHERE release_root = $1 ORDER BY claim_id LIMIT 1`,
      [release_root],
    ) as { repository_id: string; claim_id: string }[];

    if (rows.length === 0) {
      console.info(`skipped: ${emptyRelease("claims")}`);
      return;
    }
    const claim = await claimRecordById(rows[0].repository_id, rows[0].claim_id);
    expect(claim?.source_path).toBe(
      `records/claims/sha256/${claim!.root!.replace("sha256:", "")}.json`,
    );
    expect(sha256(canonicalJson(claim!.record))).toBe(claim!.root);
  });
});
