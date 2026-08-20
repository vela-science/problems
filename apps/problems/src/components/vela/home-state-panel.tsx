import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AssertionText } from "@/components/vela/assertion-text";
import { formatDate } from "@/lib/format";

/* The instrument, working — not a picture of one.
 *
 * Adapted from the shadcn.io `hero-split-commit-graph` anatomy: a contained
 * window with a header strip, a lane, and a row per node beside it. That block
 * fills its lane with invented commits, which is the one thing this cannot do —
 * so every node here is a Result this Repository actually admitted, the header
 * carries the exact release root those Results were read at, and the tail
 * states the real remainder.
 *
 * The lane is drawn with a rule and a mark per row rather than as one SVG.
 * The SVG version had to assume a fixed row height, and these rows are as tall
 * as the assertion they carry, so its marks slid out of register with the
 * entries they pointed at. A mark positioned by its own row cannot drift.
 *
 * The lane is straight because the data is: these are terminal Decisions in
 * time order, not a branch topology. A merge curve would draw a relationship
 * the projection does not retain. */

export type StateEntry = {
  number: string;
  href: string;
  headline: string;
  limitation: string | null;
  reviewedAt: string | null;
};

export function HomeStatePanel({ entries, repositoryName, root, openCount }: {
  entries: StateEntry[];
  repositoryName: string;
  root: string | null;
  openCount: number;
}) {
  return <section aria-labelledby="accepted-heading" className="min-w-0 overflow-hidden rounded-xl border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-muted/40 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-status-progress" />
        <h2 id="accepted-heading" className="truncate text-compact font-semibold">{repositoryName}</h2>
      </div>
      {root ? <p className="min-w-0 text-micro text-muted-foreground">
        <span className="mr-1.5">root</span>
        <span className="font-mono">{root.replace(/^sha256:/u, "").slice(0, 12)}</span>
      </p> : null}
    </div>

    <ol className="relative min-w-0 space-y-5 px-5 py-5 pl-11">
      {/* The lane. It stops at the tail mark rather than running to the edge,
          because nothing is retained after the last Decision. */}
      <span aria-hidden className="absolute bottom-8 left-[27px] top-7 w-px bg-border" />

      {entries.map((entry) => <li key={entry.number} className="relative min-w-0">
        <span aria-hidden className="absolute -left-6 top-1 size-[11px] rounded-full bg-status-progress ring-2 ring-card" />
        <Link
          href={entry.href}
          className="group/entry block min-w-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-compact font-semibold group-hover/entry:text-primary">Erdős problem {entry.number}</span>
            <span className="text-micro text-muted-foreground">accepted{entry.reviewedAt ? ` · ${formatDate(entry.reviewedAt)}` : ""}</span>
          </span>
          <span className="mt-1 block text-meta leading-6 text-foreground">
            <AssertionText text={entry.headline} />
          </span>
          {entry.limitation ? <span className="mt-1.5 block text-micro leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">Scope:</span> <AssertionText text={entry.limitation} />
          </span> : null}
        </Link>
      </li>)}

      <li className="relative min-w-0">
        <span aria-hidden className="absolute -left-6 top-1 size-[11px] rounded-full border border-muted-foreground/50 bg-card" />
        <Link
          href="/problems"
          className="group/entry inline-flex min-h-6 items-center gap-1 text-meta text-muted-foreground hover:text-foreground"
        >
          {openCount.toLocaleString()} questions still open
          <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-3.5 transition-transform duration-150 group-hover/entry:translate-x-0.5" />
        </Link>
      </li>
    </ol>
  </section>;
}
