import { StatusBadge } from "@vela/ui/vela/status-badge";
import { cn } from "@vela/ui/lib/utils";
import type { ProblemDiscovery, ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;
const humanize = (value: string) => value.replaceAll(/[-_]/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());

export function ProblemFacts({ state, className }: { state: State; className?: string }) {
  const values = [...new Set(state.claims.map((claim) => claim.standing.replaceAll("_", " ")))];
  const localStanding = values.length === 0 ? "Not assessed locally" : values.length === 1 ? `${humanize(values[0]!)} locally` : "Mixed local Standing";
  const standingState = values.length === 1 ? state.claims[0]!.standing : "unassessed";
  return <dl className={cn("grid border-y sm:grid-cols-3 sm:divide-x", className)}>
    <div className="min-w-0 py-4 sm:pr-5">
      <dt className="text-eyebrow uppercase text-muted-foreground">Source status</dt>
      <dd className="mt-2 text-label capitalize">{state.problem.declared_status}</dd>
    </div>
    <div className="min-w-0 border-t py-4 sm:border-t-0 sm:px-5">
      <dt className="text-eyebrow uppercase text-muted-foreground">Local Standing</dt>
      <dd className="mt-2"><StatusBadge state={standingState} axis="standing">{localStanding}</StatusBadge></dd>
    </div>
    <div className="min-w-0 border-t py-4 sm:border-t-0 sm:pl-5">
      <dt className="text-eyebrow uppercase text-muted-foreground">Contribution path</dt>
      <dd className="mt-2 text-label">Direct Submission</dd>
    </div>
  </dl>;
}

export function ProblemDiscoveryFacts({ problem, className }: { problem: ProblemDiscovery; className?: string }) {
  const standing = problem.record.local_standing ?? "unassessed";
  return <dl className={cn("flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-meta", className)}>
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <dt className="text-eyebrow uppercase text-muted-foreground">Source status</dt>
      <dd className="text-label capitalize">{problem.record.declared_status}</dd>
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <dt className="text-eyebrow uppercase text-muted-foreground">Local Standing</dt>
      <dd><StatusBadge state={standing} axis="standing">{problem.record.local_standing ? `${humanize(problem.record.local_standing)} locally` : "Not assessed locally"}</StatusBadge></dd>
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <dt className="text-eyebrow uppercase text-muted-foreground">Contribution path</dt>
      <dd className="text-label">Direct Submission</dd>
    </div>
  </dl>;
}
