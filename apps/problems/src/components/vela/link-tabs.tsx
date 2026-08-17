"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

export type LinkTab = { key: string; href: string; label: string };

/* Link-addressed tabs. Each tab is a URL and every panel is complete HTML at
 * its own address, so nothing is DOM-deleted behind a closed control — the
 * failure DESIGN.md names ("a closed disclosure is not disclosure, it is
 * deletion") and the reason this is not Base UI Tabs, which keep unselected
 * panels out of the DOM and out of the URL. Selection is server-rendered from
 * the search params; the client boundary exists only for the underline. */
export function LinkTabs({ label, layoutId, tabs, current }: {
  label: string;
  layoutId: string;
  tabs: readonly LinkTab[];
  current: string;
}) {
  const reduceMotion = useReducedMotion();
  return <nav aria-label={label} className="flex max-w-full overflow-x-auto border-b">
    {tabs.map((tab) => <Link
      key={tab.key}
      href={tab.href}
      aria-current={current === tab.key ? "page" : undefined}
      className={`relative flex min-h-11 shrink-0 items-center justify-center px-2.5 text-center text-label transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-4 ${current === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {current === tab.key ? <motion.span
        layoutId={layoutId}
        aria-hidden
        className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-foreground"
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      /> : null}
      <span className="relative">{tab.label}</span>
    </Link>)}
  </nav>;
}
