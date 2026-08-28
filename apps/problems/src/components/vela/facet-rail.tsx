import Link from "next/link";
import type { ProblemFacetValue } from "@vela/projection-data";
import { Disclosure } from "@/components/vela/disclosure";

/* Facet counts double as the collection's distribution: a reader learns the
 * shape of the corpus before filtering it, which a free-text box cannot do
 * because it requires already knowing the answer. Counts are computed over the
 * active filter set minus the facet's own term, so selecting a value never
 * zeroes out its siblings.
 *
 * The bar is the first honest chart in the product and costs no CSS: it decodes
 * to the count printed beside it and to nothing else.
 *
 * A value may carry `parts`, a partition of its own count along a second
 * retained axis, and the bar is then split along its length:
 *
 *   bar length      the value's count against the largest count in the group
 *   solid segment   parts[0].count, on that same scale
 *   outlined rest   the remainder
 *
 * Fill against outline, never hue. A hue here would have to be borrowed from
 * the state palette, and a second axis inside a facet count is not a standing
 * and not a verification; ink weight also survives forced colours. Both
 * integers are printed beside the bar, so the group needs no second table and
 * the figure cannot drift from its ledger equivalent.
 *
 * The track is font-relative so it scales with text-only zoom. The 4px floor is
 * the existing one: a bar for a real count never disappears. */

export type FacetGroup = {
  name: string;
  label: string;
  values: ProblemFacetValue[];
  /* A caption for the group, below it, where a figure's caption belongs. */
  note?: string;
  /* The noun the folded tail is counted in, and the request to fold at all. A
     group heading is a singular noun phrase ("Subject tag") and cannot be
     pluralised mechanically, and a group that is the page's figure has to show
     every row for its shared scale to be readable, so folding is asked for
     rather than assumed. */
  moreLabel?: string;
};

/* A group with one value narrows nothing, so the rail drops it, and a rail with
   no groups left does not render. The page asks the same question to decide
   whether to lay out a gutter at all, so the guard lives in one place. */
export function liveFacetGroups(groups: FacetGroup[]): FacetGroup[] {
  return groups.filter((group) => group.values.length > 1);
}

/* Past this many values a group is longer than the rows it narrows. */
const shownValues = 8;

export function FacetRail({
  groups,
  selected,
  hrefFor,
  className,
}: {
  groups: FacetGroup[];
  selected: Record<string, string>;
  hrefFor: (name: string, value: string | null) => string;
  className?: string;
}) {
  const live = liveFacetGroups(groups);
  if (!live.length) return null;
  return (
    <nav aria-label="Narrow the ledger" className={className}>
      {/* The nav is named, but a name is not a heading: each group heads itself
          at `h3` under the route's `h1`, so a reader moving by heading fell two
          levels in one step. The rail's own level closes that, and says the
          same thing the nav is labelled, because that is what it is. */}
      <h2 className="sr-only">Narrow the ledger</h2>
      {live.map((group) => {
        const active = selected[group.name] ?? "";
        const largest = Math.max(...group.values.map((value) => value.count), 1);
        const folded = group.moreLabel ? group.values.slice(shownValues) : [];
        const row = (value: ProblemFacetValue) => {
          const chosen = active === value.value;
          const lead = value.parts?.[0];
          const rest = lead ? value.count - lead.count : 0;
          return (
            <li key={value.value}>
              <Link
                href={hrefFor(group.name, chosen ? null : value.value)}
                aria-current={chosen ? "true" : undefined}
                aria-label={lead ? `${value.value}, ${lead.count} of ${value.count} ${lead.label}` : undefined}
                className="group flex items-baseline gap-2 rounded px-1 py-1 hover:bg-accent aria-[current]:font-medium aria-[current]:text-foreground"
              >
                <span className="min-w-0 flex-1 truncate text-compact text-muted-foreground group-hover:text-foreground group-aria-[current=true]:text-foreground">
                  {value.value.replaceAll("_", " ")}
                </span>
                <span
                  aria-hidden
                  className="flex h-1.5 shrink-0 overflow-hidden rounded-sm"
                  style={{ width: `max(4px, ${((value.count / largest) * 2.5).toFixed(3)}rem)` }}
                >
                  {lead ? (
                    <>
                      {lead.count ? (
                        <span
                          className="bg-foreground/70"
                          style={{ width: `${((lead.count / value.count) * 100).toFixed(2)}%` }}
                        />
                      ) : null}
                      {rest ? <span className="flex-1 border border-border" /> : null}
                    </>
                  ) : (
                    <span className="flex-1 bg-border group-aria-[current=true]:bg-foreground/50" />
                  )}
                </span>
                <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
                  {lead ? `${lead.count.toLocaleString()} / ${value.count.toLocaleString()}` : value.count.toLocaleString()}
                </span>
              </Link>
            </li>
          );
        };
        return (
          <section key={group.name} className="mb-5 last:mb-0">
            <h3 className="text-eyebrow text-muted-foreground">{group.label}</h3>
            <ul className="mt-2">{(folded.length ? group.values.slice(0, shownValues) : group.values).map(row)}</ul>
            {/* `py-1.5`, which is what carries this disclosure from 22px to a
                target that clears 24. It is the control that reveals the other
                33 subjects, so it is the last one that should be hard to hit. */}
            {folded.length ? (
              <Disclosure
                summaryClassName="justify-start rounded px-1 py-1.5 text-micro text-muted-foreground hover:text-foreground"
                summary={<>{folded.length.toLocaleString()} more {group.moreLabel}</>}
              >
                <ul>{folded.map(row)}</ul>
              </Disclosure>
            ) : null}
            {group.note ? <p className="mt-2 text-meta text-muted-foreground">{group.note}</p> : null}
          </section>
        );
      })}
    </nav>
  );
}
