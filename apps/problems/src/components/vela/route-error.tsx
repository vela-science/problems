"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Button } from "@vela/ui/components/button";
import { PageShell, type VelaPageArchetype } from "@vela/ui/vela/page-shell";

/* A scoped failure, named for what failed to read.
 *
 * Most routes fell through to the single root boundary, which can only say
 * "this exact view could not render": it does not know whether a Repository, a
 * search or the map was being read, so it cannot offer the one exit that would
 * help. Scoping keeps a failed section from blanking the application and lets
 * the recovery point somewhere real.
 *
 * One component rather than one file per route. Five boundaries differing only
 * in a noun is the restatement this product treats as a defect, and the parts
 * that genuinely differ — what was being read, and where to go instead — are
 * exactly the two things passed in. */
export function RouteError({ title, reading, action, reset, archetype = "default" }: {
  /** What could not load, in the reader's words. */
  title: string;
  /** What this surface was reading when it failed. */
  reading: string;
  action: { href: string; label: string };
  reset: () => void;
  archetype?: VelaPageArchetype;
}) {
  return (
    <PageShell archetype={archetype} className="grid min-h-[56svh] content-center">
      <Alert variant="destructive" className="max-w-2xl">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {reading} problems.science does not substitute unverified scientific state when a
          published view fails.
        </AlertDescription>
      </Alert>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button nativeButton={false} variant="outline" render={<Link href={action.href} />}>{action.label}</Button>
      </div>
    </PageShell>
  );
}
