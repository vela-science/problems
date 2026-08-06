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

export function ScientificText({ text }: { text: string }) {
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
        if (!display && !inline) return <span key={`${segment}:${index}`}>{plainTextSegment(segment)}</span>;

        const source = display ? segment.slice(2, -2) : segment.startsWith("\\(") ? segment.slice(2, -2) : segment.slice(1, -1);
        const markup = katex.renderToString(source, {
          displayMode: display,
          output: "mathml",
          throwOnError: false,
          trust: false,
          strict: "ignore",
          maxExpand: 500,
          maxSize: 10,
        });
        return <span key={`${segment}:${index}`} className={display ? styles.display : styles.inline} tabIndex={display ? 0 : undefined} dangerouslySetInnerHTML={{ __html: markup }} />;
      })}
    </span>
  );
}
