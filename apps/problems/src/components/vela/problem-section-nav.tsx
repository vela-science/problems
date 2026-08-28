"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import styles from "./problem-header.module.css";

export type ProblemSectionLink = {
  key: string;
  label: string;
  href: string;
  count: number;
};

/* The section row, made usable on a phone.
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
export function ProblemSectionNav({ sections, current }: {
  sections: ProblemSectionLink[];
  current: string;
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
    className={styles.tabs}
    aria-label="Problem sections"
    data-overflow="none"
    onScroll={syncOverflow}
  >
    {sections.map(({ key, label, href, count }) => <Link
      key={key}
      href={href}
      className={styles.tab}
      aria-current={current === key ? "page" : undefined}
    >
      {label}
      {count > 0 ? <span className={styles.count}>{count}</span> : null}
    </Link>)}
  </nav>;
}
