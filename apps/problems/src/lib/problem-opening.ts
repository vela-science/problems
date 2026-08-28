import { problemReachStops } from "@/lib/problem-reach";
import { problemSourceResolution } from "@/lib/problem-reading";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

export type ProblemOpening = {
  /** The reach stage this record has not reached. */
  stage: string;
  /** What the record lacks, as a fact about this record. */
  missing: string;
  /** What acquiring that stage takes, and where it happens. */
  step: string;
  action: { label: string; href: string } | null;
};

/* The first stage this record has not reached, and what reaching it takes.
 *
 * 1,215 of the 1,217 Problems in this release hold identity and a locator and
 * nothing else, so the screen a reader is most likely to open is the one with
 * the least on it. The reach track made that emptiness legible; it did not make
 * it actionable. A reader who wants to help had no way to learn what "help"
 * would even consist of here.
 *
 * This is a description of one record, not a recommendation across records.
 * The distinction is the whole reason it is allowed to exist: PRODUCT.md scores
 * Vela absent on discovery and allocation deliberately, so nothing here may
 * rank Problems, score tractability, or say this question is worth anyone's
 * time. It reads the reach axis the page already draws, takes the first stage
 * the record has not got to, and says what that stage is. Two Problems missing
 * the same stage get the same words; no Problem is ever compared to another.
 *
 * The last step is deliberately one this product cannot perform. A Decision is
 * a Repository act, and a page that offered a button for it would be lying
 * about where authority lives. */
export function problemOpening(state: State, route: string): ProblemOpening | null {
  const stops = problemReachStops(state);
  const next = stops.find((stop) => !stop.reached);
  if (!next) return null;
  const formal = state.sources?.occurrences?.filter((occurrence) => occurrence.formal) ?? [];
  const locator = state.locator ?? null;

  if (next.label === "Statement") {
    return {
      stage: "Statement",
      missing: "No source retained here has filed the text of this question.",
      step: "The wording is the source's to file.",
      action: locator ? { label: "Open the source record", href: locator } : null,
    };
  }

  if (next.label === "Formal") {
    return {
      stage: "Formal declaration",
      missing: "No formal declaration is associated with this question.",
      step: "A formal statement is the first thing a check can run against.",
      action: { label: "Read what the sources hold", href: `${route}/sources` },
    };
  }

  if (next.label === "Resolution") {
    return {
      stage: "Resolution",
      missing: "No source retained here records an outcome for this question.",
      step: "Its collection still marks it open.",
      action: locator ? { label: "Open the source record", href: locator } : null,
    };
  }

  if (next.label === "Work") {
    const count = formal.length;
    const resolution = problemSourceResolution(state);
    /* The generic sentence is wrong here in the way that matters most: on a
       Problem whose collection records a disproof, "no check is recorded"
       without naming the finding reads as though there were nothing to check. */
    return {
      stage: "Work",
      /* The headline three inches above already names the source and its
         finding. This says only what is absent. */
      missing: resolution
        ? "Nothing here has checked that finding."
        : `${count} formal ${count === 1 ? "declaration is" : "declarations are"} retained, and no check is recorded against any of them.`,
      step: resolution
        ? "Reproducing it here turns a report into evidence."
        : "A check reports its own scope, and produces evidence a Repository can decide on.",
      action: { label: "Open the work surface", href: `${route}/work` },
    };
  }

  return {
    stage: "Decision",
    missing: "Checks are recorded, and no Repository has decided on this question here.",
    step: "A signed Repository act. This site holds no key that could make one.",
    action: { label: "Open the Repository", href: `/repositories/${state.repositorySlug}` },
  };
}
