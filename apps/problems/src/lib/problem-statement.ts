import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;
type Occurrence = State["sources"]["occurrences"][number];

/* How close the retained text is to being *this* Problem's question.
 *
 * Vela never establishes statement identity — every occurrence carries
 * `statement_identity: "not_established"` — so a retained statement is always
 * reported as what a named source says, never as what the Problem asserts.
 * The three tiers below are the strength of the association Vela did record,
 * and they are the difference between quoting a curated collection and
 * quoting a library entry that merely shares a problem number. */
export type StatementBasis = "curated" | "reviewed" | "candidate";

export type ProblemStatement = {
  text: string;
  /** The retained prose reads as language; a formal statement reads as code. */
  form: "prose" | "formal";
  sourceId: string;
  sourceLabel: string;
  basis: StatementBasis;
  locatorUrl: string | null;
  /** Present when the statement came from a formal declaration. */
  occurrence: Occurrence | null;
};

const BASIS_BY_STATUS: Record<Occurrence["occurrence_status"], StatementBasis> = {
  canonical_anchor: "curated",
  reviewed_reference: "reviewed",
  candidate_number_link: "candidate",
};

export const STATEMENT_BASIS_NOTE: Record<StatementBasis, string> = {
  curated: "retained from the collection that poses this Problem",
  reviewed: "a reviewed association with this Problem",
  candidate: "associated by problem number only, not reviewed here",
};

/* Prefer the fullest thing a source actually wrote. A curated prose statement
 * outranks a library docstring, and a docstring outranks the Lean text, which
 * says the same thing in a language most readers cannot skim. */
const TIER: Record<StatementBasis, number> = { curated: 0, reviewed: 1, candidate: 2 };

/* A formal library files the problem and its variants in one module:
 * `Erdos1.erdos_1` states the question, `Erdos1.erdos_1.variants.real_valued`
 * restates it for the reals, and `…variants.parts.i` narrows it further. Their
 * docstrings are all real prose, and the variant's is often the longer one —
 * ranking by length picked "A generalisation of the problem to sets A ⊆ (0,N]
 * is proposed in [Er73]" as the statement of Erdős 1. Depth in the declaration
 * path is what separates the question from a note about it. */
function declarationDepth(occurrence: Occurrence): number {
  return (occurrence.formal ? occurrence.native_id : "").split(".").length;
}

function docstringOf(occurrence: Occurrence): string | null {
  const text = occurrence.formal?.docstring?.trim();
  return text && text.length > 0 ? text : null;
}

export function resolveProblemStatement(state: State): ProblemStatement | null {
  const occurrences = state.sources?.occurrences ?? [];
  const labelFor = (sourceId: string) =>
    occurrences.find((entry) => entry.source_id === sourceId)?.source_label ?? sourceId;

  /* A catalogue that retained real prose is the best answer available. */
  if (state.problem.statement_kind === "prose" && state.problem.statement?.trim()) {
    return {
      text: decodeHtmlEntities(state.problem.statement.trim()),
      form: "prose",
      sourceId: state.problem.source_id,
      sourceLabel: labelFor(state.problem.source_id),
      basis: "curated",
      locatorUrl: state.locator,
      occurrence: null,
    };
  }

  const documented = occurrences
    .filter((occurrence) => docstringOf(occurrence) !== null)
    .sort((left, right) => {
      const tier = TIER[BASIS_BY_STATUS[left.occurrence_status]] - TIER[BASIS_BY_STATUS[right.occurrence_status]];
      if (tier !== 0) return tier;
      const depth = declarationDepth(left) - declarationDepth(right);
      if (depth !== 0) return depth;
      return (docstringOf(right)?.length ?? 0) - (docstringOf(left)?.length ?? 0);
    });

  const best = documented[0];
  if (best) {
    return {
      text: decodeHtmlEntities(docstringOf(best) as string),
      form: "prose",
      sourceId: best.source_id,
      sourceLabel: best.source_label,
      basis: BASIS_BY_STATUS[best.occurrence_status],
      locatorUrl: best.locators.find(({ url }) => url)?.url ?? null,
      occurrence: best,
    };
  }

  /* No one wrote it out. The Lean is then the only statement there is, and
     saying so is more use than repeating the catalogue's number back. */
  const formal = occurrences.find((occurrence) => occurrence.formal && occurrence.summary?.trim());
  if (formal) {
    return {
      text: (formal.summary as string).trim(),
      form: "formal",
      sourceId: formal.source_id,
      sourceLabel: formal.source_label,
      basis: BASIS_BY_STATUS[formal.occurrence_status],
      locatorUrl: formal.locators.find(({ url }) => url)?.url ?? null,
      occurrence: formal,
    };
  }
  return null;
}

/** The collection's own name for the Problem, always available. */
export function problemLabel(state: State): string {
  return decodeHtmlEntities(state.problem.label || state.source.title);
}

/** Formal declarations grouped the way the library files them. */
export function formalCoverage(state: State) {
  const declarations = (state.sources?.occurrences ?? []).filter((occurrence) => occurrence.formal);
  const modules = new Set(declarations.map((occurrence) => occurrence.formal?.module).filter(Boolean));
  const proved = declarations.filter((occurrence) => occurrence.formal?.proof_present === true);
  const sorryFree = proved.filter((occurrence) => occurrence.formal?.proof_sorry_free === true);
  return { declarations: declarations.length, files: modules.size, proved: proved.length, sorryFree: sorryFree.length };
}

/* A docstring often states the question and then adds the collection's own
 * commentary — a reference, a partial result, an attribution. Splitting them
 * lets the question be the heading and the commentary read as commentary. */
export function paragraphsOf(text: string): string[] {
  return text
    .trim()
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.replaceAll("\n", " ").trim())
    .filter(Boolean);
}

export function statementParagraphs(statement: ProblemStatement | null): { question: string; context: string[] } {
  if (!statement || statement.form !== "prose") return { question: "", context: [] };
  const paragraphs = paragraphsOf(statement.text);
  return { question: paragraphs[0] ?? "", context: paragraphs.slice(1) };
}

/* A plain-text reading of a question, for the one place that needs a string
 * rather than typeset notation: a row link's accessible name.
 *
 * Stripping the `$` delimiters alone was not enough. It left the macros inside
 * them, so a screen reader announced Erdős 94 as "Suppose n points in backslash
 * mathbb brace R brace caret 2" — the notation became syntax noise in exactly
 * the string a reader navigates a list by.
 *
 * The corpus uses 178 distinct macros, so this is deliberately not a LaTeX
 * parser. It maps the ones that actually carry meaning in a spoken label to a
 * single character, unwraps the font and structural commands, and drops the
 * remaining markup skeleton. `\log`, `\max` and their kind need no entry: with
 * the backslash gone the command word is already the word you would say. */
const SPOKEN: Record<string, string> = {
  leq: "≤", le: "≤", geq: "≥", ge: "≥", ll: "≪", gg: "≫", neq: "≠", equiv: "≡", approx: "≈",
  in: "∈", notin: "∉", subseteq: "⊆", subset: "⊂", supseteq: "⊇", cup: "∪", cap: "∩",
  sum: "∑", prod: "∏", sqrt: "√", infty: "∞", to: "→", mapsto: "↦", cdot: "·", times: "×",
  ldots: "…", cdots: "…", dots: "…", pm: "±", mid: "∣", aleph: "ℵ", emptyset: "∅",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ",
  eta: "η", theta: "θ", lambda: "λ", mu: "μ", nu: "ν", pi: "π", rho: "ρ", sigma: "σ",
  tau: "τ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω", Omega: "Ω", Delta: "Δ",
  Sigma: "Σ", Gamma: "Γ", Lambda: "Λ", Phi: "Φ", Psi: "Ψ", Theta: "Θ",
};

/* Commands whose argument is the content and whose name is only presentation. */
const UNWRAP = /\\(?:mathbb|mathrm|mathcal|mathbf|mathit|mathsf|text|textrm|textit|textbf|operatorname|bm|boldsymbol)\s*\{([^{}]*)\}/gu;

export function statementPlainText(text: string): string {
  /* Only unwrap `$…$` when the delimiters pair. They do not always: 48
     statements carry an unescaped currency sign, and against an odd count the
     pattern marries `$50` to the opening `$` of the next real formula, so the
     spoken label loses the prize amount altogether. Same gate as
     `scientific-text`'s `delimitersPair`, for the same reason. */
  const dollars = (text.replaceAll("\\$", "").match(/\$/gu) ?? []).length;
  let out = dollars % 2 === 0
    ? text
        .replaceAll(/\$\$([\s\S]+?)\$\$/gu, " $1 ")
        .replaceAll(/(?<!\\)\$([^$\n]+?)\$/gu, " $1 ")
    : text;
  out = out.replaceAll(/\\cite\{([^}]+)\}/gu, " [$1] ");

  /* Markdown emphasis and inline code carry no sound. The retained docstrings
     are Markdown as well as TeX, so a spoken name announced "asterisk asterisk
     Erdős Problem 17 period asterisk asterisk" — 16 emphasis runs and 63 code
     spans reached the accessible names on the first page of the collection
     alone. The delimiters go; the words they wrap stay.
     The backtick is guarded the same way `scientific-text` guards it: a
     backslash-backtick is the LaTeX grave accent, handled further down. */
  out = out
    .replaceAll(/\*\*([^*\n]+)\*\*/gu, "$1")
    .replaceAll(/(?<!\\)`([^`\n]+)`/gu, "$1");

  /* A LaTeX line break and an escaped space are whitespace, not commands. */
  out = out.replaceAll(/\\\\|\\ /gu, ' ');
  /* `\frac{a}{b}` is said as "a over b", and the slash is how it is written.
     The brace-less spelling `\frac 1 n` is in the corpus too. */
  out = out
    .replaceAll(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/gu, '$1/$2')
    .replaceAll(/\\d?frac\s+(\S)\s+(\S)/gu, '$1/$2');
  /* Nested font commands unwrap innermost-first, so repeat until stable. */
  for (let pass = 0; pass < 3 && UNWRAP.test(out); pass += 1) out = out.replace(UNWRAP, "$1");
  out = out
    .replaceAll(/\\(?:left|right|big{1,2}|Big{1,2}|displaystyle|limits|nolimits)\b/gu, "")
    .replaceAll(/\\[lr]vert|\\[lr]floor|\\[lr]ceil/gu, "")
    /* An escaped delimiter is a literal character, not a command. Without this
       the command pattern below skips it and the backslash survives into the
       spoken name — `\{u_1,\ldots\}` announced a stray backslash either side. */
    .replaceAll(/\\([{}|%&_$#])/gu, "$1")
    /* Text-mode accents: `Erd\H{o}s`, `Sárk\"ozi`. A spoken label wants the
       letter, not the diacritic command, and this is not the place to carry a
       second copy of `scientific-text`'s accent table — that module pulls in
       KaTeX, which this server lib must not drag into every consumer. Only the
       unambiguous spellings: punctuation accents, and letter accents braced.
       `\u` bare would otherwise eat the `u` of `\upsilon`. */
    .replaceAll(/\\(['"`^~=.])\s*\{?(\w)\}?/gu, "$2")
    .replaceAll(/\\([HvuckrbdtL])\{(\w)\}/gu, "$2")
    .replaceAll(/\\([a-zA-Z]+)/gu, (whole, command: string) => SPOKEN[command] ?? ` ${command} `)
    /* A `$` that survived is either money or a delimiter whose partner the
       source never wrote. Money is digits that end there — `$50 for` — and a
       leftover delimiter opens notation, so `$2^n` and `$1/4` do not match.
       Keeping the first and dropping the second is the difference between
       "offered 50" and a label that says "dollar A dollar" four times. */
    .replaceAll(/\$(?!\d[\d,]*(?:\s|$|[.,;)]))/gu, "")
    /* The markup skeleton: grouping braces, sub/superscript markers, and the
       spacing primitives. What they carried is already in the text. */
    .replaceAll(/[{}]|\\[,;!:]|(?<=[^\s])[_^](?=[^\s])/gu, " ")
    .replaceAll(/[_^]/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();
  return out;
}
