import type { ReactNode } from "react";
import { cn } from "@vela/ui/lib/utils";

/* A record's own attributes, as a description list.
 *
 * The product had no pattern for this, so attributes were rendered with `Item`
 * — the same primitive the ledgers use for rows. An Item reads as a navigation
 * target, so a Claim's own properties looked like links to somewhere else.
 * A `dl` says what these are: facts about the thing you are already looking at.
 *
 * Adaptation of Tailwind Plus Application UI v4
 * `data-display/description-lists/01-left-aligned`: the label/value grid, the
 * divided rows and the responsive collapse to a single column are the mechanics
 * taken. Its Heroicon and `gray-*` ramps are dropped for tokens, and the
 * `sm:grid-cols-3` split is kept because a value here is usually short.
 * Recorded in docs/editorial-references.md. */

export type RecordFact = {
  label: string;
  value: ReactNode;
  /* Set when the value is absent rather than empty, so the row can say which. */
  absent?: boolean;
};

export function RecordFacts({
  facts,
  className,
}: {
  facts: RecordFact[];
  className?: string;
}) {
  return (
    <dl className={cn("divide-y", className)}>
      {facts.map((fact) => (
        <div key={fact.label} className="grid gap-1 py-2.5 sm:grid-cols-3 sm:gap-4">
          <dt className="text-meta text-muted-foreground">{fact.label}</dt>
          <dd className={cn("min-w-0 break-words text-compact sm:col-span-2", fact.absent && "text-muted-foreground")}>
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
