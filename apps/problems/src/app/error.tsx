"use client";

import { useEffect } from "react";
import { Button } from "@vela/ui/components/button";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <PageShell archetype="default" className="grid min-h-[64svh] content-center">
      <p className="font-mono text-meta tracking-[0.01em] text-status-conflict tabular-nums">projection error</p>
      <h2 className="mt-4 max-w-3xl text-display tracking-tight">This exact view could not render.</h2>
      <p className="mt-3 max-w-xl text-body leading-6 text-muted-foreground">No replacement data was inferred. Retry the static view, or verify the deployment manifest before trusting this build.</p>
      <Button className="mt-5 w-fit" onClick={reset}>Retry view</Button>
    </PageShell>
  );
}
