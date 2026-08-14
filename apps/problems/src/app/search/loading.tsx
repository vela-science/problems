import { IntroSkeleton, LedgerSkeleton, RouteSkeleton, ToolbarSkeleton } from "@/components/vela/route-skeleton";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function SearchLoading() {
  return (
    <PageShell archetype="data" layout="canvas"><RouteSkeleton label="Loading search">
      <IntroSkeleton />
      <ToolbarSkeleton controls={4} />
      <LedgerSkeleton rows={6} />
    </RouteSkeleton></PageShell>
  );
}
