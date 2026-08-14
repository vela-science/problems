/*
  Split a SQL file into statements.

  This was `source.split(/;\s*(?:\n|$)/u)`, written twice — in `schema.mjs` and
  in `reconstruct-projection.mjs` — and correct for as long as every statement
  in `schema.sql` was a plain `CREATE`. It is wrong for the first migration that
  needs a conditional, because a `DO $$ ... $$` body is full of semicolons and a
  naive split hands the driver a fragment ending mid-block. Postgres reports
  that as a syntax error at a line the migration author did not write.

  So the scan tracks what a semicolon is inside of: a single-quoted literal
  (where `''` is an escaped quote, not a close), a dollar-quoted block with its
  tag, a line comment, or a block comment. A semicolon anywhere else ends a
  statement.

  Not a SQL parser, and it does not need to be. It needs to know when a
  semicolon is punctuation and when it is text, which is a lexical question.
*/

const DOLLAR_TAG = /\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$/y;

export function sqlStatements(source) {
  const statements = [];
  let start = 0;
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (character === "'") {
      index += 1;
      while (index < source.length) {
        if (source[index] === "'") {
          /* Doubled inside a literal is an escaped quote and stays in it. */
          if (source[index + 1] === "'") index += 2;
          else break;
        } else index += 1;
      }
      index += 1;
      continue;
    }

    if (character === "-" && source[index + 1] === "-") {
      const newline = source.indexOf("\n", index);
      index = newline === -1 ? source.length : newline + 1;
      continue;
    }

    if (character === "/" && source[index + 1] === "*") {
      const close = source.indexOf("*/", index + 2);
      index = close === -1 ? source.length : close + 2;
      continue;
    }

    if (character === "$") {
      DOLLAR_TAG.lastIndex = index;
      const opening = DOLLAR_TAG.exec(source);
      if (opening && opening.index === index) {
        const tag = opening[0];
        const close = source.indexOf(tag, index + tag.length);
        index = close === -1 ? source.length : close + tag.length;
        continue;
      }
    }

    if (character === ";") {
      const statement = source.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }

    index += 1;
  }

  const trailing = source.slice(start).trim();
  if (trailing) statements.push(trailing);
  return statements;
}
