/* Safe here: this segment has no dynamic children and never calls
 * `notFound()`. A `loading.tsx` above a
 * segment that can 404 flushes the shell and commits the response as 200,
 * after which `notFound()` can only stream 404 UI into a 200.
 * `suspense-404.test.ts` enforces that over the whole route tree. */
import { IntroSkeleton, LedgerSkeleton, RouteSkeleton, ToolbarSkeleton } from "@/components/vela/route-skeleton";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function Loading() {
  return (
    <PageShell archetype="default" layout="reading"><RouteSkeleton label="Loading Decisions">
      <IntroSkeleton />
      <ToolbarSkeleton controls={3} />
      <LedgerSkeleton rows={8} />
    </RouteSkeleton></PageShell>
  );
}
