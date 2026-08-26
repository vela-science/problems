/* Split a schema file into statements, respecting dollar-quoted bodies.
 *
 * PGlite's `exec` runs a whole file in one implicit transaction, and the
 * activity schema does not survive that — it fails partway with a permission
 * error that has nothing to do with the statement it names. Fed one statement
 * at a time, the same file loads completely.
 *
 * The naive version of this splits on every semicolon and breaks immediately:
 * these schemas define plpgsql functions whose bodies are full of them. The
 * usual second attempt tracks `$$` and breaks on the tagged form, `$function$`,
 * which this schema also uses. So the tag is read as whatever `$…$` opened the
 * block, and only the identical closing tag ends it. */
export function sqlStatements(sql) {
  const statements = [];
  let buffer = "";
  let tag = null;
  let index = 0;

  while (index < sql.length) {
    if (tag === null) {
      const opening = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/u.exec(sql.slice(index));
      if (opening) {
        tag = opening[0];
        buffer += tag;
        index += tag.length;
        continue;
      }
      if (sql.startsWith("--", index)) {
        const end = sql.indexOf("\n", index);
        const line = end === -1 ? sql.slice(index) : sql.slice(index, end + 1);
        buffer += line;
        index += line.length;
        continue;
      }
      /* Block comments are copied through whole. These schemas explain
         themselves at length between statements, and those comments contain
         both semicolons and apostrophes. */
      if (sql.startsWith("/*", index)) {
        const end = sql.indexOf("*/", index + 2);
        const comment = end === -1 ? sql.slice(index) : sql.slice(index, end + 2);
        buffer += comment;
        index += comment.length;
        continue;
      }
      /* A quoted literal or identifier can hold a semicolon too. */
      if (sql[index] === "'" || sql[index] === '"') {
        const quote = sql[index];
        let cursor = index + 1;
        while (cursor < sql.length) {
          if (sql[cursor] === quote) {
            if (sql[cursor + 1] === quote) { cursor += 2; continue; }
            cursor += 1;
            break;
          }
          cursor += 1;
        }
        buffer += sql.slice(index, cursor);
        index = cursor;
        continue;
      }
      if (sql[index] === ";") {
        buffer += ";";
        if (buffer.trim()) statements.push(buffer.trim());
        buffer = "";
        index += 1;
        continue;
      }
    } else if (sql.startsWith(tag, index)) {
      buffer += tag;
      index += tag.length;
      tag = null;
      continue;
    }
    buffer += sql[index];
    index += 1;
  }

  if (tag !== null) throw new Error(`unterminated dollar-quoted block opened with ${tag}`);
  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}
