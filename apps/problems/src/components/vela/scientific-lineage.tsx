import Link from "next/link";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { currentReview } from "@/components/vela/problem-provenance";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

const stageTone = {
  source: "border-muted-foreground/25 bg-muted/35",
  contribution: "border-status-evidence/35 bg-status-evidence/5",
  checks: "border-status-caution/35 bg-status-caution/5",
  decision: "border-status-progress/35 bg-status-progress/5",
};

function FlowArrow() {
  return <span aria-hidden className="grid h-6 place-items-center text-muted-foreground sm:h-auto sm:w-6 sm:rotate-0">
    <span className="sm:hidden">↓</span><span className="hidden sm:inline">→</span>
  </span>;
}

export function ScientificLineage({ state }: { state: State }) {
  const review = currentReview(state);
  const claim = state.claims.find((candidate) => candidate.id === state.currentClaimId) ?? state.claims[0] ?? null;
  const checks = review?.verification_records ?? [];
  const outcomes = [...new Set(checks.map((record) => record.outcome.replaceAll("_", " ")))].join(", ");
  const decisionRetained = Boolean(review && review.decision_provenance !== "pending");

  return <section aria-labelledby="scientific-lineage-heading">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-eyebrow uppercase text-muted-foreground">How the current record is supported</p>
        <h2 id="scientific-lineage-heading" className="mt-1 text-title">Scientific lineage</h2>
      </div>
      <p className="max-w-md text-meta text-muted-foreground">A check observes a Contribution. Only a retained Decision can change its Repository-local standing.</p>
    </div>

    <ol className="mt-5 grid items-stretch sm:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)_1.5rem_minmax(0,1fr)_1.5rem_minmax(0,1fr)]">
      <li className={`rounded-lg border p-4 ${stageTone.source}`}>
        <p className="text-eyebrow uppercase text-muted-foreground">1 · Source question</p>
        <p className="mt-2 text-label font-medium">{state.problem.declared_status || "Status not stated"}</p>
        <p className="mt-1 text-micro text-muted-foreground">Declared by {state.source.source_id}</p>
      </li>
      <FlowArrow />
      <li className={`rounded-lg border p-4 ${stageTone.contribution}`}>
        <p className="text-eyebrow uppercase text-muted-foreground">2 · Contribution</p>
        {claim ? <>
          <p className="mt-2 text-label font-medium">Current Contribution</p>
          <StatusBadge className="mt-2" axis="standing" state={claim.standing}>{claim.standing.replaceAll("_", " ")}</StatusBadge>
        </> : <p className="mt-2 text-compact text-muted-foreground">No Contribution is retained here yet.</p>}
      </li>
      <FlowArrow />
      <li className={`rounded-lg border p-4 ${stageTone.checks}`}>
        <p className="text-eyebrow uppercase text-muted-foreground">3 · Scoped checks</p>
        <p className="mt-2 text-label font-medium">{checks.length ? `${checks.length} retained` : "None retained"}</p>
        <p className="mt-1 text-micro text-muted-foreground">{outcomes ? `Outcomes: ${outcomes}` : "No outcome reported"}</p>
      </li>
      <FlowArrow />
      <li className={`rounded-lg border p-4 ${stageTone.decision}`}>
        <p className="text-eyebrow uppercase text-muted-foreground">4 · Current local state</p>
        <p className="mt-2 text-label font-medium">{decisionRetained ? "Decision retained" : "No Decision retained"}</p>
        <p className="mt-1 text-micro text-muted-foreground">{claim ? `Contribution is ${claim.standing.replaceAll("_", " ")} here` : "No current Contribution"}</p>
      </li>
    </ol>

    {review ? <p className="mt-3 text-meta"><Link href={`/repositories/${state.repositorySlug}/proposals/${review.proposal_id}`} className="font-medium underline underline-offset-4">Open the exact proposed change, checks, and Decision</Link></p> : null}
  </section>;
}
