/**
 * Recovers the structured fields a source-derived assertion was flattened from.
 *
 * The Erdős source adapter renders its metadata into a sentence:
 *
 *   declared status 'proved'. Formalized: no. Prize: no. Tags: analysis.
 *
 * which the claim page then shows under a heading reading "Canonical
 * assertion". It is neither canonical nor an assertion — it is four structured
 * values with the structure removed, and the reader cannot filter, compare, or
 * follow any of them.
 *
 * Parsing it back is not inventing data: every value returned here appears
 * verbatim in the text, and anything unrecognised is handed back untouched as
 * `rest` so nothing is silently dropped. When the shape does not match at all,
 * `fields` is empty and the caller renders the prose exactly as before.
 */

export type SourceAssertionField = {
  label: string;
  value: string;
  /** Tags are a set and each value is independently meaningful as a filter. */
  kind: "status" | "flag" | "tag";
  /** False for a recorded negative, so "not formalized" can be shown dimmed. */
  affirmative: boolean;
};

export type ParsedSourceAssertion = {
  fields: SourceAssertionField[];
  rest: string;
};

/* Deliberately not anchored on a preceding period: the fields are separated by
   one, so an anchored pattern has each match consume the delimiter the next one
   needs, and only the first field ever parses. */
const STATUS = /\bdeclared status\s*'([^']+)'\s*\.?/iu;
const BOOLEAN = /\b(Formalized|Prize)\s*:\s*(yes|no)\s*\.?/giu;
const TAGS = /\bTags\s*:\s*([^.]+)\.?/iu;

export type ParseSourceAssertionOptions = {
  /**
   * Keep the mathematics and still recover the fields around it.
   *
   * The default refuses a partial parse, which is right on a record page where
   * the prose is the whole opening. On a ledger row it costs the reader the
   * declared status of 660 Erdős Claims whose assertion carries both the
   * flattened metadata and the problem statement: the row can show four values
   * and the mathematics, or one long sentence, and the guard forces the second.
   */
  keepProse?: boolean;
};

export function parseSourceAssertion(
  assertion: string,
  options: ParseSourceAssertionOptions = {},
): ParsedSourceAssertion {
  const text = assertion.trim();
  const fields: SourceAssertionField[] = [];
  let rest = text;

  const status = text.match(STATUS);
  if (status) {
    fields.push({ label: "status", value: status[1]!.trim(), kind: "status", affirmative: true });
    rest = rest.replace(status[0], " ");
  }

  for (const match of text.matchAll(new RegExp(BOOLEAN.source, BOOLEAN.flags))) {
    const affirmative = match[2]!.toLowerCase() === "yes";
    fields.push({
      label: match[1]!.toLowerCase(),
      value: affirmative ? match[1]!.toLowerCase() : `not ${match[1]!.toLowerCase()}`,
      kind: "flag",
      affirmative,
    });
    rest = rest.replace(match[0], " ");
  }

  const tags = text.match(TAGS);
  if (tags) {
    for (const tag of tags[1]!.split(",").map((entry) => entry.trim()).filter(Boolean)) {
      fields.push({ label: "tag", value: tag, kind: "tag", affirmative: true });
    }
    rest = rest.replace(tags[0], " ");
  }

  /* Only claim a parse when the text was essentially nothing but these fields;
     an assertion that carries real mathematics keeps its prose. */
  const remainder = rest.replace(/\s+/gu, " ").trim();
  if (!fields.length) return { fields: [], rest: text };
  if (remainder.length > 24 && !options.keepProse) return { fields: [], rest: text };
  return { fields, rest: remainder };
}
