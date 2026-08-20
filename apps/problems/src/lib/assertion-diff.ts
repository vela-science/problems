/* What a correction actually changed.
 *
 * A Result assertion runs to ninety words or more, and a correction usually
 * revises one clause of it — the Erdős 94 chain adds a sentence saying the
 * identity does not establish the conjecture. Rendering both versions in full
 * and letting the reader diff them by eye buries the one thing the correction
 * says. Vela holds both Claim roots, so the changed span is computable.
 *
 * Word-level rather than character-level: a character diff of prose produces
 * fragments inside words, which read as corruption rather than as an edit. */

export type AssertionSpan = { kind: "same" | "removed" | "added"; text: string };

/* Words alone, with runs of whitespace normalised away.
 *
 * Carrying each word's trailing whitespace made the last word of a sentence
 * differ from the same word mid-sentence — appending a clause reported the
 * word before it as removed and re-added. Assertions are prose, so collapsing
 * whitespace costs nothing and makes the diff stable. */
function tokenize(text: string): string[] {
  return text.trim().split(/\s+/u).filter(Boolean);
}

/* Spans join with single spaces, so a reconstructed side equals the original
   with its whitespace normalised. */
export function normalize(text: string): string {
  return tokenize(text).join(" ");
}

export function assertionDiff(before: string, after: string): AssertionSpan[] {
  if (before === after) return [];
  const left = tokenize(before);
  const right = tokenize(after);

  /* Longest common subsequence over tokens. Assertions are hundreds of tokens
     at most, so the quadratic table is cheap and exact; an approximate diff
     would risk reporting a change that did not happen. */
  const lengths: number[][] = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      lengths[i]![j] = left[i] === right[j]
        ? lengths[i + 1]![j + 1]! + 1
        : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
    }
  }

  const spans: AssertionSpan[] = [];
  const push = (kind: AssertionSpan["kind"], word: string) => {
    const last = spans.at(-1);
    if (last?.kind === kind) last.text += ` ${word}`;
    else spans.push({ kind, text: word });
  };

  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      push("same", left[i]!);
      i += 1;
      j += 1;
    } else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) {
      push("removed", left[i]!);
      i += 1;
    } else {
      push("added", right[j]!);
      j += 1;
    }
  }
  while (i < left.length) { push("removed", left[i]!); i += 1; }
  while (j < right.length) { push("added", right[j]!); j += 1; }
  return spans;
}

/* Unchanged runs are elided to a few words either side of an edit, so the
   reader sees the change in its sentence rather than in the whole assertion.
   A run short enough to keep whole is kept whole: eliding four words to show
   an ellipsis saves nothing and costs the reader the sentence. */
export function elideUnchanged(spans: AssertionSpan[], context = 8): Array<AssertionSpan | { kind: "elided"; words: number }> {
  const out: Array<AssertionSpan | { kind: "elided"; words: number }> = [];
  spans.forEach((span, index) => {
    if (span.kind !== "same") { out.push(span); return; }
    const words = tokenize(span.text);
    const first = index === 0;
    const last = index === spans.length - 1;
    const keep = context * (first || last ? 1 : 2);
    if (words.length <= keep + 2) { out.push(span); return; }
    const head = first ? [] : words.slice(0, context);
    const tail = last ? [] : words.slice(-context);
    if (head.length) out.push({ kind: "same", text: head.join(" ") });
    out.push({ kind: "elided", words: words.length - head.length - tail.length });
    if (tail.length) out.push({ kind: "same", text: tail.join(" ") });
  });
  return out;
}
