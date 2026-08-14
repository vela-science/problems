/**
 * Recovers the identifier a reader of this repository already uses for a Claim.
 *
 * Every repository in the release names its objects in its own domain's notation
 * long before Vela gives them a `vcl_` root: a stabilizer code is `[[7,1,3]]`,
 * an OEIS entry is a bound on `a(24)`, an Erdős problem is `#404`, a formalized
 * conjecture is a Lean declaration. A ledger that leads with the digest hides
 * the one string the reader can recognise across a page of fifty rows.
 *
 * Nothing here is derived. Every value returned is a verbatim substring of the
 * text it was recovered from, so the row's lead can be checked by reading the
 * assertion beside it. When no notation is recognised the caller falls back to
 * the assertion's own promoted lead; a key is never invented to fill the slot.
 */

import { STABILIZER_NOTATION } from "./claim-shape";

export type ClaimKey = {
  /** Verbatim substring of the source text. */
  value: string;
  kind: "stabilizer" | "sequence-bound" | "erdos-problem" | "lean-declaration";
};


/* An OEIS term with its recorded bound, `a(24) >= 7179`. The relation is part
   of the key: `a(24)` alone names the term, not what this Claim establishes
   about it. Both the ASCII and the typeset relations appear in retained text. */
const SEQUENCE_BOUND = /\ba\(\s*\d+\s*\)\s*(?:>=|<=|=|≥|≤|>|<)\s*\d+/u;

/* `#404`, only where Erdős' name puts it in the problem list. Bare `#4578` in
   the same corpus is a pull-request number, and the two must not merge. */
const ERDOS_PROBLEM = /Erd(?:ő|o)s(?:\s+[Pp]roblem)?\s*(#\s*\d+)/u;

/* A dotted Lean declaration. The first segment starts with a letter and every
   later one with a letter or underscore, which already excludes a version
   (`4.27.0`). What it does not exclude on its own is a hostname or a filename,
   both of which sit in these assertions beside the declarations, so a match
   must also carry an underscore or an interior capital — `Erdos12.isGood_example`
   does, `github.io` and `Erdos502.lean` do not. */
const LEAN_BACKTICKED = /`([A-Za-z][\w']*(?:\.[A-Za-z_][\w']*)+)`/u;
const LEAN_PARENTHESISED = /\(([A-Za-z][\w']*(?:\.[A-Za-z_][\w']*)+)\)/u;
const LEAN_BARE = /(?<![\w/@.:-])([A-Za-z][\w']*(?:\.[A-Za-z_][\w']*)+)(?![\w/-])/gu;
const LEAN_SHAPED = /_|[a-z][A-Z]/u;

function leanDeclaration(text: string): string | null {
  for (const pattern of [LEAN_BACKTICKED, LEAN_PARENTHESISED]) {
    const match = text.match(pattern);
    if (match && LEAN_SHAPED.test(match[1]!)) return match[1]!;
  }
  for (const match of text.matchAll(LEAN_BARE)) {
    if (LEAN_SHAPED.test(match[1]!)) return match[1]!;
  }
  return null;
}

/**
 * Reads the key out of a Claim's own retained text.
 *
 * The order is by how tightly the notation binds to the record: the stabilizer
 * triple and the sequence bound are the Claim's whole content, the problem
 * number is the question it answers, and the Lean declaration is the artifact
 * that answers it. A Claim carrying more than one is led by the narrower.
 */
export function claimKey(parts: {
  assertion: string;
  conditions?: string[];
  sourceTitle?: string | null;
}): ClaimKey | null {
  const text = [parts.assertion, ...(parts.conditions ?? []), parts.sourceTitle ?? ""].join("\n");

  const stabilizer = text.match(STABILIZER_NOTATION);
  if (stabilizer) return { value: stabilizer[0]!.replaceAll(/\s+/gu, ""), kind: "stabilizer" };

  const bound = text.match(SEQUENCE_BOUND);
  if (bound) return { value: bound[0]!.replaceAll(/\s+/gu, " "), kind: "sequence-bound" };

  const problem = text.match(ERDOS_PROBLEM);
  if (problem) return { value: problem[1]!.replaceAll(/\s+/gu, ""), kind: "erdos-problem" };

  const declaration = leanDeclaration(text);
  if (declaration) return { value: declaration, kind: "lean-declaration" };

  return null;
}
