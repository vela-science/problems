import { describe, expect, test } from "bun:test";
import { parse, plannedStatements, type Planned } from "../tests/writer-statements";
import { neon } from "../src/neon-client";

/*
  Every column the projection writer names, held to the schema it writes to.

  Ten of these inserts were positional — `INSERT INTO t SELECT $1, x.*` — which
  is correct only while a table's column order in Postgres matches the
  `AS x(…)` list beside it, and nothing checked that. The columns are almost all
  `text`, so a column added anywhere but the end would have shifted every value
  after it one place right and Postgres would have accepted the row: a Claim
  with its `standing` in `assertion`, activated, with a `row_root` that agrees
  because the builder hashed the row before it was transposed.
  `search_documents` already lived through this once, when `search_text` became
  a generated column and left the writable positional order.

  Naming the columns turns that into an error naming the column. But a column
  list is a second copy of the schema, and a second copy drifts, so this holds
  it to the first: the writer's statements are collected without a database,
  their column lists parsed out, and each checked against
  `information_schema.columns`. Nothing is written and nothing is planned — the
  projection role is SELECT-only, which is why this reads the catalogue rather
  than asking the planner.

  The statement count and each statement's internal agreement moved to
  `tests/projection-writer-statements.test.ts`, which needs no database and
  runs in every plain gate. This suite keeps the half only the live catalogue
  can answer.
*/

const url = process.env.VELA_PROJECTION_DATABASE_URL;
if (process.env.VELA_REQUIRE_PROJECTION_TESTS === "1" && !url) {
  throw new Error("projection integration tests require VELA_PROJECTION_DATABASE_URL");
}
const describeProjection = url ? describe : describe.skip;

describeProjection("the projection writer and its schema name the same columns", () => {
  test("every named column exists, and recordset tables cover their table", async () => {
    const planned = await plannedStatements();
    const statements = planned.map((text) => ({ text, parsed: parse(text) }));
    expect(statements.filter((entry) => entry.parsed === null).map((entry) => entry.text)).toEqual([]);

    const rows = await neon(url as string).query(
      `SELECT table_name, column_name, ordinal_position, is_generated
       FROM information_schema.columns
       WHERE table_schema = 'projection' AND table_name = ANY($1::text[])
       ORDER BY table_name, ordinal_position`,
      [statements.map((entry) => (entry.parsed as Planned).table)],
    ) as { table_name: string; column_name: string; ordinal_position: number; is_generated: string }[];

    const live = new Map<string, string[]>();
    for (const row of rows) {
      if (row.is_generated === "ALWAYS") continue;
      live.set(row.table_name, [...(live.get(row.table_name) ?? []), row.column_name]);
    }

    for (const { parsed } of statements) {
      const { table, named, fromRecordset } = parsed as Planned;
      const writable = live.get(table);
      expect(writable, `projection.${table} is not in the schema`).toBeDefined();

      /* Every column the statement names is one the table has. Order is not
         asserted, and asserting it would assert something false:
         `projection.repositories` holds `origin_id`, `origin_root`,
         `repository_root`, `authority_keyset_root` and `authority_policy_root`
         after `row_root`, because they arrived in a later migration and Postgres
         appends. Its insert lists them in the middle. That statement is correct
         — and it is correct *only* because it names its columns, which is the
         whole argument for the other ten doing the same. */
      expect(
        named.filter((column) => !(writable as string[]).includes(column)),
        `projection.${table} names columns the schema does not have`,
      ).toEqual([]);

      if (fromRecordset.length > 0) {
        /* Covering the table. A column added to one of these and not
           written is a NULL nobody chose, so it is worth hearing about. */
        expect(
          (writable as string[]).filter((column) => !named.includes(column)),
          `projection.${table} has columns the writer never fills`,
        ).toEqual([]);
      }
      /* `releases` is the one exception: it is written with VALUES and
         deliberately leaves `created_at` to the database and `activated_at`
         to activation. */
    }
  }, 30_000);
});
