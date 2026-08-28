import katex from "katex";
import styles from "./scientific-text.module.css";

/* `(?<!\\)` on both dollar forms, because `\$` is an escaped dollar sign and not
   the start of mathematics.

   Without it, "Erdős offered \$100 for any improvement of the constant $1/4$
   here." opened math at the escaped dollar and closed it at the real one, so an
   English sentence was typeset as a formula and KaTeX ran the words together:
   `100foranyimprovementoftheconstant`. Prize amounts are common in this corpus,
   so the failure fired on ordinary problem statements. */
const tokenPattern = /((?<!\\)\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|(?<!\\)\$[^$\n]+?\$|\\\([^\n]+?\\\)|\\cite\{[^}]+\})/gu;

/* Text-mode accents, which KaTeX never sees because they are outside the math
   delimiters — so `Erd\H{o}s and Moser` reached the page as those literal
   characters. The o-double-acute is the whole reason: this corpus is Erdős.

   Deliberately a small table rather than a LaTeX text-mode parser. These are the
   commands the retained statements actually use; anything else stays verbatim,
   which is the honest outcome for source text nobody here authored. */
const ACCENTS: Record<string, Record<string, string>> = {
  H: { o: "ő", O: "Ő", u: "ű", U: "Ű" },
  "'": { a: "á", e: "é", i: "í", o: "ó", u: "ú", y: "ý", c: "ć", n: "ń", s: "ś", z: "ź", A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú" },
  '"': { a: "ä", e: "ë", i: "ï", o: "ö", u: "ü", y: "ÿ", A: "Ä", O: "Ö", U: "Ü" },
  "`": { a: "à", e: "è", i: "ì", o: "ò", u: "ù", A: "À", E: "È" },
  "^": { a: "â", e: "ê", i: "î", o: "ô", u: "û", A: "Â", E: "Ê", O: "Ô" },
  "~": { a: "ã", n: "ñ", o: "õ", A: "Ã", N: "Ñ", O: "Õ" },
  v: { c: "č", s: "š", z: "ž", r: "ř", e: "ě", C: "Č", S: "Š", Z: "Ž" },
  c: { c: "ç", s: "ş", C: "Ç", S: "Ş" },
  ".": { z: "ż", e: "ė", Z: "Ż" },
  "=": { a: "ā", e: "ē", i: "ī", o: "ō", u: "ū" },
  u: { a: "ă", e: "ĕ", g: "ğ", G: "Ğ" },
  k: { a: "ą", e: "ę", A: "Ą", E: "Ę" },
};
const STANDALONE: Record<string, string> = { ss: "ß", ae: "æ", AE: "Æ", oe: "œ", OE: "Œ", aa: "å", AA: "Å", o: "ø", O: "Ø", l: "ł", L: "Ł" };

/* `\H{o}`, `\Ho`, `\'e` and `\'{e}` are the same accent in four spellings, and
   the retained statements use more than one of them. */
const accentPattern = /\\([H'"`^~vc.=uk])\s*(?:\{(\w)\}|(\w))/gu;
const standalonePattern = /\\(ss|ae|AE|oe|OE|aa|AA|[oOlL])(?![a-zA-Z])/gu;

export function plainTextSegment(segment: string): string {
  return segment
    .replace(accentPattern, (whole, command: string, braced?: string, bare?: string) =>
      ACCENTS[command]?.[braced ?? bare ?? ""] ?? whole)
    .replace(standalonePattern, (whole, command: string) => STANDALONE[command] ?? whole)
    /* Last, so an unescaped dollar produced here cannot be re-read as a
       delimiter — the split already happened. */
    .replaceAll("\\$", "$");
}

/* Retained source is quoted, not authored here, and some of it is malformed:
   Formal Conjectures states Erdos 3 as "If $A \subset \mathbb{N} has $\sum
   ... = \infty$, then must $A$ contain ..." — five dollar signs, one of them
   missing its partner upstream.

   Splitting on delimiters that do not pair makes the tokenizer open maths at
   the wrong dollar and close it at the next one, so "has" is typeset as a
   product of three variables and the rest of the sentence loses its notation.
   A reader is then looking at a formula the source never wrote. So a failed
   pair does not fall through to the tokenizer; it goes to `recoverNotation`,
   which ignores the delimiters rather than trusting them. */
function delimitersPair(text: string): boolean {
  const dollars = text.replaceAll("\\$", "").match(/\$/gu)?.length ?? 0;
  if (dollars % 2 !== 0) return false;
  const opens = text.match(/\\\[|\\\(/gu)?.length ?? 0;
  const closes = text.match(/\\\]|\\\)/gu)?.length ?? 0;
  return opens === closes;
}

/* Recovery for source whose delimiters do not pair.
 *
 * Verbatim was the old answer, and it kept the mistake honest but left a
 * reader looking at `\sum_{n \in A}\frac 1 n = \infty` as literal prose.
 * This ignores the delimiters entirely — they are known wrong — and instead
 * marks the spans that are unambiguously notation.
 *
 * The rule is deliberately narrow, because the failure to avoid is the one the
 * old code documented: splitting Erdős 3 at the wrong dollar typesets the
 * English word "has" as a product of three variables. A token is notation only
 * if it carries a macro or a sub/superscript. Bare words never qualify. A
 * lone variable or operator joins a run only when it already sits beside
 * notation, so `must A contain` stays prose while `= \infty` does not. */
const NOTATION = /\\[a-zA-Z]+|[_^]/u;
const JOINABLE = /^[A-Za-z0-9]$|^[=+\-<>≤≥≪≫∈∉⊂⊆∪∩·×→↦]+$/u;
const TRAILING = /[.,;:?!)\]]+$/u;

export function recoverNotation(text: string): Array<{ math: boolean; text: string }> {
  const raw = text.replaceAll("\\$", "\u0000").replaceAll("$", "");

  /* Words, not characters — and a brace group is one word however much
     whitespace it contains. `\sum_{n \in A}` split on spaces leaves
     `\sum_{n` and `A}`, and KaTeX rejects both. */
  const words: string[] = [];
  let depth = 0;
  for (const piece of raw.split(/\s+/u).filter(Boolean)) {
    const opens = (piece.match(/\{/gu) ?? []).length;
    const closes = (piece.match(/\}/gu) ?? []).length;
    if (depth > 0) words[words.length - 1] += ` ${piece}`;
    else words.push(piece);
    depth = Math.max(0, depth + opens - closes);
  }

  const notation = words.map((word) => NOTATION.test(word));
  /* Grow each run over neighbours that only make sense beside notation: a lone
     variable, a digit, an operator. Two passes so a run can reach across one
     such token, which `= \infty` and `\frac 1 n` both need. */
  for (let pass = 0; pass < 2; pass += 1) {
    words.forEach((word, index) => {
      if (notation[index] || !JOINABLE.test(word.replace(TRAILING, ""))) return;
      if (notation[index - 1] || notation[index + 1]) notation[index] = true;
    });
  }

  /* `tight` marks punctuation that must stay against the span before it. */
  const spans: Array<{ math: boolean; text: string; tight?: boolean }> = [];
  const push = (math: boolean, value: string, tight?: boolean) => {
    if (!value) return;
    const last = spans.at(-1);
    if (last && last.math === math) last.text += ` ${value}`;
    else spans.push({ math, text: value, tight });
  };
  words.forEach((word, index) => {
    if (!notation[index]) return push(false, word.replaceAll("\u0000", "$"));
    /* Sentence punctuation rides the prose, not the formula. */
    const trailing = TRAILING.exec(word)?.[0] ?? "";
    push(true, trailing ? word.slice(0, -trailing.length) : word);
    if (trailing) push(false, trailing, true);
  });

  /* Whitespace was consumed by the split; give it back to the prose so the
     sentence still reads as a sentence around its formulae. */
  return spans.map((span, index) => {
    if (span.math) return { math: true, text: span.text };
    const lead = index > 0 && !span.tight ? " " : "";
    const tail = index < spans.length - 1 ? " " : "";
    return { math: false, text: `${lead}${span.text}${tail}` };
  });
}

/* Retained source prose is Markdown as well as TeX.
 *
 * The upstream docstrings this quotes carry `**bold**` runs and `` `code` ``
 * spans, and rendering only the mathematics left those delimiters on screen as
 * literal characters: the first page of the Erdős catalogue alone showed 16
 * `**` runs and 84 backtick spans, so a reader met `**Erdős Problem 17.** Are
 * there infinitely many cluster primes` in a product that otherwise typesets
 * its notation.
 *
 * Only the two inline forms that actually occur are handled, and only outside
 * mathematics — the split has already removed every `$…$` segment, so a
 * backtick or an asterisk inside a formula never reaches this.
 *
 * `(?<!\\)` guards the opening backtick, because a backslash-backtick is the
 * LaTeX grave accent in the table above and must stay an accent rather than
 * open a code span. */
const markdownPattern = /(\*\*[^*\n]+\*\*|(?<!\\)`[^`\n]+`)/u;

function ProseSegment({ text }: { text: string }) {
  const pieces = text.split(new RegExp(markdownPattern.source, "gu")).filter(Boolean);
  return <>
    {pieces.map((piece, index) => {
      if (piece.length > 4 && piece.startsWith("**") && piece.endsWith("**")) {
        return <strong key={`${piece}:${index}`}>{plainTextSegment(piece.slice(2, -2))}</strong>;
      }
      if (piece.length > 2 && piece.startsWith("`") && piece.endsWith("`")) {
        return <code key={`${piece}:${index}`} className={styles.code}>{piece.slice(1, -1)}</code>;
      }
      return <span key={`${piece}:${index}`}>{plainTextSegment(piece)}</span>;
    })}
  </>;
}

/* Math that will not parse is shown as its own source, in readable type.
 *
 * `throwOnError: false` hands back KaTeX's error markup instead: the raw TeX in
 * a hardcoded `#cc0000` at the inherited size, which on a dark canvas measured
 * 2.91:1 and is not theme-aware at all. The source is the honest thing to show
 * — a Problem statement whose notation the source mistyped still has to be
 * readable, and this product does not silently repair source text — so it is
 * rendered verbatim in the same marker used for quoted notation, and named as
 * unparsed for a screen reader rather than left as bare red source. */
function renderMath(source: string, display: boolean) {
  try {
    return katex.renderToString(source, {
      displayMode: display,
      output: "mathml",
      throwOnError: true,
      trust: false,
      strict: "ignore",
      maxExpand: 500,
      maxSize: 10,
    });
  } catch {
    return null;
  }
}

export function ScientificText({ text }: { text: string }) {
  if (!delimitersPair(text)) {
    return <span className={styles.root}>
      {recoverNotation(text).map((span, index) => {
        if (!span.math) return <ProseSegment key={index} text={span.text} />;
        const markup = renderMath(span.text, false);
        if (!markup) return <code key={index} className={styles.code}><span className="sr-only">Unparsed notation: </span>{span.text}</code>;
        return <span key={index} className={styles.inline} dangerouslySetInnerHTML={{ __html: markup }} />;
      })}
    </span>;
  }
  const segments = text.split(tokenPattern).filter(Boolean);
  return (
    <span className={styles.root}>
      {segments.map((segment, index) => {
        const citation = /^\\cite\{([^}]+)\}$/u.exec(segment);
        if (citation) return <cite key={`${segment}:${index}`}>[{citation[1]}]</cite>;

        const display = (segment.startsWith("$$") && segment.endsWith("$$"))
          || (segment.startsWith("\\[") && segment.endsWith("\\]"));
        const inline = (segment.startsWith("$") && segment.endsWith("$"))
          || (segment.startsWith("\\(") && segment.endsWith("\\)"));
        if (!display && !inline) return <ProseSegment key={`${segment}:${index}`} text={segment} />;

        const source = display ? segment.slice(2, -2) : segment.startsWith("\\(") ? segment.slice(2, -2) : segment.slice(1, -1);
        const markup = renderMath(source, display);
        if (!markup) return <code key={`${segment}:${index}`} className={styles.code}><span className="sr-only">Unparsed notation: </span>{source}</code>;
        return <span key={`${segment}:${index}`} className={display ? styles.display : styles.inline} tabIndex={display ? 0 : undefined} dangerouslySetInnerHTML={{ __html: markup }} />;
      })}
    </span>
  );
}
