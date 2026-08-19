import { describe, expect, test } from "bun:test";

const packageRoot = new URL("../", import.meta.url);

describe("current projection schema", () => {
  test("has one unversioned read contract", async () => {
    const schema = await Bun.file(new URL("schema.sql", packageRoot)).text();
    const contract = await Bun.file(new URL("src/projection-contract.ts", packageRoot)).text();
    const reader = await Bun.file(new URL("src/index.ts", packageRoot)).text();
    const builder = await Bun.file(new URL("scripts/projection-builder.mjs", packageRoot)).text();
    expect(schema).not.toContain("schema_version");
    expect(contract).not.toMatch(/problems\.v\d+/u);
    expect(reader).not.toContain("read_model_schema");
    expect(contract).toContain('manifestSchema: "vela.projection-release-manifest"');
    expect(builder).not.toContain("read_model_schema");
  });

  test("starts from one clean baseline", async () => {
    const schema = await Bun.file(new URL("schema.sql", packageRoot)).text();
    const migrations = [...new Bun.Glob("*.sql").scanSync({
      cwd: new URL("migrations/", packageRoot).pathname,
    })].sort();
    const runner = await Bun.file(new URL("scripts/schema.mjs", packageRoot)).text();

    /* The immutable ledger. Every entry must also state its final shape in
       schema.sql, because reconstruction starts from the clean baseline. */
    expect(migrations).toEqual(["0001_frontier_edges.sql"]);
    expect(schema).toContain("CREATE SCHEMA IF NOT EXISTS projection");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS projection.schema_migrations");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS projection.repositories");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS projection.repository_revisions");
    expect(schema).toContain("proposed_state_preview jsonb");
    expect(schema).toContain("decision_authority_principal_id text");
    expect(schema).toContain("review_method_root text");
    expect(schema).toContain("CREATE INDEX IF NOT EXISTS verifications_property_idx");
    expect(schema).toContain("CREATE INDEX IF NOT EXISTS reviews_claim_retirement_idx");
    expect(schema).not.toContain("DROP TABLE");
    expect(schema).not.toContain("DROP COLUMN");
    expect(runner).not.toContain("RETIRED_MIGRATIONS");
    expect(runner).not.toContain("DELETE FROM projection.schema_migrations");
  });
});
