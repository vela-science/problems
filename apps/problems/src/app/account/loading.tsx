import { Skeleton } from "@vela/ui/components/skeleton";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function AccountLoading() {
  return <PageShell archetype="default" layout="reading" aria-busy="true" aria-label="Loading account" className="flex flex-col gap-10">
    <div className="border-b pb-8">
      <Skeleton className="h-3 w-24" />
      <div className="mt-4 flex items-center gap-5">
        <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
        <div className="flex-1">
          <Skeleton className="h-8 w-52 max-w-full" />
          <Skeleton className="mt-3 h-4 w-72 max-w-full" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        </div>
      </div>
    </div>
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="space-y-10">
        {[0, 1].map((section) => <section key={section} className="space-y-4">
          <div className="border-b pb-4"><Skeleton className="h-6 w-44" /><Skeleton className="mt-2 h-4 w-80 max-w-full" /></div>
          {[0, 1].map((row) => <div key={row} className="flex items-center gap-3 border-b py-4"><Skeleton className="size-9" /><div className="flex-1"><Skeleton className="h-4 w-48 max-w-full" /><Skeleton className="mt-2 h-3 w-64 max-w-full" /></div></div>)}
        </section>)}
      </div>
      <div><Skeleton className="h-5 w-32" />{[0, 1, 2].map((row) => <div key={row} className="flex gap-3 border-b py-4"><Skeleton className="size-9" /><div className="flex-1"><Skeleton className="h-4 w-24" /><Skeleton className="mt-2 h-3 w-full" /></div></div>)}</div>
    </div>
  </PageShell>;
}
