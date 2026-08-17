import type { ProblemDiscovery } from "@/lib/scientific-state";

type DistributionSegment = {
  key: "open" | "resolved" | "other" | "unknown";
  label: string;
  count: number;
  className: string;
};

const SEGMENT_STYLE: Record<DistributionSegment["key"], string> = {
  open: "bg-muted-foreground/45",
  resolved: "bg-status-progress",
  other: "bg-status-caution",
  unknown: "bg-border",
};

function sourceStatusKind(value: string | null | undefined): DistributionSegment["key"] {
  const status = value?.trim().toLocaleLowerCase() ?? "";
  if (!status || status === "unknown" || status === "not stated") return "unknown";
  if (status.includes("open")) return "open";
  if (["solved", "proved", "disproved", "resolved"].some((word) => status.includes(word))) return "resolved";
  return "other";
}

export function collectionDistribution(problems: ProblemDiscovery[]) {
  const counts: Record<DistributionSegment["key"], number> = { open: 0, resolved: 0, other: 0, unknown: 0 };
  let formalized = 0;
  let reviewed = 0;
  for (const problem of problems) {
    counts[sourceStatusKind(problem.record.declared_status)] += 1;
    if (problem.record.formalized) formalized += 1;
    if (problem.record.local_standing) reviewed += 1;
  }
  const labels: Record<DistributionSegment["key"], string> = {
    open: "Open per source",
    resolved: "Resolved per source",
    other: "Other source status",
    unknown: "Not stated by source",
  };
  const segments = (Object.keys(counts) as DistributionSegment["key"][])
    .map((key) => ({ key, label: labels[key], count: counts[key], className: SEGMENT_STYLE[key] }))
    .filter(({ count }) => count > 0);
  return { total: problems.length, formalized, reviewed, segments };
}

function CoverageRail({ label, count, total, className }: { label: string; count: number; total: number; className: string }) {
  const percent = total ? (count / total) * 100 : 0;
  return <div>
    <div className="flex items-baseline justify-between gap-4 text-meta">
      <span className="font-medium text-foreground">{label}</span>
      <span className="font-mono tabular-nums text-muted-foreground">{count.toLocaleString()} / {total.toLocaleString()}</span>
    </div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted forced-colors:border">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${percent}%` }} />
    </div>
  </div>;
}

export function CollectionDistribution({ problems, compact = false }: { problems: ProblemDiscovery[]; compact?: boolean }) {
  const distribution = collectionDistribution(problems);
  return <figure className={compact ? "" : "vela-evidence-surface rounded-xl p-5 sm:p-6"} aria-labelledby="collection-distribution-title">
    <figcaption>
      <p className="text-eyebrow uppercase text-muted-foreground">Collection coverage</p>
      <h2 id="collection-distribution-title" className="mt-1 text-subtitle">What the published corpus contains</h2>
      <p className="mt-2 max-w-[72ch] text-meta text-muted-foreground">
        Source status reports what the collection declares. Formalization and reviewed evidence are separate, overlapping signals.
      </p>
    </figcaption>

    <div className="mt-5" aria-label={`Source status across ${distribution.total.toLocaleString()} Problems`}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted forced-colors:border">
        {distribution.segments.map((segment) => <span
          key={segment.key}
          className={`${segment.className} min-w-px forced-colors:border-r`}
          style={{ width: `${distribution.total ? (segment.count / distribution.total) * 100 : 0}%` }}
          aria-hidden
        />)}
      </div>
      <ul className="mt-3 grid gap-x-5 gap-y-2 text-meta sm:grid-cols-2">
        {distribution.segments.map((segment) => <li key={segment.key} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2"><span aria-hidden className={`size-2 shrink-0 rounded-full ${segment.className} forced-colors:border`} />{segment.label}</span>
          <span className="font-mono tabular-nums text-muted-foreground">{segment.count.toLocaleString()}</span>
        </li>)}
      </ul>
    </div>

    <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
      <CoverageRail label="Exact formal statement available" count={distribution.formalized} total={distribution.total} className="bg-status-evidence" />
      <CoverageRail label="With Repository-reviewed evidence" count={distribution.reviewed} total={distribution.total} className="bg-status-progress" />
    </div>
  </figure>;
}
