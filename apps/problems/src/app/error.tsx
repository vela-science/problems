"use client";

import { useEffect } from "react";
import { Button } from "@vela/ui/components/button";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <PageShell archetype="default" className="grid min-h-[64svh] content-center">
      <p className="font-mono text-meta tracking-[0.01em] text-status-conflict tabular-nums">Page unavailable</p>
      <h2 className="mt-4 max-w-3xl text-display tracking-tight">This page could not load.</h2>
      <p className="mt-3 max-w-xl text-body leading-6 text-muted-foreground">problems.science does not substitute unverified data when a published view fails. Try again; if the problem continues, use Contact and include this page address.</p>
      <Button className="mt-5 w-fit" onClick={reset}>Try again</Button>
    </PageShell>
  );
}
