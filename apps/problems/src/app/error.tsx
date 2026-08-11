"use client";

import { Button } from "@vela/ui/components/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6"><p className="text-eyebrow uppercase text-muted-foreground">Exact read unavailable</p><h1 className="mt-2 text-display">The canonical projection could not be read.</h1><p className="mt-4 max-w-prose text-body text-muted-foreground">No hosted activity has been substituted for scientific state. Retry the exact read or use Observatory.</p><div className="mt-6 flex gap-3"><Button onClick={reset}>Retry</Button><Button nativeButton={false} variant="outline" render={<a href="https://app.vela.space/repositories" />}>Open Observatory</Button></div></div>;
}
