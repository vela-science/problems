import { Skeleton } from "@vela/ui/components/skeleton";

export default function Loading() {
  return <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6"><Skeleton className="h-8 w-52" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
}
