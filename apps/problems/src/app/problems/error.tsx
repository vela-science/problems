"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Button } from "@vela/ui/components/button";
import { PageShell } from "@vela/ui/vela/page-shell";

/* A Problem view that could not render.
 *
 * Every failure here used to fall through to the single root boundary, which
 * says "this exact view could not render" without naming what was being read
 * or where to go next. Scoping it to `/problems` keeps a failed Problem from
 * blanking the application, and names the likeliest cause: this surface reads
 * an immutable projection release, so a root that has moved on underneath a
 * cached view fails here rather than anywhere a reader can see. */
export default function ProblemsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageShell archetype="problem" className="grid min-h-[56svh] content-center">
      <Alert variant="destructive" className="max-w-2xl">
        <AlertTitle>This Problem could not load.</AlertTitle>
        <AlertDescription>
          problems.science does not substitute unverified scientific state when a published view
          fails. Try again or return to the Problems directory.
        </AlertDescription>
      </Alert>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button nativeButton={false} variant="outline" render={<Link href="/problems" />}>Open Problems</Button>
      </div>
    </PageShell>
  );
}
