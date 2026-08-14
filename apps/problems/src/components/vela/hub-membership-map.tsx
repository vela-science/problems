import Link from "next/link";
import { ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ProblemDiscovery } from "@/lib/scientific-state";

/**
 * Radial membership geometry adapted from shadcn.io Pro
 * `features-radial-hub-satellite-graph` (reviewed 2026-08-11). Decorative
 * orbit, fake integrations, page-load choreography, Lucide, and cards were
 * removed. Every line below binds one real Problem to its projected Hub.
 */
export function HubMembershipMap({ name, problems }: { name: string; problems: ProblemDiscovery[] }) {
  const visible = problems.slice(0, 8);
  return <div>
    <div className="not-typeset relative mx-auto hidden aspect-square w-full max-w-xl sm:block" data-not-typeset>
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 size-full text-border">
        {visible.map((problem, index) => {
          const angle = index * (Math.PI * 2 / Math.max(visible.length, 1)) - Math.PI / 2;
          return <line key={`${problem.repository}/${problem.problem}`} x1="50" y1="50" x2={50 + Math.cos(angle) * 37} y2={50 + Math.sin(angle) * 37} stroke="currentColor" strokeWidth=".4" />;
        })}
      </svg>
      <div className="absolute left-1/2 top-1/2 w-36 -translate-x-1/2 -translate-y-1/2 text-center"><p className="text-eyebrow uppercase text-muted-foreground">Hub</p><p className="mt-1 text-title">{name}</p><p className="mt-1 text-meta text-muted-foreground">coordination only</p></div>
      {visible.map((problem, index) => {
        const angle = index * (Math.PI * 2 / Math.max(visible.length, 1)) - Math.PI / 2;
        const x = 50 + Math.cos(angle) * 37;
        const y = 50 + Math.sin(angle) * 37;
        return <Link key={`${problem.repository}/${problem.problem}`} href={problem.canonicalPath ?? `/p/${problem.repository}/${problem.problem}`} style={{ left: `${x}%`, top: `${y}%` }} className="absolute flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background font-mono text-label shadow-sm transition-[transform,background-color] duration-200 hover:scale-105 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4">{problem.problem}</Link>;
      })}
    </div>
    <ol className="grid gap-2 sm:hidden">{visible.map((problem) => <li key={`${problem.repository}/${problem.problem}`}><Link href={problem.canonicalPath ?? `/p/${problem.repository}/${problem.problem}`} className="flex items-center gap-4 rounded-lg bg-muted/30 px-3 py-3.5 transition-colors duration-200 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2"><span className="font-mono text-title">{problem.problem}</span><span className="min-w-0 flex-1 truncate text-label">{problem.theme}</span><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4" /></Link></li>)}</ol>
  </div>;
}
