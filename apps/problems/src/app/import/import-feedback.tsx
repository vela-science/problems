"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@vela/ui/components/button";

/* Import is the one route that reports back, and neither thing it has to say
 * was reaching anyone who could not see the page.
 *
 * Every failure path in `actions.ts` ends in `redirect("/import?error=…")`, so
 * the error arrives as a **fresh document**. A live region only announces a
 * change made after it is already in the accessibility tree; one that is
 * present in the parsed HTML is read only if the user happens to travel to it.
 * So `role="alert"` on a server-rendered error announced nothing, and focus
 * had reset to the top of a page that looked unchanged. Moving focus to the
 * message is what makes it arrive, and it works whether the message came from
 * a navigation or from a render.
 *
 * Inspecting a pinned revision calls out to GitHub and takes seconds, during
 * which the page said nothing and the button stayed armed. The status region
 * below is empty on first paint and filled while the action runs, which is
 * the shape a live region actually announces. */

export function ImportError({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-xl border border-status-conflict/35 bg-status-conflict/5 p-4 text-body focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {message}
    </div>
  );
}

export function ImportSubmit({
  children,
  pending: pendingLabel,
  variant,
}: {
  children: string;
  pending: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? pendingLabel : children}
      </Button>
      {/* Rendered empty rather than mounted on demand: a region the reader's
          software already knows about is the one whose next change it reads. */}
      <p role="status" aria-live="polite" className="text-meta text-muted-foreground">
        {pending ? `${pendingLabel}. Reading the pinned revision from GitHub.` : ""}
      </p>
    </div>
  );
}
