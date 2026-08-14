import Link from "next/link";
import { toneFills, type StatusTone } from "@vela/ui/vela/status-badge";
import { cn } from "@vela/ui/lib/utils";

/* One stacked bar per collection, showing what the collection is made of.
 *
 * This replaces the metric tile, which root DESIGN.md lists under Avoid
 * ("Generic admin-dashboard metrics as the primary hierarchy") and which was
 * the first thing on the Repositories page. A tile states a number with no
 * denominator, no neighbour and no history; a composition bar states the same
 * number as a share of a whole, next to the parts it is not.
 *
 * Every segment decodes to a count and links into the ledger filtered to that
 * value, so the figure is also the control. Segments below a legible width are
 * still drawn — a share too small to see is a fact, and dropping it would make
 * the bar sum to less than the total without saying so. */

export type CompositionSegment = {
  label: string;
  count: number;
  /**
   * A status tone, or undefined for the neutral rule colour. The vocabulary is
   * the badge's — this file and page-intro.tsx each restated it, and the two
   * lists had already stopped matching. `neutral` is excluded rather than
   * mapped: a segment with no state takes the thinner rule colour below, which
   * is not the same value as the neutral fill.
   */
  tone?: Exclude<StatusTone, "neutral">;
  href?: string;
};

export function CompositionBar({
  segments,
  total,
  className,
  caption,
  divided,
}: {
  segments: CompositionSegment[];
  /** Pass the authoritative total; a bar that infers its own can never be short. */
  total: number;
  className?: string;
  caption?: string;
  /**
   * For a series whose values are identities rather than states: the track
   * becomes a hairline grid and every segment takes the neutral rule colour.
   * A status hue on one segment of a bar whose members already share a state
   * would imply the others lack it, so shares separate by the rule and the
   * legend's exact counts carry the mapping.
   */
  divided?: boolean;
}) {
  const counted = segments.reduce((sum, segment) => sum + segment.count, 0);
  const unaccounted = Math.max(0, total - counted);
  const denominator = Math.max(total, counted, 1);
  const parts = [
    ...segments.filter((segment) => segment.count > 0),
    ...(unaccounted > 0 ? [{ label: "not classified", count: unaccounted }] : []),
  ];
  if (!parts.length) return null;
  const fill = (segment: CompositionSegment) => (
    !divided && segment.tone ? toneFills[segment.tone] : "bg-muted-foreground/45"
  );

  return (
    <figure className={cn("min-w-0", className)}>
      <div
        className={cn(
          "flex h-2.5 w-full min-w-0 overflow-hidden rounded-sm",
          divided ? "gap-px bg-border" : "bg-muted",
        )}
        aria-hidden
      >
        {parts.map((part) => (
          <span
            key={part.label}
            className={cn("h-full", fill(part as CompositionSegment))}
            style={{ width: `${(part.count / denominator) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {parts.map((part) => {
          const segment = part as CompositionSegment;
          const body = (
            <>
              <span
                aria-hidden
                className={cn("size-1.5 shrink-0 rounded-full", fill(segment))}
              />
              <span className="text-micro text-muted-foreground">{part.label}</span>
              <span className="font-mono text-micro tabular-nums text-foreground">{part.count.toLocaleString()}</span>
            </>
          );
          return (
            <li key={part.label}>
              {segment.href
                ? <Link href={segment.href} className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-accent">{body}</Link>
                : <span className="flex items-center gap-1.5 px-1 py-0.5">{body}</span>}
            </li>
          );
        })}
      </ul>
      {caption ? <figcaption className="mt-2 text-meta text-muted-foreground">{caption}</figcaption> : null}
    </figure>
  );
}
