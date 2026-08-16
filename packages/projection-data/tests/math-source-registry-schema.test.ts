import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRepositorySourceBinding } from "../src/math-sources";
import { projectionReaderIdentity } from "../src/projection-reader";

const schemaPath = resolve(
  import.meta.dirname,
  "../schema.sql",
);
const schema = readFileSync(schemaPath, "utf8");

const tableNames = [
  "source_declarations",
  "source_observations",
  "native_records",
  "release_sources",
  "repository_source_bindings",
] as const;

function tableDefinition(name: (typeof tableNames)[number]) {
  const start = schema.indexOf(
    `CREATE TABLE IF NOT EXISTS projection.${name} (`,
  );
  if (start < 0) throw new Error(`missing ${name} definition`);
  const next = schema.indexOf("\nCREATE TABLE", start + 1);
  const indexes = schema.indexOf("\nCREATE INDEX", start + 1);
  const endCandidates = [next, indexes].filter((offset) => offset >= 0);
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : schema.length;
  return schema.slice(start, end);
}

describe("current Math Source Registry schema contract", () => {
  test("separates immutable observations from release bindings", () => {
    const created = Array.from(
      schema.matchAll(/CREATE TABLE IF NOT EXISTS projection\.([a-z_]+)/gu),
      (match) => match[1],
    ).filter((name) => tableNames.includes(name as (typeof tableNames)[number]));
    expect(created).toEqual([...tableNames]);

    for (const name of [
      "source_declarations",
      "source_observations",
      "native_records",
    ] as const) {
      expect(tableDefinition(name)).not.toContain("release_root text");
    }
    for (const name of ["release_sources", "repository_source_bindings"] as const) {
      expect(tableDefinition(name)).toContain("release_root text NOT NULL");
    }

    expect(tableDefinition("source_declarations")).toContain(
      "declaration_root text PRIMARY KEY",
    );
    expect(tableDefinition("source_observations")).toContain(
      "observation_root text PRIMARY KEY",
    );
    expect(tableDefinition("native_records")).toContain(
      "PRIMARY KEY (observation_root, native_id)",
    );
  });

  test("stores normalized fields without duplicate public record documents", () => {
    for (const name of tableNames) {
      const definition = tableDefinition(name);
      expect(definition).not.toMatch(
        /^\s{2}(declaration|observation|record|binding) jsonb/imu,
      );
      expect(definition).not.toMatch(
        /^\s{2}(last_failed|failed_at|failure_message|failure_record|retry_count)\s/imu,
      );
    }
    expect(schema).not.toMatch(
      /CREATE TABLE IF NOT EXISTS projection\.[a-z_]*(failure|error|retry)[a-z_]*/iu,
    );
  });

  test("preserves source sovereignty and standing containment", () => {
    const declarations = tableDefinition("source_declarations");
    expect(declarations).toContain("rights jsonb NOT NULL");
    expect(declarations).toContain("snapshot_policy jsonb NOT NULL");
    expect(declarations).toContain("adapter jsonb NOT NULL");
    expect(declarations).toContain("coverage jsonb NOT NULL");

    const observations = tableDefinition("source_observations");
    expect(observations).toContain("native_revision jsonb NOT NULL");
    for (const state of [
      "reference_only",
      "content_root_only",
      "retained_exact_bytes",
      "existing_repository_bytes",
    ]) {
      expect(observations).toContain(`'${state}'`);
    }

    const nativeRecords = tableDefinition("native_records");
    expect(nativeRecords).toContain("'available'");
    expect(nativeRecords).toContain("'reference_only'");

    const bindings = tableDefinition("repository_source_bindings");
    expect(bindings).toContain(
      "binding_kind IN ('reference', 'snapshot', 'admission')",
    );
    expect(bindings).toContain("'pending'");
    expect(bindings).not.toContain("'pending_review'");
    expect(bindings).toContain(
      "CHECK (binding_kind = 'admission' OR local_standing_effect = 'none')",
    );
    expect(bindings).toContain(
      "REFERENCES projection.release_sources",
    );
    expect(bindings).toContain(
      "REFERENCES projection.source_observations",
    );
    expect(bindings).not.toContain("REFERENCES projection.native_records");
    expect(bindings).toContain(
      "CHECK (native_record_root IS NULL OR native_id IS NOT NULL)",
    );
  });

  /* Every CHECK on the bindings table has to be a rule the constructor already
     enforces, because Postgres is the last place to learn it.

     This is not a style preference. `CHECK (binding_kind <> 'snapshot' OR
     native_id IS NOT NULL)` sat in `schema.sql` with no counterpart in
     `repositorySourceBindingSchema` while its two siblings had one each, so a
     snapshot naming no native record parsed cleanly, was minted a valid
     `binding_root`, and failed on INSERT partway through the projection
     transaction. The two rules that were mirrored were mirrored by hand and
     nothing noticed the third was not.

     Counting rather than listing is the point. A fourth CHECK added to the
     table fails here until a case for it is added below, which is the only
     direction that catches the omission that already happened. The cases go
     through `createRepositorySourceBinding` deliberately: it is the door every
     projection row comes through, so a rule it does not enforce is a rule the
     database enforces alone. */
  test("rejects, in the constructor, everything the table's CHECKs reject", () => {
    const body = {
      schema: "vela.repository-source-binding.v1",
      release_root: `sha256:${"a".repeat(64)}`,
      repository_id: "123e4567-e89b-42d3-a456-426614174000",
      binding_id: "binding:erdos:1056",
      source_id: "source:erdos-problems",
      observation_root: `sha256:${"b".repeat(64)}`,
      native_id: "1056",
      native_record_root: `sha256:${"c".repeat(64)}`,
      binding_kind: "reference",
      repository_object_kind: "claim",
      repository_object_id: "vcl_123",
      repository_object_root: `sha256:${"d".repeat(64)}`,
      local_standing_effect: "none",
    } as const;

    // A body that violates nothing has to build, or the cases below prove
    // nothing about which rule rejected them.
    expect(() => createRepositorySourceBinding({ ...body })).not.toThrow();

    const violations = {
      "binding_kind = 'admission' OR local_standing_effect = 'none'": {
        ...body,
        binding_kind: "reference",
        local_standing_effect: "accepted",
      },
      "native_record_root IS NULL OR native_id IS NOT NULL": {
        ...body,
        native_id: null,
      },
      "binding_kind <> 'snapshot' OR native_id IS NOT NULL": {
        ...body,
        binding_kind: "snapshot",
        native_id: null,
        native_record_root: null,
      },
    };

    const bindings = tableDefinition("repository_source_bindings");
    for (const [rule, input] of Object.entries(violations)) {
      /* Each `input` is deliberately invalid — that is what the assertion
         checks — so it cannot satisfy the valid parameter type. */
      expect(() => createRepositorySourceBinding(input as never)).toThrow();
      expect(bindings).toContain(`CHECK (${rule})`);
    }

    /* Table-level CHECKs only — the ones that open their own line. The
       column-level CHECKs on the same table are format and vocabulary, which
       the zod field types already carry; these three are the cross-field
       invariants that a field type cannot state. */
    const declared = [...bindings.matchAll(/^ {2}CHECK \(/gmu)].length;
    expect(declared).toBe(Object.keys(violations).length);
  });

  test("provides exact and cursor-oriented indexes without partitioning", () => {
    expect(schema).toContain(
      "projection_native_records_page_idx",
    );
    expect(schema).toContain(
      "ON projection.native_records (observation_root, native_kind, native_id)",
    );
    expect(schema).toContain(
      "projection_repository_source_bindings_native_idx",
    );
    expect(schema).not.toMatch(/PARTITION BY/iu);
  });

  test("replaces blanket reader access with a curated table grant", () => {
    expect(schema).toContain(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA projection",
    );
    expect(schema).toContain(
      "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA projection",
    );
    expect(schema).not.toContain(
      "GRANT SELECT ON ALL TABLES IN SCHEMA projection",
    );

    for (const name of tableNames) {
      expect(schema).toContain(`projection.${name}`);
    }
  });

  /* The curated grant is a deliberate choice over blanket access, and the cost
     of curating is that the list is a second place to remember. It fell behind
     once: two tables were added, the grant kept naming nineteen, and because
     the block revokes everything before granting, a workflow running
     `db:migrate` from that checkout left the reader unable to SELECT them. The
     schema check caught it, which is the system working — but nothing until now
     could catch the omission before it reached a database.

     Exact set equality, not containment. A grant naming a table the schema no
     longer creates is the same defect pointed the other way. */
  test("grants exactly the tables the schema creates, no more and no fewer", () => {
    const created = new Set(
      [...schema.matchAll(/CREATE TABLE IF NOT EXISTS projection\.([a-z_]+)/gu)].map((match) => match[1]),
    );
    const block = /GRANT SELECT ON TABLE\s*([\s\S]*?)TO vela_projection_reader;/u.exec(schema);
    expect(block).not.toBeNull();
    const granted = new Set(
      [...block![1].matchAll(/projection\.([a-z_]+)/gu)].map((match) => match[1]),
    );

    expect([...created].filter((name) => !granted.has(name))).toEqual([]);
    expect([...granted].filter((name) => !created.has(name))).toEqual([]);
    expect(granted.size).toBe(created.size);
    expect(schema).not.toContain(`TO ${projectionReaderIdentity.loginRole}`);
  });

  test("does not retain empty pre-Claim projection layers", () => {
    expect(schema).not.toContain("projection.findings");
    expect(schema).not.toContain("projection.structural_advice");
  });

});
