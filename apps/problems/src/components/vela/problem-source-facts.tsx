import Link from "next/link";
import type { ProblemRecord } from "@vela/projection-data";

/* The facts a Source declares about a Problem: what it is filed under, whether
   it carries a prize, whether anyone has formalized it, and which sources hold
   a record of it. They were written inline on the Records route, which is the
   one route a reader arrives at last. On the 1,215 Problems this Repository has
   admitted nothing about, they are most of what there is to know, so both
   routes read them from here rather than from two copies.

   `ledgerHref` differs by route on purpose: inside a Repository a subject
   filters that Repository's own ledger, and on a Problem it filters the
   cross-Repository directory. */
export function ProblemSourceFacts({
  record,
  locator,
  ledgerHref,
  className,
}: {
  record: ProblemRecord;
  locator?: string | null;
  ledgerHref: (name: string, value: string) => string;
  className?: string;
}) {
  const comments = typeof record.metadata?.comments === "string" ? record.metadata.comments.trim() : "";
  /* A projection row always carries these; a caller composing a partial record
     may not, and a missing list is the same fact as an empty one. */
  const tags = record.tags ?? [];
  const oeis = record.oeis ?? [];
  const sourceIds = record.source_ids ?? [];
  return <>
    <dl className={className ?? "flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-muted-foreground"}>
      <div className="flex items-center gap-1.5">
        <dt className="text-eyebrow">Declared status</dt>
        <dd>
          <Link className="underline underline-offset-2 hover:text-foreground" href={ledgerHref("status", record.declared_status)}>
            {record.declared_status}
          </Link>
        </dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt className="text-eyebrow">Formalization</dt>
        <dd>
          {record.formalized && record.lean_url ? (
            <a className="underline underline-offset-2 hover:text-foreground" href={record.lean_url} rel="noreferrer nofollow" target="_blank">formalized</a>
          ) : record.formalized ? "formalized" : "not formalized"}
        </dd>
      </div>
      {record.prize ? (
        <div className="flex items-center gap-1.5">
          <dt className="text-eyebrow">Prize</dt>
          <dd className="font-mono tabular-nums">{record.prize}</dd>
        </div>
      ) : null}
      {/* The middot trails its fact rather than leading the next one.
          DESIGN.md gives the spaced middot one job — joining inline facts of
          the same kind *on one line* — and a run that wraps has no such line.
          Leading, it arrived at the start of the new line joining nothing and
          reading as a list bullet; trailing, it stays at the end of the line
          it belongs to, where it reads as continuation. There is no CSS
          selector for "first on this line": the usual trick clips a leading
          separator with `overflow:hidden` and a negative margin, and that
          would clip the focus ring off the first link of every wrapped line.

          `gap-y-2`, not the `gap-y-1` its siblings use. These two values wrap
          to five tappable source ids and a dozen subjects, and with no row gap
          at all the wrapped lines sat on a 16px pitch — adjacent tap targets
          touching, on the narrow viewport where the list wraps most. Eight
          pixels puts a 24px pitch between them. The links stay inline runs
          separated by "·", which is what keeps them legible as one value
          rather than a stack of chips. */}
      {tags.length ? (
        <div className="flex items-center gap-1.5">
          <dt className="text-eyebrow">Subjects</dt>
          <dd className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {tags.map((tag, index) => (
              <span key={tag}>
                <Link className="underline underline-offset-2 hover:text-foreground" href={ledgerHref("tag", tag)}>{tag}</Link>
                {index < tags.length - 1 ? <span aria-hidden className="ml-2 text-border">·</span> : null}
              </span>
            ))}
          </dd>
        </div>
      ) : null}
      {oeis.length ? (
        <div className="flex items-center gap-1.5">
          <dt className="text-eyebrow">OEIS</dt>
          <dd className="font-mono">{oeis.join(" · ")}</dd>
        </div>
      ) : null}
      {/* Every binding, not the first one: this problem is where the Lean
          corpora and the contribution wikis meet the source database, and
          a `LIMIT 1` read showed one of up to five. */}
      {sourceIds.length ? (
        <div className="flex items-center gap-1.5">
          <dt className="text-eyebrow">Sources</dt>
          <dd className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {sourceIds.map((sourceId, index) => (
              <span key={sourceId}>
                <Link className="underline underline-offset-2 hover:text-foreground" href={`/sources/${encodeURIComponent(sourceId)}`}>{sourceId}</Link>
                {index < sourceIds.length - 1 ? <span aria-hidden className="ml-2 text-border">·</span> : null}
              </span>
            ))}
          </dd>
        </div>
      ) : null}
      {locator ? (
        <div className="flex items-center gap-1.5">
          <dt className="text-eyebrow">Statement</dt>
          <dd><a className="underline underline-offset-2 hover:text-foreground" href={locator} rel="noreferrer nofollow" target="_blank">{new URL(locator).hostname}</a></dd>
        </div>
      ) : null}
    </dl>
    {/* Retained by the erdos-problems adapter and rendered nowhere until now.
        It is the source's own commentary on the question, which is the closest
        thing an unassessed Problem has to an orientation. */}
    {comments ? <p className="mt-4 max-w-[76ch] text-compact text-muted-foreground">{comments}</p> : null}
  </>;
}
