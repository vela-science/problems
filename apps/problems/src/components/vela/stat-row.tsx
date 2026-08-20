import { cn } from "@vela/ui/lib/utils";

export type Stat = {
  label: string;
  value: string;
  /** The value this one moved from, where a comparison is retained. */
  from?: string;
  /** Said under the value when it needs a qualifier the number cannot carry. */
  detail?: string;
};

/* A row of counts grouped by low-chroma peer surfaces at every width.
 *
 * Adaptation of Tailwind Plus Application UI v4
 * `data-display/stats/05-with-shared-borders`: the responsive `dl` grid and the
 * "from <previous>" comparison sitting beside the
 * stat rather than under it. Recorded in docs/editorial-references.md.
 *
 * What is dropped is most of it. Shared borders would misalign while four
 * values wrap into two rows, so restrained background grouping carries the
 * peer relationship instead. The template's indigo stat, its green and red
 * change pills with up and down arrows, its card shadow and its Heroicons all
 * go: a change pill coloured by direction says an increase is good, and on a
 * corpus of scientific Claims nothing here is good or bad — a Claim leaving the
 * accepted set because a Decision retracted it is the protocol working. So the
 * comparison is stated and never editorialised, in the same ink as the value.
 *
 * Mono and tabular, because these are exact counts a reader compares down a
 * column, and the type roles carry the hierarchy. */
export function StatRow({ stats, className }: { stats: Stat[]; className?: string }) {
  if (!stats.length) return null;
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-2 sm:grid-cols-2",
        stats.length >= 4 && "lg:grid-cols-4",
        stats.length === 3 && "sm:grid-cols-3",
        className,
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="min-w-0 rounded-lg bg-muted/30 px-3 py-3"
        >
          <dt className="text-eyebrow text-muted-foreground">{stat.label}</dt>
          <dd className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-mono text-title tabular-nums">{stat.value}</span>
            {stat.from ? (
              <span className="text-micro text-muted-foreground">
                from <span className="font-mono tabular-nums">{stat.from}</span>
              </span>
            ) : null}
          </dd>
          {stat.detail ? (
            <p className="mt-0.5 text-micro text-muted-foreground">{stat.detail}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
