import { cn } from "@vela/ui/lib/utils";

/* How far the Claims in this result actually got.
 *
 * The ledger's own numbers say a repository has 2,782 Claims and stop. What a
 * reader wants next is the shape behind that one integer: how many carry a
 * retained artifact, and how many a Proposal. Those counts printed as separate
 * sentences read as unrelated facts; drawn on one
 * baseline and one scale they read as one fact, which is that the strata
 * collapse fast.
 *
 * A staircase rather than a funnel. A funnel asks the reader to compare
 * trapezoid areas; a staircase is a bar chart, decodes by length alone, and
 * survives at rail width where a horizontal funnel does not.
 *
 * The chain is asserted, not assumed. Every step is counted independently, so
 * a step can exceed the one above it — a projection change, not an
 * impossibility. When that happens the gold spine is dropped and the rows are
 * drawn as independent bars, because a spine between two counts claims one is
 * a subset of the other and nothing here can check that at render time.
 *
 * The labels and the integers are visible text in the same list as the bars
 * rather than a second rendering of them. Under forced colours the fills
 * flatten and nothing is lost: the marks are currentColor strokes and every
 * count is printed. */

export type LadderStep = {
  id: string;
  label: string;
  count: number;
};

export function EvidenceLadder({
  steps,
  total,
  caption,
  className,
}: {
  steps: LadderStep[];
  /** The result total the bars are scaled against, passed rather than inferred. */
  total: number;
  caption: string;
  className?: string;
}) {
  /* Zero rows above an empty list are a statement about a search miss, not
     about the record. */
  if (!steps.length || total <= 0) return null;

  const nests = steps.every((step, index) => index === 0 || step.count <= steps[index - 1]!.count);
  const denominator = Math.max(total, ...steps.map((step) => step.count), 1);

  return (
    <figure className={cn("min-w-0", className)}>
      <ol className="min-w-0">
        {steps.map((step, index) => {
          const reached = step.count > 0;
          const previousReached = index > 0 && steps[index - 1]!.count > 0;
          return (
            <li key={step.id} className="relative flex min-w-0 gap-2 pb-3 last:pb-0">
              {/* the rule into this mark, drawn from the mark above it */}
              {index === 0 || !nests ? null : (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[7.5px] -top-3 h-3 w-px",
                    reached && previousReached ? "bg-direction" : "bg-transparent",
                  )}
                  style={
                    reached && previousReached
                      ? undefined
                      : { backgroundImage: "repeating-linear-gradient(to bottom,var(--border) 0 3px,transparent 3px 6px)" }
                  }
                />
              )}
              <span aria-hidden className="relative z-10 mt-[3px] shrink-0">
                <svg
                  viewBox="0 0 16 16"
                  className={cn("size-4", reached ? "text-status-progress" : "text-muted-foreground")}
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="3.25"
                    fill={reached ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray={reached ? undefined : "2.2 2"}
                  />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className={cn("min-w-0 flex-1 truncate text-micro", reached ? "text-foreground" : "text-muted-foreground")}>
                    {step.label}
                  </span>
                  <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
                    {step.count.toLocaleString()}
                  </span>
                </span>
                {/* The track is always drawn so a zero reads as an empty share
                    rather than as a missing row, and a fill below a legible
                    width is still drawn so a small reached stratum does not read as zero. */}
                <span aria-hidden className="mt-1 flex h-1 w-full min-w-0 rounded-sm bg-muted">
                  {reached ? (
                    <span
                      className="h-full rounded-sm bg-status-progress/70"
                      style={{ width: `${(step.count / denominator) * 100}%`, minWidth: "2px" }}
                    />
                  ) : null}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <figcaption className="mt-3 text-meta text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
