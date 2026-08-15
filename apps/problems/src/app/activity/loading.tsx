import { IntroSkeleton, LedgerSkeleton, RouteSkeleton } from "@/components/vela/route-skeleton";
import { PageShell } from "@vela/ui/vela/page-shell";

/* Safe here because no descendant of this segment calls `notFound()`.
 *
 * A Suspense boundary above a segment that can 404 flushes the shell and
 * commits the response as 200, after which a `notFound()` can only stream 404
 * UI into a 200. `suspense-404.test.ts` enforces that rule over the whole
 * route tree, so this file is checked rather than trusted. */
export default function Loading() {
  return (
    <PageShell archetype="history">
      <RouteSkeleton label="Loading State history">
        <IntroSkeleton signals={3} />
        <LedgerSkeleton rows={8} />
      </RouteSkeleton>
    </PageShell>
  );
}
