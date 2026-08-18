import type { ReactNode } from "react";
import { Skeleton } from "@vela/ui/components/skeleton";
import { PageHero } from "@vela/ui/vela/page-shell";

/* Route-level loading composition. A skeleton stands in for the shape a route
   is about to render and nothing else: it never draws a count, a Standing, a
   root, or a badge, so nothing here can be mistaken for retained state. Each
   route's `loading.tsx` composes these pieces to match its own layout. */

export function RouteSkeleton({
  label,
  className = "flex flex-col gap-6",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
    </div>
  );
}

export function IntroSkeleton({ signals = 0 }: { signals?: number }) {
  return (
    <PageHero density="compact">
      <Skeleton className="h-7 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-[42ch] max-w-full" />
      <Skeleton className="mt-2 h-4 w-[28ch] max-w-full" />
      {signals ? (
        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: signals }, (_, index) => (
            <div key={index} className="rounded-lg bg-background/55 px-3 py-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-4 w-12" />
            </div>
          ))}
        </div>
      ) : null}
    </PageHero>
  );
}

export function ToolbarSkeleton({ controls = 3 }: { controls?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {Array.from({ length: controls }, (_, index) => (
        <Skeleton key={index} className="h-8 w-40" />
      ))}
    </div>
  );
}

export function LedgerSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="vela-object-surface divide-y overflow-hidden">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-start gap-4 px-4 py-4">
          <Skeleton className="h-4 w-7 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-[36ch] max-w-full" />
            <Skeleton className="mt-2 h-3 w-[52ch] max-w-full" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function CanvasSkeleton({ className = "h-[34rem]" }: { className?: string }) {
  return (
    <div className="vela-object-surface overflow-hidden">
      <div className="border-b p-4">
        <ToolbarSkeleton controls={4} />
      </div>
      <Skeleton className={`w-full rounded-none ${className}`} />
    </div>
  );
}
