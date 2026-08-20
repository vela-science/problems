import { Disclosure } from "@/components/vela/disclosure";
import { AssertionText } from "@/components/vela/assertion-text";
import { assertionDiff, elideUnchanged } from "@/lib/assertion-diff";

export function CorrectionComparison({ kind, before, after }: { kind: "corrects" | "supersedes"; before: string; after: string }) {
  const word = kind === "corrects" ? "correction" : "supersession";

  /* A correction may leave the statement bytes untouched: the live Erdős 94
     chain carries a `corrects` relation between two Claims with byte-identical
     assertions, where the revision changed the record's relations. Twin
     before/after panes showing the same text read as a rendering bug, so the
     identical case is one sentence instead of a comparison. */
  const spans = assertionDiff(before, after);
  if (!spans.length) {
    return (
      <p className="mt-3 text-compact leading-6 text-muted-foreground">
        The retained statement is identical before and after: this {word} revised the record&rsquo;s relations, not the statement text.
      </p>
    );
  }

  /* The changed span, not both versions in full.
   *
   * An assertion runs to ninety words or more and a correction usually revises
   * one clause of it. Showing both and leaving the reader to compare them
   * buries the only thing the correction says — and on this site a correction
   * that ADDS a limitation is the most consequential event recorded, because
   * it is the moment the record became less confident. */
  const shown = elideUnchanged(spans);
  const added = spans.filter((span) => span.kind === "added").length;
  const removed = spans.filter((span) => span.kind === "removed").length;

  return <div className="mt-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-label font-medium">What this {word} changed</p>
      <p className="text-meta text-muted-foreground">
        {added ? <span className="text-status-progress">{added} {added === 1 ? "addition" : "additions"}</span> : null}
        {added && removed ? <span aria-hidden> · </span> : null}
        {removed ? <span className="text-status-conflict">{removed} {removed === 1 ? "removal" : "removals"}</span> : null}
      </p>
    </div>

    <p className="mt-2 text-compact leading-6">
      {shown.map((span, index) => {
        if (span.kind === "elided") return <span key={index} className="mx-1 select-none rounded bg-muted px-1.5 py-0.5 text-meta text-muted-foreground" title={`${span.words} unchanged words`}>…</span>;
        if (span.kind === "added") return <ins key={index} className="rounded-sm bg-status-progress/20 px-0.5 no-underline decoration-status-progress/60">{span.text} </ins>;
        if (span.kind === "removed") return <del key={index} className="rounded-sm bg-status-conflict/20 px-0.5 decoration-status-conflict/70">{span.text} </del>;
        return <span key={index} className="text-muted-foreground">{span.text} </span>;
      })}
    </p>

    <Disclosure
      className="mt-3 rounded-lg border bg-muted/20"
      summaryClassName="px-4 py-2 text-label font-medium"
      summary="Read both in full"
      meta={word}
    >
      <div className="grid border-t sm:grid-cols-2">
        <section className="min-w-0 border-b border-status-conflict/25 bg-status-conflict/5 p-4 sm:border-b-0 sm:border-r" aria-label="Statement before change">
          <p className="text-eyebrow text-status-conflict">Before · retained</p>
          <p className="mt-2 text-compact leading-6"><AssertionText text={before} /></p>
        </section>
        <section className="min-w-0 bg-status-progress/5 p-4" aria-label="Statement after change">
          <p className="text-eyebrow text-status-progress">After · current relation</p>
          <p className="mt-2 text-compact leading-6"><AssertionText text={after} /></p>
        </section>
      </div>
    </Disclosure>
  </div>;
}
