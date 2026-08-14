import { CanvasSkeleton, IntroSkeleton, RouteSkeleton } from "@/components/vela/route-skeleton";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function GraphLoading() {
  return (
    <PageShell archetype="data" layout="canvas"><RouteSkeleton label="Loading the repository graph"><IntroSkeleton /><CanvasSkeleton /></RouteSkeleton></PageShell>
  );
}
