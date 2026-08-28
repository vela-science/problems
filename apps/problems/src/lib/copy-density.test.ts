import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* Prose belongs on policy pages. Everywhere else it is a fallback. */
const POLICY = ["app/privacy", "app/terms", "app/accessibility", "app/contact"];

function surfaces(directory: string, found: string[] = []): string[] {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) surfaces(path, found);
    else if (name.endsWith(".tsx") && !name.includes(".test.")) found.push(path);
  }
  return found;
}

/* JSX puts `>` and `<` around comparisons too, so a run of code sits between
   them exactly as a text node does. Prose has no semicolons, arrows, braces or
   backslashes in it. */
const CODE = /[;{}\\]|=>|===|\?\?|\|\||&&|\(\)/u;

function passages(source: string): string[] {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "");
  const found: string[] = [];
  for (const [, text] of stripped.matchAll(/>([^<>{}]{40,})</gu)) {
    const passage = text.split(/\s+/u).filter(Boolean).join(" ");
    if (/[a-z]{3}\s+[a-z]{3}/u.test(passage) && !CODE.test(passage)) found.push(passage);
  }
  for (const [, text] of stripped.matchAll(/"([A-Z][^"]{60,})"/gu)) {
    const passage = text.split(/\s+/u).filter(Boolean).join(" ");
    if (/[a-z]{3}\s+[a-z]{3}/u.test(passage) && !CODE.test(passage)) found.push(passage);
  }
  return found;
}

const product = surfaces("src")
  .filter((path) => !POLICY.some((policy) => path.includes(policy)))
  .map((path) => ({ path, passages: passages(readFileSync(path, "utf8")) }));

describe("product copy", () => {
  /* A budget, not a rule about any one sentence.
   *
   * Every element used to state what it was and then what it was not, and the
   * result read as written rather than built. A ceiling is the only guard that
   * catches the pattern coming back one paragraph at a time, because each
   * paragraph looks reasonable on its own. Raise it only with a reason. */
  it("stays under its word budget on product surfaces", () => {
    const words = product.reduce(
      (total, { passages: found }) => total + found.reduce((n, passage) => n + passage.split(" ").length, 0),
      0,
    );
    expect(words).toBeLessThanOrEqual(3300);
  });

  /* No single passage should be a paragraph. Anything this long is explaining
     rather than stating, and belongs in DESIGN.md or nowhere. */
  it("has no passage longer than a sentence", () => {
    const long = product
      .flatMap(({ path, passages: found }) => found.map((passage) => ({ path, passage })))
      .filter(({ passage }) => passage.split(" ").length > 26)
      .map(({ path, passage }) => `${path}: ${passage.slice(0, 70)}…`);
    expect(long).toEqual([]);
  });
});
