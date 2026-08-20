import Link from "next/link";
import type { Route } from "next";
import { cn } from "@vela/ui/lib/utils";

/* One filter control for the whole product.
 *
 * The same interaction — narrow a ledger, see how many rows each value has,
 * clear it again — was written seven times. `/decisions` used bare links with a
 * border swap, `/proposals` used `secondary` against `outline`, the repository
 * proposals ledger used `outline` against `ghost` (the inverse pairing), and
 * `/commits`, `/claims`, `/problems` and `/updates` each differed again. The
 * selected state was signalled three ways and the unselected state three more.
 *
 * These are links, not toggles: each one changes the address, so the reader can
 * share or reload a narrowed ledger. That rules out `ToggleGroup`, whose
 * semantics are client-side pressed state, and makes `aria-current` the correct
 * signal — which is what `/decisions` already got right. */

export type FilterChip = {
  /** Stable key; only needs to be unique within the group. */
  key: string;
  label: string;
  href: Route;
  active: boolean;
  /** Rows behind this value. Omitted when a count would be a guess. */
  count?: number;
};

export function FilterChips({
  chips,
  label,
  className,
}: {
  chips: FilterChip[];
  /** Names the group for a screen reader — "Filter by decision", say. */
  label: string;
  className?: string;
}) {
  if (chips.length < 2) return null;
  return (
    <nav aria-label={label} className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          aria-current={chip.active ? "true" : undefined}
          /* The count sits in its own flex child, so the DOM text runs
             "rejected1". Naming the link keeps the reading honest without
             putting a space into a gap-spaced row. */
          aria-label={chip.count === undefined ? undefined : `${chip.label}, ${chip.count.toLocaleString()}`}
          /* `min-h-8` is the 24px floor of WCAG 2.2 target size with room to
             spare, and it holds at every width — these were 23px tall. */
          className={cn(
            "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-meta transition-colors duration-150",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
            chip.active
              ? "border-transparent bg-secondary font-medium text-secondary-foreground"
              : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {chip.label}
          {chip.count === undefined ? null : (
            /* No opacity. At /70 the count measured 3.38:1 against its chip —
               below AA for text this size, and the count is the informative
               half of the control. */
            <span className={cn("font-mono tabular-nums", chip.active ? "text-secondary-foreground" : "text-muted-foreground")}>
              {chip.count.toLocaleString()}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
