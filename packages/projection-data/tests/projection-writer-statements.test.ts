import { expect, test } from "bun:test";
import { parse, plannedStatements } from "./writer-statements";

/*
  The database-free half of the writer/schema contract. The v0.440.0 release
  halted at post-activation product qualification because the statement count
  lived only in the database-gated suite, which self-skips in every gate that
  has no projection URL. These assertions need no database, so they run in
  every plain `bun test` and a stale count now fails before merge instead of
  mid-release.
*/

test("the writer plans the exact fixed-statement set", async () => {
  const planned = await plannedStatements();

  /* The twelve tables written with a fixed statement, plus `releases`. The
     five registry tables are chunked, so a rowless candidate plans none of
     them — and four of those five write through
     `jsonb_populate_recordset(NULL::projection.<table>, …)`, which matches by
     column name and cannot transpose at all. `native_records` is the fifth and
     already names its columns.

     Thirteen: retired derived work tables remain removed, the exact
     Repository revision table has its own fixed statement, and
     `frontier_edges` joined as the twelfth fixed statement.

     An equality because the number is the point: a statement that silently
     stops being checked is the failure this test exists to catch, one step
     removed. */
  expect(planned.length).toBe(13);

  const statements = planned.map((text) => ({ text, parsed: parse(text) }));
  expect(statements.filter((entry) => entry.parsed === null).map((entry) => entry.text)).toEqual([]);

  for (const { parsed } of statements) {
    const { table, named, fromRecordset } = parsed!;
    if (fromRecordset.length > 0) {
      /* The statement agreeing with itself: whatever `AS x(…)` reads out of
         the JSON is exactly what the column list puts away, after
         `release_root` from the bound parameter. Column existence and table
         coverage stay in the integration suite with the live catalogue. */
      expect(named, `projection.${table} column list`).toEqual(["release_root", ...fromRecordset]);
    }
  }
});
