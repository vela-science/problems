/* JSON-LD, serialised so it cannot end its own script element.
 *
 * `JSON.stringify` escapes quotes and backslashes but not `<`, and these
 * documents carry source-owned text: a Problem's `name` is the statement as the
 * upstream repository retained it. A retained statement containing `</script>`
 * would close the element and hand the remainder to the HTML parser. Escaping
 * the three characters that can start a markup-significant sequence keeps the
 * JSON byte-identical in meaning — `<` parses back to `<` — while making
 * the string inert inside a script element.
 *
 * The alternative, sanitising the statement, is the one thing this product must
 * not do: it publishes source text exactly. So the encoding changes, not the
 * data. */
const ESCAPES: Record<string, string> = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" };

export function structuredDataScript(document: unknown) {
  return JSON.stringify(document).replace(/[<>&]/gu, (character) => ESCAPES[character]);
}
