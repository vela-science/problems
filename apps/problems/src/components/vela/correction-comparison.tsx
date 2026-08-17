import { AssertionText } from "@/components/vela/assertion-text";

export function CorrectionComparison({ kind, before, after }: { kind: "corrects" | "supersedes"; before: string; after: string }) {
  return <details className="group mt-3 rounded-lg border bg-muted/20">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-label font-medium marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2">
      <span><span aria-hidden className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>Compare retained statements</span>
      <span className="text-meta font-normal text-muted-foreground">{kind === "corrects" ? "correction" : "supersession"}</span>
    </summary>
    <div className="grid border-t sm:grid-cols-2">
      <section className="min-w-0 border-b border-status-conflict/25 bg-status-conflict/5 p-4 sm:border-b-0 sm:border-r" aria-label="Statement before change">
        <p className="text-eyebrow uppercase text-status-conflict">Before · retained</p>
        <p className="mt-2 text-compact leading-6"><AssertionText text={before} /></p>
      </section>
      <section className="min-w-0 bg-status-progress/5 p-4" aria-label="Statement after change">
        <p className="text-eyebrow uppercase text-status-progress">After · current relation</p>
        <p className="mt-2 text-compact leading-6"><AssertionText text={after} /></p>
      </section>
    </div>
  </details>;
}
