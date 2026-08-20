import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type NetworkFact = { label: string; value: ReactNode; detail?: string };

/**
 * A connected strip for exact network facts. The information architecture was
 * adapted from shadcn.io Pro `stats-connected-kpi-bar-minimal` (reviewed
 * 2026-08-11); Vela removed trends, health colours, and dashboard semantics.
 */
export function NetworkFacts({ facts, className }: { facts: NetworkFact[]; className?: string }) {
  return <dl className={cn("grid gap-px overflow-hidden rounded-lg border bg-border", className ?? "sm:grid-cols-2 lg:grid-cols-4")}>
    {facts.map((fact) => <div key={fact.label} className="min-w-0 bg-card px-5 py-5">
      <dt className="text-eyebrow text-muted-foreground">{fact.label}</dt>
      <dd className="mt-2 font-mono text-title tabular-nums">{fact.value}</dd>
      {fact.detail ? <p className="mt-1 text-meta text-muted-foreground">{fact.detail}</p> : null}
    </div>)}
  </dl>;
}
