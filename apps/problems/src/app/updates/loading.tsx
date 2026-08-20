import { IntroSkeleton, LedgerSkeleton, RouteSkeleton } from "@/components/vela/route-skeleton";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function Loading() {
  return (
    <PageShell archetype="history">
      <RouteSkeleton label="Loading Updates">
        {/* No signals: the Updates hero renders none, and a skeleton that
            promises three stat tiles the page never shows is a layout jump. */}
        <IntroSkeleton />
        <LedgerSkeleton rows={8} />
      </RouteSkeleton>
    </PageShell>
  );
}
