"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

export function ModeSwitcher({ mode, basePath }: { mode: "state" | "work"; basePath: string }) {
  const href = (next: "state" | "work") => `${basePath}?mode=${next}`;
  const reduceMotion = useReducedMotion();
  return <nav aria-label="Problem mode" className="inline-grid grid-cols-2 border-b">
    {(["state", "work"] as const).map((item) => <Link
      key={item}
      href={href(item)}
      aria-current={mode === item ? "page" : undefined}
      className={`relative flex min-h-11 min-w-28 items-center justify-center px-4 text-center text-label transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${mode === item ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {mode === item ? <motion.span
        layoutId="problem-mode"
        aria-hidden
        className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-foreground"
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      /> : null}
      <span className="relative">{item === "state" ? "Current State" : "Workspace"}</span>
    </Link>)}
  </nav>;
}
