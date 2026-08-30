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
export type SourceResolution = {
  /** The source's display name, so the claim is never rendered as Vela's. */
  label: string;
  /** The source's own word for the outcome, verbatim. */
  status: string;
};

/* Anything the source says other than "open" is a resolution it has filed.
 *
 * The word is never mapped into a category of ours. The collection uses
 * fourteen of them — proved, disproved, solved, falsifiable, decidable,
 * independent, not provable, and their Lean-qualified forms — and deciding
 * which of those mean "settled" would be Vela adjudicating a source's
 * vocabulary. Printing the source's own word attributed to the source is both
 * more honest and less work. */
export function sourceResolutionOf(
  declaredStatus: string | null | undefined,
  label: string | null | undefined,
): SourceResolution | null {
  const status = declaredStatus?.trim();
  if (!status || /^open(\s|$|\()/iu.test(status) || /^not[ _]recorded$/iu.test(status)) return null;
  /* The fallback has to compose into "X records this as Y", so it is a noun
     phrase rather than a bare word. A source without a registered label is a
     projection gap, not a reason to drop the attribution. */
  return { label: label?.trim() || "This Problem's source", status };
}

/* What this Problem retains regardless of any Result, so the empty reading can
   name it rather than deny it. */
export function problemRetained(state: {
  sources?: { occurrences?: Array<{ formal?: unknown }> } | null;
}): { formal: number; occurrences: number } {
  const occurrences = state.sources?.occurrences ?? [];
  return { formal: occurrences.filter((occurrence) => occurrence.formal).length, occurrences: occurrences.length };
}

export type ProblemReading = {
  kind: "no-record" | "source-resolved" | "open" | "accepted";
  /** Sentence-length reading, safe to render as the page's answer line. */
  headline: string;
  /** The declared limitation, when the accepted Claim states one. */
  limitation: string | null;
  /** Present only on `source-resolved`. Always rendered with its attribution. */
  sourceResolution: SourceResolution | null;
};

/* What the record does hold, for the one reading that has to deny something.
 *
 * "Nothing has been recorded here yet" was measured against accepted Claims
 * alone, so Erdős 1 opened with it while its own rail counted eight retained
 * formalizations and its Sources tab counted nine occurrences. The sentence
 * meant "no Result is current"; it said "no record", and the Results section
 * one click away already phrased it correctly. */
function retainedPhrase(retained: { formal: number; occurrences: number }): string | null {
  if (retained.formal > 0) {
    return `${retained.formal} formal statement${retained.formal === 1 ? " is" : "s are"}`;
  }
  if (retained.occurrences > 0) {
    return `${retained.occurrences} source record${retained.occurrences === 1 ? " is" : "s are"}`;
  }
  return null;
}

export function problemReading(input: {
  currentAssertion: string | null;
  repositoryName: string;
  /** What the Problem's own source says about it, if anything but open. */
  sourceResolution?: SourceResolution | null;
  /** What the projection retains for this Problem regardless of any Result. */
  retained?: { formal: number; occurrences: number };
}): ProblemReading {
  if (!input.currentAssertion) {
    /* 613 of the 1,217 Erdős Problems in this release carry a resolution their
       own source records — 210 proved, 120 proved in Lean, 69 disproved, 63
       disproved in Lean, and on down. Every one of them opened with "Nothing
       has been recorded here yet", which is false: a Lean disproof and three
       source records are recorded there. The sentence measured the one axis
       that is near-empty by construction, because Vela state means a Repository
       signed a Decision and one Repository has signed eighteen.
     *
       So the source's finding leads, in the source's words and under the
       source's name, and the Vela boundary follows it as the next fact rather
       than as a denial of the first. Attribution is what makes this safe: the
       page says who claims it, and never claims it itself. */
    const resolution = input.sourceResolution ?? null;
    if (resolution) {
      return {
        kind: "source-resolved",
        headline: `${resolution.label} records this as ${resolution.status}.`,
        limitation: null,
        sourceResolution: resolution,
      };
    }
    const retained = retainedPhrase(input.retained ?? { formal: 0, occurrences: 0 });
    return {
      kind: "no-record",
      /* Name the one thing absent and the one thing present. The bare denial
         is kept only for a Problem where it is literally true. */
      headline: retained
        ? `No Result is current here. ${retained}.`
        : "Nothing has been recorded here yet.",
      limitation: null,
      sourceResolution: null,
    };
  }
  const limitation = exactResultLimitation(input.currentAssertion);
  if (limitation) {
    return {
      kind: "open",
      headline: "Open in the state represented here.",
      limitation,
      sourceResolution: input.sourceResolution ?? null,
    };
  }
  return {
    kind: "accepted",
    headline: `A Result is accepted in ${input.repositoryName}.`,
    limitation: null,
    sourceResolution: input.sourceResolution ?? null,
  };
}

/* The short word a badge carries. Never "solved", and never a bare "open" that
   could be mistaken for the source's own status field. */
export function readingBadge(reading: ProblemReading): string {
  /* Named by its actor. A bare "Disproved (Lean)" would read as this site's
     finding, which is the one thing the badge must never say. */
  if (reading.kind === "source-resolved") return `Source: ${reading.sourceResolution?.status ?? "recorded"}`;
  /* "No record" on a Problem carrying nine source occurrences was the badge
     form of the same false denial. It says what is missing instead. */
  if (reading.kind === "no-record") return "No Result";
  if (reading.kind === "open") return "Open";
  return "Result accepted";
}

/* Why the badge says what it says, for the control that discloses it. The
   caller renders this next to the words "Problems synthesis", so the sentence
   does not repeat that label. */
export function readingBasis(reading: ProblemReading): string {
  if (reading.kind === "source-resolved") {
    return `Read from the Problem's own source, which records it as ${reading.sourceResolution?.status}. That is the source's finding, not a Vela Decision: no Claim has been accepted against this Problem in this release, and no Repository has ruled on it.`;
  }
  if (reading.kind === "no-record") {
    return "No Claim has been accepted against this Problem in this release, and no Repository has decided on it.";
  }
  if (reading.kind === "open") {
    return "Derived from the accepted Claim's own declared scope, which states what it does not establish. Bounded to this release, not an authoritative Standing and not consensus.";
  }
  return "Derived from an accepted Claim that declares no limitation on its scope. That is an absence of a scope statement, not a Problem-level verdict.";
}

/* The source's finding for one Problem, with the name to attribute it to.
 *
 * Structurally typed rather than bound to `ScientificProblemState`, so the
 * Overview, the header badge and the transition figure all read the same fact
 * the same way. Three surfaces derived a reading independently; a fourth kind
 * that only one of them knew about would put two different answers about one
 * Problem on one screen. */
export function problemSourceResolution(state: {
  problem: { declared_status: string; source_id: string };
  sources?: { occurrences?: ReadonlyArray<{ source_id: string; source_label: string }> } | null;
}): SourceResolution | null {
  const label = state.sources?.occurrences?.find(
    (occurrence) => occurrence.source_id === state.problem.source_id,
  )?.source_label;
  return sourceResolutionOf(state.problem.declared_status, label);
}
