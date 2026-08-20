import type { ReactNode } from "react";
import Link from "next/link";
import type { ProblemRecord } from "@vela/projection-data";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";

/* The statement is the row. It was `Erdős problem 404` — the builder's label,
 * printed directly under the same number in mono — above three counts whose
 * minimum equalled their maximum across all 1,217 rows.
 *
 * The eyebrow says `declared`, because the source's word for a problem's state
 * is not a Vela Claim standing and the row must not be readable as one. Every
 * one of these Claims is accepted and none carries a Verification, so a state
 * glyph would be the same mark 1,217 times.
 *
 * The whole row is one link, by the stretched-link overlay from Tailwind Plus
 * Application UI v4 `lists/stacked-lists/03-with-links`: the anchor's `::after`
 * covers the positioned `Item`, so the statement can be the only link while the
 * tag and formalization links stay clickable above it. Nothing is nested inside
 * anything else, which is what the previous pair of per-row ghost buttons cost. */

/* Most Problems have no retained statement, and the row is one stretched link
 * whose only content is that statement — so 46 of 50 rows on this ledger were
 * a link with no text at all: visually blank, and announced to a screen reader
 * as its own URL (WCAG 2.4.4). The detail page and the canonical `/problems`
 * list both already fall back to the number; only this ledger did not. The
 * fallback stays a fallback — where a Source permits the statement, the
 * statement is still the row. */
function rowTitle(problem: ProblemRecord): string {
  return decodeHtmlEntities(problem.statement ?? "").trim() || `Problem ${problem.problem}`;
}

export function ProblemList({
  problems,
  slug,
  tagHref,
}: {
  problems: ProblemRecord[];
  slug: string;
  tagHref: (tag: string) => string;
}) {
  return (
    <ItemGroup className="divide-y">
      {problems.map((problem) => {
        const facts: Array<{ key: string; node: ReactNode }> = problem.tags.slice(0, 3).map((tag) => ({
          key: `tag:${tag}`,
          /* Above the overlay, so a subject narrows the ledger instead of
             opening the problem underneath it. */
          /* Fourteen pixels tall, sitting on top of a link that covers the
             whole row: a thumb that missed the subject opened the Problem
             instead of narrowing to the subject, which is the one place on
             this page where a near miss does something other than nothing.
             `min-h-6` is the target, not the text — the type size, the colour
             and the "·" runs between them are unchanged, and the tags are
             already far wider than they are tall. */
          node: (
            <Link className="relative z-10 inline-flex min-h-6 items-center underline-offset-2 hover:text-foreground hover:underline" href={tagHref(tag)}>
              {tag}
            </Link>
          ),
        }));
        if (problem.oeis.length) facts.push({ key: "oeis", node: <span className="font-mono">{problem.oeis.join(" · ")}</span> });
        if (problem.source_count > 1) facts.push({ key: "sources", node: <>{problem.source_count} sources</> });
        return (
          <Item key={problem.node_id} className="relative items-start rounded-none px-0 py-4">
            <ItemContent>
              <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-eyebrow text-muted-foreground">
                    <span className={problem.declared_status === "open" ? "text-foreground" : undefined}>
                      declared {problem.declared_status}
                    </span>
                    {problem.formalized ? (
                      <>
                        {" · "}
                        {problem.lean_url ? (
                          <a
                            className="relative z-10 underline underline-offset-2 hover:text-foreground"
                            href={problem.lean_url}
                            rel="noreferrer nofollow"
                            target="_blank"
                          >
                            formalized
                          </a>
                        ) : (
                          "formalized"
                        )}
                      </>
                    ) : null}
                    {problem.prize ? ` · ${problem.prize}` : null}
                  </span>
                </span>
                <span className="font-mono text-micro tabular-nums text-muted-foreground">{problem.node_id}</span>
              </div>
              <ItemTitle className="mt-1 line-clamp-2 block w-full text-body">
                <Link className="after:absolute after:inset-0" href={`/repositories/${slug}/problems/${problem.problem}`}>
                  <ScientificText text={rowTitle(problem)} />
                </Link>
              </ItemTitle>
              {/* `gap-y-1`: seventeen of fifty of these lines wrap, and with no
                  row gap at all the wrapped lines sat on a 14px pitch — two
                  rows of targets touching.

                  `gap-x-3` is also the separator, and there are no middot
                  glyphs left to misplace. As characters they failed twice:
                  leading, they opened a wrapped line; trailing, `items-center`
                  centred one against the three-line OEIS run so it landed
                  beside the middle line, and even bundled inline a separator
                  could still take the break and sit alone at the start of the
                  next line. These are flex items, and a gap is what separates
                  flex items; a middot joins inline facts of one kind on one
                  line, which this row is not. */}
              {facts.length ? (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-muted-foreground">
                  {facts.map((fact) => <span key={fact.key}>{fact.node}</span>)}
                </div>
              ) : null}
            </ItemContent>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
