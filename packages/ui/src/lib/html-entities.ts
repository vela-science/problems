/* Retained source text arrives with HTML entities in it, in both registers.

   932 of the Erdős problem statements carry numeric references, which are in
   the record and so are not edited away upstream; they are decoded at the point
   of display. The editorial documentation pipeline meets the same problem from
   the other side: rehype escapes a fenced block before Shiki re-highlights it.

   Each app had written its own decoder and neither was a superset of the other
   — the Problems handled decimal references and five named entities, the
   documentation pipeline handled five hex references and the same named ones —
   so the same source text decoded differently depending on which surface drew
   it. One table, one pass.

   The pass is single, not a chain of `.replace` calls: chained replacement
   decodes its own output, so text that retains the literal characters `&#39;`
   (escaped upstream as `&#x26;#39;`) comes back as an apostrophe rather than as
   what the record actually says. */

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

const ENTITY = /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);/gu;

export function decodeHtmlEntities(value: string): string {
  return value.replace(ENTITY, (match, body: string) => {
    if (body.startsWith("#")) {
      const code = body[1] === "x" || body[1] === "X"
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      /* A reference outside Unicode, or one naming a surrogate half, is left
         verbatim: printing a replacement character would be a claim about the
         record that the record does not make. */
      if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return match;
      if (code >= 0xd800 && code <= 0xdfff) return match;
      return String.fromCodePoint(code);
    }
    /* An unrecognised name is left verbatim for the same reason. */
    return NAMED[body] ?? match;
  });
}
