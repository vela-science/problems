import type { ScientificProblemState } from "@/lib/scientific-state";
import { ProblemOverview } from "@/components/vela/problem-overview";

type State = NonNullable<ScientificProblemState>;
export type ProblemReferenceView = "overview" | "work" | "results" | "sources" | "history";

function humanize(value: string | null | undefined, fallback = "Not recorded") {
  return value?.replaceAll("_", " ") || fallback;
}

export function exactResultHeadline(assertion: string) {
  const match = assertion.match(/\bestablishes\s+([^,]+),\s+which/u);
  const proved = assertion.match(/\bproves that\s+(.+?),\s+matching\b/u);
  const headline = match?.[1] ?? proved?.[1];
  if (!headline) return null;
  return `${headline.charAt(0).toUpperCase()}${headline.slice(1)}`;
}

export function exactResultLimitation(assertion: string) {
  return assertion
    .split(/(?<=[.!?])\s+/u)
    .find((sentence) => /does not establish|not a proof/u.test(sentence)) ?? null;
}

export function compactResultLimitation(assertion: string) {
  const sentence = exactResultLimitation(assertion);
  if (!sentence) return null;
  const candidate = sentence.match(/\b((?:supplies|this is) a candidate answer)[^,]*,\s+(not a proof[^.]*\.)/iu);
  if (candidate) return `${candidate[1].charAt(0).toUpperCase()}${candidate[1].slice(1)}, ${candidate[2]}`;
  const scoped = sentence.match(/\b(this (?:identity|result|contribution) does not establish[^.]*\.)/iu);
  if (scoped) return `${scoped[1].charAt(0).toUpperCase()}${scoped[1].slice(1)}`;
  return sentence;
}

export function summarizeFormalTargets(occurrences: Array<{ formal?: { category_label?: string | null } | null }>) {
  const counts = new Map<string, number>();
  for (const occurrence of occurrences) {
    const label = occurrence.formal?.category_label?.trim().toLowerCase();
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  if (!counts.size) return "Not classified";
  const ordered = [...counts].sort(([left], [right]) => {
    if (left === "open") return -1;
    if (right === "open") return 1;
    return left.localeCompare(right);
  });
  return ordered.map(([label, count]) => `${count} ${humanize(label)}`).join(" · ");
}

export function summarizeCheckOutcomes(checks: Array<{ outcome: string }>) {
  if (!checks.length) return "Not checked";
  const labels: Record<string, string> = { pass: "passed", fail: "failed", error: "error", inconclusive: "inconclusive" };
  const priority = ["fail", "error", "inconclusive", "pass"];
  const counts = new Map<string, number>();
  for (const check of checks) counts.set(check.outcome, (counts.get(check.outcome) ?? 0) + 1);
  return [...counts]
    .sort(([left], [right]) => {
      const leftIndex = priority.indexOf(left);
      const rightIndex = priority.indexOf(right);
      return (leftIndex < 0 ? priority.length : leftIndex) - (rightIndex < 0 ? priority.length : rightIndex);
    })
    .map(([outcome, count]) => `${count} ${labels[outcome] ?? humanize(outcome)}`)
    .join(" · ");
}

export function dominantCheckOutcome(checks: Array<{ outcome: string }>) {
  if (checks.some(({ outcome }) => outcome === "fail")) return "fail";
  if (checks.some(({ outcome }) => outcome === "error")) return "error";
  if (checks.some(({ outcome }) => outcome !== "pass")) return "inconclusive";
  return checks.length ? "pass" : null;
}

/* Overview delegates to one composition for every Problem.
 *
 * There used to be two: a Problem-94-only pilot, and a generic page for the
 * other 1,216. The pilot carried the answer-first structure this product
 * needs and a page of hardcoded Problem-94 sentences with it, so nothing it
 * proved could reach any other Problem. The structure is now derived —
 * `problemReading` from the Claim's own declared scope, the scope figure from
 * the limitation the Claim states about itself — and the hardcoded copy is
 * gone with the pilot. */
export function ProblemOverviewReference({ state, route }: { state: State; route: string }) {
  return <ProblemOverview state={state} route={route} />;
}
