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
 * says the same thing in a language most readers cannot skim. Within one tier
 * the canonical occurrence wins, then a reviewed reference, then a bare number
 * match — and among equals, the longest docstring, which is the one that
 * states the problem rather than a variant of it. */
const TIER: Record<StatementBasis, number> = { curated: 0, reviewed: 1, candidate: 2 };

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
      return tier !== 0 ? tier : (docstringOf(right)?.length ?? 0) - (docstringOf(left)?.length ?? 0);
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
export function statementParagraphs(statement: ProblemStatement | null): { question: string; context: string[] } {
  if (!statement || statement.form !== "prose") return { question: "", context: [] };
  const paragraphs = statement.text
    .trim()
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.replaceAll("\n", " ").trim())
    .filter(Boolean);
  return { question: paragraphs[0] ?? "", context: paragraphs.slice(1) };
}
