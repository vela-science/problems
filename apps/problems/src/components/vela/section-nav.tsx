"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import styles from "./section-nav.module.css";

export type SectionLink = {
  key: string;
  label: string;
  href: string;
  /* Optional: a count is shown where one is cheap and real. A Problem's
     sections carry them because the page already holds those records; a
     Repository's do not, because each section fetches its own and a count in
     the header would mean a second read of every ledger on every route. The
     rule is that sections live in the object's header, not that they must be
     counted. */
  count?: number;
};

/* One section row, for every object that has sections.
 *
 * Problems and Repositories each had their own model — Problem sections in the
 * object's header, Repository sections in the sidebar — with nothing a reader
 * could predict from. One rule now: the rail moves between objects, an object's
 * header moves between its sections. This is that header row, and it is shared
 * rather than copied.
 *
 * Made usable on a phone.
 *
 * Measured at 375px on `/problems/erdos-problems/94/history`: the row was
 * 339px wide over 441px of tabs, scrollLeft 0, with `scrollbar-width: none`.
 * The open section — History, at offsetLeft 366 — sat entirely outside the
 * visible window, so the row read "Overview · Work · Results · Sources" with
 * nothing marked current. A reader on History could not tell which section
 * they were in, that History existed, or that the row scrolled at all. On all
 * 1,217 Problems.
 *
 * DESIGN.md already required the fix: "If the row scrolls, show a visible
 * continuation cue and preserve arrow key, focus, and active-tab visibility.
 * Do not hide later modes with no cue."
 *
 * Two things, therefore: the open section is scrolled into view on mount, and
 * the row fades at whichever edge has more behind it. */
export function SectionNav({ sections, current, label }: {
  sections: SectionLink[];
  current: string;
  /** Names the row for a screen reader: "Problem sections", "Repository sections". */
  label: string;
}) {
  const navigation = useRef<HTMLElement | null>(null);

  /* Which edges have content beyond them. Driven by scroll and by resize, so
     rotating a phone re-evaluates rather than leaving a stale mask. */
  const syncOverflow = useCallback(() => {
    const nav = navigation.current;
    if (!nav) return;
    const furthest = nav.scrollWidth - nav.clientWidth;
    if (furthest <= 1) {
      nav.dataset.overflow = "none";
      return;
    }
    const atStart = nav.scrollLeft <= 1;
    const atEnd = nav.scrollLeft >= furthest - 1;
    nav.dataset.overflow = atStart ? "end" : atEnd ? "start" : "both";
  }, []);

  useEffect(() => {
    const nav = navigation.current;
    if (!nav) return;
    /* `scrollIntoView` would also scroll every ancestor, which on a short
       viewport drags the page down past the title. Setting `scrollLeft` moves
       this row and nothing else. */
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      const furthest = Math.max(0, nav.scrollWidth - nav.clientWidth);
      const centred = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
      nav.scrollLeft = Math.min(Math.max(centred, 0), furthest);
    }
    syncOverflow();
    const observer = new ResizeObserver(syncOverflow);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [current, syncOverflow]);

  return <nav
    ref={navigation}
    className={`${styles.tabs} mt-3 flex gap-0.5 overflow-x-auto`}
    aria-label={label}
    data-overflow="none"
    onScroll={syncOverflow}
  >
    {sections.map(({ key, label, href, count }) => <Link
      key={key}
      href={href}
      /* `min-h-9` rather than `h-9`: an anchor is not a control slot, so it
         opts into the touch target the way every other non-control does, and
         `globals.css` promotes the minimum on a coarse pointer. */
      className="group inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 border-transparent px-2.5 text-compact text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
      aria-current={current === key ? "page" : undefined}
    >
      {label}
      {/* A count is information, not decoration: it says where the substance is
          before the reader spends a navigation finding out. */}
      {count ? <span className="inline-flex h-4 min-w-5 items-center justify-center rounded-full border bg-muted px-1.5 font-mono text-micro font-normal text-muted-foreground group-aria-[current=page]:border-primary/30 group-aria-[current=page]:bg-accent group-aria-[current=page]:text-accent-foreground">{count}</span> : null}
    </Link>)}
  </nav>;
}
