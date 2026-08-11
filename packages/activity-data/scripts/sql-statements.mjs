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
      if (opening?.index === index) {
        const close = source.indexOf(opening[0], index + opening[0].length);
        index = close === -1 ? source.length : close + opening[0].length;
        continue;
      }
    }
    if (character === ";") {
      const statement = source.slice(start, index).trim();
      if (statement && !statement.startsWith("\\")) statements.push(statement);
      start = index + 1;
    }
    index += 1;
  }
  const trailing = source.slice(start).trim();
  if (trailing && !trailing.startsWith("\\")) statements.push(trailing);
  return statements;
}
