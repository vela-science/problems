import { Badge } from "@vela/ui/components/badge";

type Row = Record<string, unknown>;
const value = (row: Row, ...keys: string[]) => keys.map((key) => row[key]).find((entry): entry is string => typeof entry === "string") ?? "";

/**
 * Branching rhythm adapted from shadcn.io Pro `timeline-branching` (reviewed
 * 2026-08-11). It visualizes activity-plane Approach forks only—never Claim
 * lineage, dependency, Verification, Decision, or Standing.
 */
export function ApproachLineage({ approaches }: { approaches: Row[] }) {
  const ids = new Set(approaches.map((row) => value(row, "id", "approach_id")));
  return <ol className="mt-4">
    {approaches.map((approach) => {
      const id = value(approach, "id", "approach_id");
      const parent = value(approach, "parentApproachId", "parent_approach_id");
      const fork = Boolean(parent && ids.has(parent));
      return <li key={id} className={`relative border-l py-4 pl-6 ${fork ? "ml-6" : ""}`}>
        <span aria-hidden className="absolute -left-1 top-6 size-2 rounded-full bg-muted-foreground" />
        <div className="flex flex-wrap items-center gap-2"><h3 className="text-subtitle">{value(approach, "title")}</h3>{fork ? <Badge variant="secondary">forked approach</Badge> : <Badge variant="outline">root approach</Badge>}</div>
        <p className="mt-2 text-body text-muted-foreground">{value(approach, "summary")}</p>
        {parent ? <p className="mt-2 font-mono text-micro text-muted-foreground">from {parent.slice(0, 16)}…</p> : null}
      </li>;
    })}
  </ol>;
}
