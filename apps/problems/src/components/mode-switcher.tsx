"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

export function ModeSwitcher({ repository, problem, mode }: { repository: string; problem: string; mode: "state" | "work" }) {
  const href = (next: "state" | "work") => `/p/${repository}/${problem}?mode=${next}`;
  const reduceMotion = useReducedMotion();
  return <nav aria-label="Problem mode" className="inline-grid grid-cols-2 rounded-lg bg-muted p-1">
    {(["state", "work"] as const).map((item) => <Link
      key={item}
      href={href(item)}
      aria-current={mode === item ? "page" : undefined}
      className={`relative min-w-28 rounded-md px-4 py-2 text-center text-label capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${mode === item ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {mode === item ? <motion.span
        layoutId="problem-mode"
        aria-hidden
        className="absolute inset-0 rounded-md bg-background shadow-sm"
        transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      /> : null}
      <span className="relative">{item}</span>
    </Link>)}
  </nav>;
}
