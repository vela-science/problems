"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Button } from "@vela/ui/components/button";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function AccountError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <PageShell archetype="default" layout="reading">
    <Alert className="max-w-2xl">
      <AlertTitle>Your account could not be loaded</AlertTitle>
      <AlertDescription>Your personal account data is temporarily unavailable. Public Problems and Contributions are unaffected.</AlertDescription>
    </Alert>
    <div className="mt-5 flex flex-wrap gap-3">
      <Button type="button" onClick={() => unstable_retry()}>Try again</Button>
      <Button variant="outline" nativeButton={false} render={<Link href="/problems" />}>Browse Problems</Button>
    </div>
  </PageShell>;
}
