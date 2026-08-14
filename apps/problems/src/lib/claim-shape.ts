/**
 * Recovers the bounded shape a Claim assertion already states in words.
 *
 * The Erdős 1056 Proposals each assert one exhaustive scan of one integer
 * interval. The interval, the prime count, the observed maximum multiplicity,
 * its argmax and its residue are all in the sentence; none of them is a column.
 * Reading them back is what lets a figure place the windows on an axis instead
 * of listing thirteen unrelated rows.
 *
 * Four rules hold absolutely, because a mark that decodes to a regex is only
 * honest under them:
 *
 *  1. No arithmetic. Every number returned appears verbatim in the sentence.
 *     Nothing is summed, averaged, or converted into coverage.
 *  2. A partial parse is no parse. If any group is missing the row leaves the
 *     family entirely, rather than being drawn from whatever did match.
 *  3. The source sentence travels with the shape, so the surface can put the
 *     mark and the words it came from in one viewport.
 *  4. Nothing else is parsed. Lean theorem names, Mathlib commits, toolchain
 *     versions and axiom sets are deliberately left alone: those sentences
 *     already read as mathematics, and a regex over commit hashes risks
 *     asserting a pin the record does not make.
 *
 * The producer's wording is not this repository's to control, so
 * `claim-shape.test.ts` pins the real assertions. A rewording upstream fails
 * there rather than quietly emptying a figure in the UI.
 */

export interface SweepWindow {
  /** First and last integer of the inclusive interval, as written. */
  lo: number;
  hi: number;
  primes: number;
  multiplicity: number;
  /** The prime at which the maximum multiplicity was observed. */
  argmax: number;
  residue: number;
  /** The assertion the five values were read out of, verbatim. */
  source: string;
}

export interface CodeParameters {
  n: number;
  k: number;
  d: number;
  source: string;
}

/* Two producers word the same scan differently — "the 13 primes in the
   inclusive range 10429601..10429800" and "over primes in 10430001..10430200
   ... 11 primes tested" — and the second is the rejected duplicate of the
   first, so a pattern that only reads the accepted phrasing would drop the one
   row that shows a window proposed twice. Each group is therefore anchored on
   the word that carries it rather than on sentence order. */
const RANGE = /\b(\d+)\.\.(\d+)\b/u;
const PRIMES = /\b(\d+)\s+primes\b/iu;
const MULTIPLICITY = /\bmaximum multiplicity(?:\s+observed)?(?:\s+was)?\s+(\d+)\b/iu;
const ARGMAX = /\bp\s*=\s*(\d+)\b/u;
const RESIDUE = /\bresidue\s+(\d+)\b/iu;

/* `[[n,k,d]]`, the stabilizer code's own notation, written with the double
   bracket that distinguishes a quantum code from the classical `[n,k,d]` a base
   code carries. Exported because claim-key.ts tests the same notation to lead a
   row with it: two regexes for one notation meant a rewording upstream had to
   be caught twice or the row key and the parsed parameters would disagree about
   which Claims are stabilizer codes. */
export const STABILIZER_NOTATION = /\[\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]\]/u;

export function parseSweepWindow(assertion: string): SweepWindow | null {
  const text = assertion.trim();
  const range = text.match(RANGE);
  const primes = text.match(PRIMES);
  const multiplicity = text.match(MULTIPLICITY);
  const argmax = text.match(ARGMAX);
  const residue = text.match(RESIDUE);
  if (!range || !primes || !multiplicity || !argmax || !residue) return null;
  const lo = Number(range[1]);
  const hi = Number(range[2]);
  /* An interval that does not run forward has no extent to draw. */
  if (!(lo < hi)) return null;
  return {
    lo,
    hi,
    primes: Number(primes[1]),
    multiplicity: Number(multiplicity[1]),
    argmax: Number(argmax[1]),
    residue: Number(residue[1]),
    source: text,
  };
}

export function parseCodeParameters(assertion: string): CodeParameters | null {
  const text = assertion.trim();
  const match = text.match(STABILIZER_NOTATION);
  if (!match) return null;
  return { n: Number(match[1]), k: Number(match[2]), d: Number(match[3]), source: text };
}

export interface SweptProposal extends SweepWindow {
  proposal_id: string;
  status: string;
}

export interface SweepFamily {
  /** Fully parsed rows, ordered by the interval they swept. */
  windows: SweptProposal[];
  /**
   * Rows that state a bounded scan but did not yield every value.
   *
   * Rule 2 discards them, and a figure that renders conditionally has no
   * failing state, so the count is carried out for the surface to say. A
   * producer that rewords one clause turns windows into partials here, which
   * is visible, instead of turning the figure off, which is not.
   */
  partial: number;
}

export function sweepFamily(
  reviews: Array<{ proposal_id: string; status: string; claim: string }>,
): SweepFamily {
  const windows: SweptProposal[] = [];
  let partial = 0;
  for (const review of reviews) {
    const window = parseSweepWindow(review.claim);
    if (window) {
      windows.push({ ...window, proposal_id: review.proposal_id, status: review.status });
      continue;
    }
    /* "Maximum multiplicity" is the phrase this family and nothing else on
       these Repositories uses, so it identifies a row that belongs to the family
       whose shape could not be read. */
    if (MULTIPLICITY.test(review.claim)) partial += 1;
  }
  windows.sort((a, b) => a.lo - b.lo || a.hi - b.hi || a.proposal_id.localeCompare(b.proposal_id));
  return { windows, partial };
}
