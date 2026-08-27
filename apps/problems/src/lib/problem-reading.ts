import { exactResultLimitation } from "@/components/vela/problem-overview-reference";

/* What this release lets a reader conclude about a Problem, and nothing more.
 *
 * The projection carries no Problem-level Standing field. It carries Claims,
 * each with its own declared scope, and a Repository Decision on one of them.
 * Reading a Problem as "solved" from an accepted Claim is exactly the mistake
 * the source contract forbids: on Erdős 94 an accepted Claim proves a narrower
 * sum-multiplicity identity and explicitly does not establish the headline
 * cubic conjecture.
 *
 * So the reading is derived, bounded, and labelled as derived wherever it is
 * shown. Three outcomes, no fourth:
 *
 * - `no-record`   nothing has been accepted here. True of 1,215 of the 1,217
 *                 Erdős Problems in this release.
 * - `open`        a Claim is accepted and its own assertion declares what it
 *                 does not establish, so the headline is not established by it.
 * - `accepted`    a Claim is accepted and declares no such limitation. This is
 *                 deliberately NOT "solved": the absence of a limitation
 *                 sentence is an absence of evidence about scope, not a
 *                 Problem-level verdict, and no Standing exists to promote.
 */
export type ProblemReading = {
  kind: "no-record" | "open" | "accepted";
  /** Sentence-length reading, safe to render as the page's answer line. */
  headline: string;
  /** The declared limitation, when the accepted Claim states one. */
  limitation: string | null;
};

export function problemReading(input: {
  currentAssertion: string | null;
  repositoryName: string;
}): ProblemReading {
  if (!input.currentAssertion) {
    return {
      kind: "no-record",
      headline: "Nothing has been recorded here yet.",
      limitation: null,
    };
  }
  const limitation = exactResultLimitation(input.currentAssertion);
  if (limitation) {
    return {
      kind: "open",
      headline: "Open in the state represented here.",
      limitation,
    };
  }
  return {
    kind: "accepted",
    headline: `A Result is accepted in ${input.repositoryName}.`,
    limitation: null,
  };
}

/* The short word a badge carries. Never "solved", and never a bare "open" that
   could be mistaken for the source's own status field. */
export function readingBadge(reading: ProblemReading): string {
  if (reading.kind === "no-record") return "No record";
  if (reading.kind === "open") return "Open";
  return "Result accepted";
}

/* Why the badge says what it says, for the control that discloses it. The
   caller renders this next to the words "Problems synthesis", so the sentence
   does not repeat that label. */
export function readingBasis(reading: ProblemReading): string {
  if (reading.kind === "no-record") {
    return "No Claim has been accepted against this Problem in this release, and no Repository has decided on it.";
  }
  if (reading.kind === "open") {
    return "Derived from the accepted Claim's own declared scope, which states what it does not establish. Bounded to this release, not an authoritative Standing and not consensus.";
  }
  return "Derived from an accepted Claim that declares no limitation on its scope. That is an absence of a scope statement, not a Problem-level verdict.";
}
