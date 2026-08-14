import { describe, expect, test } from "bun:test";
import { sqlStatements } from "../scripts/sql-statements.mjs";

/*
  The splitter this replaced was `source.split(/;\s*(?:\n|$)/u)`, and it was
  right for as long as `schema.sql` held nothing but plain `CREATE` statements.
  The first migration needing a conditional broke it: a `DO $$ ... $$` body is
  full of semicolons, so the driver was handed a fragment ending mid-block and
  Postgres reported a syntax error at a line nobody wrote.

  The cases below are the ones a migration actually reaches — everything else a
  real parser would care about is not this function's job.
*/

describe("splitting SQL into statements", () => {
  test("keeps a dollar-quoted block whole", () => {
    const source = `
      TRUNCATE TABLE t;
      DO $$
      BEGIN
        IF to_regclass('a') IS NULL THEN
          RETURN;
        END IF;
        ALTER TABLE a RENAME TO b;
      END
      $$;
      ALTER TABLE b ADD COLUMN c text;
    `;
    const statements = sqlStatements(source);
    expect(statements).toHaveLength(3);
    expect(statements[0]).toBe("TRUNCATE TABLE t");
    expect(statements[1]).toStartWith("DO $$");
    expect(statements[1]).toEndWith("$$");
    expect(statements[1]).toContain("ALTER TABLE a RENAME TO b;");
    expect(statements[2]).toBe("ALTER TABLE b ADD COLUMN c text");
  });

  test("honours a tagged dollar quote", () => {
    const statements = sqlStatements("DO $body$ SELECT 1; SELECT 2; $body$;\nSELECT 3;");
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("SELECT 1; SELECT 2;");
    expect(statements[1]).toBe("SELECT 3");
  });

  test("a semicolon inside a literal is text", () => {
    const statements = sqlStatements("INSERT INTO t VALUES ('a;b');\nSELECT 1;");
    expect(statements).toEqual(["INSERT INTO t VALUES ('a;b')", "SELECT 1"]);
  });

  test("a doubled quote does not close the literal", () => {
    const statements = sqlStatements("SELECT 'it''s; fine';\nSELECT 2;");
    expect(statements).toEqual(["SELECT 'it''s; fine'", "SELECT 2"]);
  });

  test("a semicolon inside a comment is text", () => {
    const statements = sqlStatements("-- one; two\nSELECT 1;\n/* three; four */\nSELECT 2;");
    expect(statements).toHaveLength(2);
    expect(statements[0]).toEndWith("SELECT 1");
    expect(statements[1]).toEndWith("SELECT 2");
  });

  test("a final statement without a trailing semicolon is kept", () => {
    expect(sqlStatements("SELECT 1;\nSELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  test("empty input and bare separators produce nothing", () => {
    expect(sqlStatements("")).toEqual([]);
    expect(sqlStatements(";\n;\n")).toEqual([]);
  });

  /* The clean baseline this has to be correct for, rather than only the cases
     chosen to exercise it. */
  test("splits every statement in the current clean schema", async () => {
    const packageRoot = new URL("../", import.meta.url);
    const schema = await Bun.file(new URL("schema.sql", packageRoot)).text();
    const schemaStatements = sqlStatements(schema);
    /* Every `CREATE TABLE` in the file arrives as exactly one statement, which
       is the property a naive split gets right and is checked here so the
       replacement cannot regress it. */
    const declared = schema.match(/CREATE TABLE IF NOT EXISTS/gu)?.length ?? 0;
    expect(declared).toBeGreaterThan(15);
    expect(schemaStatements.filter((statement) => statement.includes("CREATE TABLE IF NOT EXISTS")))
      .toHaveLength(declared);
    expect(schemaStatements.every((statement) => statement.trim().length > 0)).toBe(true);

    /* Every `DO` opens and closes inside one statement. A split block would
       leave an odd count of `$$` somewhere. */
    for (const part of schemaStatements) {
      const dollars = part.match(/\$\$/gu)?.length ?? 0;
      expect(dollars % 2).toBe(0);
    }
  });
});
