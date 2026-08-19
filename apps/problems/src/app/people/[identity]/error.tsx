"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Button } from "@vela/ui/components/button";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function ContributorError({ reset }: { error: Error; reset: () => void }) {
  return <PageShell archetype="default" layout="reading" className="grid min-h-[56svh] content-center">
    <Alert className="max-w-2xl">
      <AlertTitle>This contributor profile could not load</AlertTitle>
      <AlertDescription>Public Problems and retained scientific attribution are unaffected. Try again or browse Problems directly.</AlertDescription>
    </Alert>
    <div className="mt-5 flex flex-wrap gap-3">
      <Button type="button" onClick={reset}>Try again</Button>
      <Button variant="outline" nativeButton={false} render={<Link href="/problems" />}>Browse Problems</Button>
    </div>
  </PageShell>;
}
