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

/* The Problems renders a record's canonical bytes beside its root and tells
   a reader the second is the digest of the first. That is the product's central
   claim made checkable on screen for the first time, so it is worth holding to
   the whole retained corpus rather than a fixture: if the projection ever
   stored a record whose jsonb does not canonicalise back to its own address,
   the page would be quietly lying on that record. */
/* Nothing here can run on a record the release does not hold, and the
   mathematics repository was re-issued with a fresh genesis: it retains no
   Claim, so no Submission and no Verification either. A skip is the honest
   result, and it is only safe to state because `verifyCandidate` now refuses a
   release that empties the activated corpus — an empty projection cannot reach
   the reader without someone saying so, which means a skip here reports a
   corpus that is genuinely empty rather than one that vanished. */
const emptyRelease = (table: string) =>
  `the release retains no ${table}; nothing to address`;

describeDatabase("retained records are their own content address", () => {
  const families = [
    { table: "claims", root: "claim_root" },
    { table: "submissions", root: "submission_root" },
    { table: "verifications", root: "verification_root" },
  ] as const;

  for (const family of families) {
    test(`every retained ${family.table} row canonicalises to its root`, async () => {
      const { release_root } = await projectionManifest();
      const rows = await sql!.query(
        `SELECT ${family.root} AS root, record FROM projection.${family.table} WHERE release_root = $1`,
        [release_root],
      ) as { root: string; record: unknown }[];

      if (rows.length === 0) {
        console.info(`skipped: ${emptyRelease(family.table)}`);
        return;
      }
      const mismatched = rows
        .filter((row) => sha256(canonicalJson(row.record)) !== row.root)
        .map((row) => row.root);
      expect(mismatched).toEqual([]);
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
