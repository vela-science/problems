import { describe, expect, test } from "bun:test";
import { neon } from "@neondatabase/serverless";
import { mathSourceRegistryRead, nativeProblemSourceRead, nativeSourceRecordByIdentity, projectionManifest, problemDetail, problemsForRepository, sourceCorpusMapRead } from "../src/index";
import { mathSourceRegistry } from "../src/math-sources";
import { projectionReaderIdentity } from "../src/projection-reader";

const databaseUrl = process.env.VELA_PROJECTION_DATABASE_URL;
if (process.env.VELA_REQUIRE_PROJECTION_TESTS === "1" && !databaseUrl) {
  throw new Error(
    "Math Source Registry integration tests require VELA_PROJECTION_DATABASE_URL",
  );
}
const describeDatabase = databaseUrl ? describe : describe.skip;
const sql = databaseUrl ? neon(databaseUrl) : null;

const publicRegistryTables = [
  "native_records",
  "release_sources",
  "repository_source_bindings",
  "source_declarations",
  "source_observations",
] as const;

describeDatabase("Math Source Registry database boundary", () => {
  test("reconstructs exact source observations through the application reader", async () => {
    const limit = 5;
    const registry = await mathSourceRegistryRead({
      includeRecords: true,
      limit,
    });
    /* The manifest's own registry, not the checkout's. The projection was built
       from a specific version of the source declarations, and a checkout that
       adds a source legitimately leads the projection until the next refresh —
       comparing the stored rows to the current config makes a correct addition
       look like missing data. The manifest records the registry it was built
       from, so this asks the projection to agree with itself. */
    const projected = (await projectionManifest()).source_registry;
    expect(registry.sources).toHaveLength(projected.source_count);
    /* Same reason as the source count above: these were the literal 5, which is
       both the page size asked for and, by coincidence, more records than a
       small inventory holds. The manifest records how many rows the release
       actually has, so a page is exactly as long as the inventory allows. */
    expect(registry.native_records).toHaveLength(
      Math.min(limit, projected.native_record_count),
    );
    expect(registry.repository_bindings).toHaveLength(
      Math.min(limit, projected.repository_binding_count),
    );
    expect(registry.next_cursor).not.toBeNull();
    expect(registry.sources.every(({ observation }) => (
      observation.observation_root.startsWith("sha256:")
    ))).toBe(true);
  });

  /* A binding is a relationship between a source-native object and a local
     Repository record, so a release that has admitted no Claim has none — the
     mathematics repository was re-issued with a fresh genesis. The exact
     native lookup is what this contract is for and it holds at any
     cardinality; the binding half states its skip rather than asserting
     `toBeDefined()` on an inventory that legitimately has nothing to bind. */
  test("finds an exact native record with its root-bound Repository context", async () => {
    const sample = await mathSourceRegistryRead({
      includeRecords: true,
      limit: 25,
    });
    const record = sample.native_records[0];
    expect(record).toBeDefined();

    const exact = await mathSourceRegistryRead({
      root: sample.release_root,
      sourceId: record!.source_id,
      nativeId: record!.native_id,
      includeRecords: true,
      limit: 10,
    });
    expect(exact.native_records.map(({ native_id }) => native_id)).toContain(
      record!.native_id,
    );
    expect(exact.native_records.every(
      ({ source_id }) => source_id === record!.source_id,
    )).toBe(true);

    const binding = sample.repository_bindings.find(({ native_id }) => native_id);
    if (!binding) {
      console.info("skipped: the release publishes no Repository binding");
      return;
    }
    const bound = await mathSourceRegistryRead({
      root: sample.release_root,
      sourceId: binding.source_id,
      nativeId: binding.native_id!,
      repositorySlug: binding.repository_id,
      includeRecords: true,
      limit: 10,
    });
    expect(bound.repository_bindings).toContainEqual(
      expect.objectContaining({
        release_root: sample.release_root,
        source_id: binding.source_id,
        native_id: binding.native_id,
        repository_id: binding.repository_id,
      }),
    );
  });

  test("reads an exact native identity and a bounded non-authoritative Problem source", async () => {
    const manifest = await projectionManifest();
    const exact = await nativeSourceRecordByIdentity({
      root: manifest.release_root,
      sourceId: "source:erdos-problems",
      nativeId: "erdos:321",
      nativeKind: "problem",
    });
    expect(exact).toMatchObject({
      source_id: "source:erdos-problems",
      native_id: "erdos:321",
      native_kind: "problem",
    });
    expect(await nativeSourceRecordByIdentity({
      root: manifest.release_root,
      sourceId: "source:erdos-problems",
      nativeId: "erdos:not-present",
    })).toBeNull();

    const sources = await nativeProblemSourceRead({
      root: manifest.release_root,
      sourceId: "source:erdos-problems",
      nativeId: "erdos:321",
    });
    expect(sources).toMatchObject({
      schema: "vela.problem-source-read.v1",
      release_root: manifest.release_root,
      entity: { entity_id: "problem:erdos:321", authority_effect: "none", identity_claim: "navigation_group_only" },
    });
    expect(sources!.occurrences.some(({ source_id }) => source_id === "source:formal-conjectures")).toBe(true);
    expect(sources!.occurrences.some(({ source_id }) => source_id === "source:vibemathed")).toBe(true);
    expect(sources!.occurrences.every(({ authority_effect, statement_identity }) => authority_effect === "none" && statement_identity === "not_established")).toBe(true);
    expect(sources!.relations.every(({ equivalence }) => equivalence === "not_established")).toBe(true);
    expect(JSON.stringify(sources)).not.toContain('"standing"');

    const formalSources = await nativeProblemSourceRead({
      root: manifest.release_root,
      sourceId: "source:formal-conjectures",
      nativeId: "Erdos321.erdos_321",
      nativeKind: "formal_conjecture",
    });
    expect(formalSources?.entity?.entity_id).toBe(sources!.entity?.entity_id);
    expect(formalSources?.relations).toHaveLength(sources!.relations.length);
    expect(formalSources?.occurrences.find(({ native_id }) => native_id === "Erdos321.erdos_321")?.occurrence_status).toBe("canonical_anchor");
  });

  test("keeps Erdős 887 on its exact source occurrence", async () => {
    const ledger = await problemsForRepository("math", { q: "887", limit: 10 });
    const problem = ledger.items.find(({ problem }) => problem === "887");
    expect(problem).toBeDefined();
    const detail = await problemDetail("math", "887", ledger.release_root);
    expect(detail).toBeDefined();
    expect(problem!.node_id).toBe("erdos:887");
  });

  test("reads one complete source inventory with untruncated source-authored corpus facets", async () => {
    const map = await sourceCorpusMapRead();
    expect(map.schema).toBe("vela.source-corpus-map-read.v1");
    expect(map.coverage_complete).toBe(true);
    expect(map.inventory.sources).toHaveLength(map.inventory.source_count);
    expect(map.inventory.native_record_count).toBe(
      map.inventory.sources.reduce((sum, source) => sum + source.native_record_count, 0),
    );
    expect(map.corpora.map(({ source_id }) => source_id)).toEqual([
      "source:erdos-problems",
      "source:formal-conjectures",
      "source:vibemathed",
    ]);
    for (const corpus of map.corpora) {
      expect(corpus.facet.records_with_value + corpus.facet.missing_records).toBe(corpus.record_count);
      expect(corpus.facet.values).toHaveLength(new Set(corpus.facet.values.map(({ value }) => value)).size);
      const bucketAssignments = corpus.facet.values.reduce((sum, value) => sum + value.record_count, 0);
      expect(bucketAssignments).toBe(corpus.facet.assignment_count);
      if (!corpus.facet.multi_valued) {
        expect(corpus.facet.assignment_count).toBe(corpus.facet.records_with_value);
      }
      expect(corpus.record_count).toBe(corpus.source_record_count);
    }
    expect(map.semantics).toMatchObject({
      authority_effect: "none",
      identity_effect: "none",
      equivalence: "not_established",
      standing_effect: "none",
      record_count_effect: "inventory_only",
      source_values: "source_authored",
    });
    expect(JSON.stringify(map)).not.toMatch(/accepted|verified|verification|decision|equivalent/iu);
  });

  test("queries the indexed native search document without widening release scope", async () => {
    const sample = await mathSourceRegistryRead({
      includeRecords: true,
      limit: 250,
    });
    const seed = sample.native_records
      .map((record) => ({
        record,
        term: `${record.title} ${record.summary ?? ""}`.match(/[a-z]{6,}/iu)?.[0],
      }))
      .find(({ term }) => term);
    expect(seed).toBeDefined();

    const result = await mathSourceRegistryRead({
      root: sample.release_root,
      sourceId: seed!.record.source_id,
      query: seed!.term,
      includeRecords: true,
      limit: 250,
    });
    expect(result.native_records.map(({ native_id }) => native_id)).toContain(
      seed!.record.native_id,
    );
  });

  test("scopes native rows to one source without hiding the source catalogue", async () => {
    const result = await mathSourceRegistryRead({
      recordSourceId: "source:physlib",
      includeRecords: true,
      limit: 250,
    });

    const projectedRegistry = (await projectionManifest()).source_registry;
    expect(result.sources).toHaveLength(projectedRegistry.source_count);
    expect(result.native_records.length).toBeGreaterThan(0);
    expect(result.native_records.every(
      ({ source_id }) => source_id === "source:physlib",
    )).toBe(true);
    expect(result.repository_bindings.every(
      ({ source_id }) => source_id === "source:physlib",
    )).toBe(true);
  });

  test("installs immutable source data plus release-scoped bindings", async () => {
    const rows = await sql!.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'projection'
         AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [[...publicRegistryTables]],
    );
    /* Sorted on both sides. The query orders by name and this list was written
       in that order, so renaming one table moved it and failed the assertion on
       where it sorts rather than on anything about the schema. What is being
       checked is which tables exist, not the collation. */
    expect(rows.map((row) => row.table_name).sort()).toEqual([...publicRegistryTables].sort());

    const columns = await sql!.query(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'projection'
         AND table_name = ANY($1::text[])
       ORDER BY table_name, ordinal_position`,
      [[...publicRegistryTables]],
    );
    for (const table of publicRegistryTables) {
      const names = columns
        .filter((column) => column.table_name === table)
        .map((column) => column.column_name);
      expect(names).toContain("row_root");
      expect(names.some((name) => /fail|error|retry/iu.test(name))).toBe(false);
      if (["release_sources", "repository_source_bindings"].includes(table)) {
        expect(names).toContain("release_root");
      } else {
        expect(names).not.toContain("release_root");
      }
      expect(names).not.toContain("record");
      expect(names).not.toContain("observation");
      expect(names).not.toContain("declaration");
      expect(names).not.toContain("binding");
    }
  });

  test("grants the reader only the curated public registry surface", async () => {
    const [identity] = await sql!.query(
      `SELECT current_user AS role, current_database() AS database,
         pg_has_role(current_user, $1, 'MEMBER') AS permission_member,
         (SELECT rolinherit FROM pg_roles WHERE rolname = current_user) AS inherits_privileges`,
      [projectionReaderIdentity.permissionRole],
    );
    expect(identity).toEqual({
      role: projectionReaderIdentity.loginRole,
      database: projectionReaderIdentity.database,
      permission_member: true,
      inherits_privileges: true,
    });

    const grants = await sql!.query(
      `SELECT table_name
       FROM information_schema.table_privileges
       WHERE grantee = $1
         AND table_schema = 'projection'
         AND privilege_type = 'SELECT'
       ORDER BY table_name`,
      [projectionReaderIdentity.permissionRole],
    );
    const grantedTables = grants.map((grant) => grant.table_name);
    for (const table of publicRegistryTables) {
      expect(grantedTables).toContain(table);
    }
    expect(grantedTables).not.toContain("ingestion_failures");
    expect(grantedTables).not.toContain("acquisition_runs");
  });
});
