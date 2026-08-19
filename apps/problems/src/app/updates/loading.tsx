import { IntroSkeleton, LedgerSkeleton, RouteSkeleton } from "@/components/vela/route-skeleton";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function Loading() {
  return (
    <PageShell archetype="history">
      <RouteSkeleton label="Loading Updates">
        <IntroSkeleton signals={3} />
        <LedgerSkeleton rows={8} />
      </RouteSkeleton>
    </PageShell>
  );
}
