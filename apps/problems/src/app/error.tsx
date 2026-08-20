"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@vela/ui/components/button";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <PageShell archetype="default" className="grid min-h-[64svh] content-center">
      <p className="font-mono text-meta tracking-[0.01em] text-status-conflict tabular-nums">Page unavailable</p>
      {/* The page's only heading, so it is the page's h1. It was an h2, which
          left every error with no top-level heading — the same defect
          `not-found.tsx` documents having fixed for 404s. */}
      <h1 className="mt-4 max-w-3xl text-display tracking-tight">This page could not load.</h1>
      <p className="mt-3 max-w-xl text-body leading-6 text-muted-foreground">problems.science does not substitute unverified data when a published view fails. Try again; if the problem continues, <Link href="/contact" className="font-medium text-foreground underline underline-offset-4">use Contact</Link> and include this page address.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button className="w-fit" onClick={reset}>Try again</Button>
        <Button className="w-fit" variant="outline" nativeButton={false} render={<Link href="/problems" />}>Open Problems</Button>
      </div>
    </PageShell>
  );
}
