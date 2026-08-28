import Link from "next/link";
import {
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { Pagination, PaginationContent, PaginationItem } from "@vela/ui/components/pagination";

/* The pager for a server-rendered ledger: each page is a URL a reader can send
 * to a colleague, so both arrows are links and the unavailable end of the range
 * is an empty cell rather than a disabled control. `PaginationPrevious` and
 * `PaginationNext` are not used for the arrows because `PaginationLink` renders
 * a bare anchor, which would cost these routes client routing and prefetch.
 *
 * The middle cell carries page numbers, not just a readout. The Erdős
 * directory runs to 26 pages, and with two arrows the only way to reach page 14
 * was thirteen round trips through the server. First, last and the current
 * neighbourhood are enough to land anywhere in two clicks, and the gaps say
 * "…" rather than pretending the range is contiguous. Below `sm` there is not
 * room for a row of numbers, so the readout it replaces stays there.
 */

/* First page, last page, and the current one with a neighbour either side.
   Duplicates collapse through the set, so the ends of the range do not render
   a number twice, and a gap appears only where one or more pages are skipped. */
function pageWindow(page: number, pages: number): Array<number | "gap"> {
  const shown = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((value) => value >= 1 && value <= pages)
    .sort((left, right) => left - right);
  return shown.flatMap((value, index) =>
    index && value - shown[index - 1] > 1 ? ["gap" as const, value] : [value]);
}
export function LedgerPager({
  page,
  pages,
  hrefFor,
  label,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  label: string;
}) {
  if (pages <= 1) return null;
  return (
    <Pagination className="mt-5" aria-label={label}>
      <PaginationContent className="w-full justify-between">
        <PaginationItem>
          {page > 1 ? (
            <Button nativeButton={false} variant="outline" render={<Link href={hrefFor(page - 1)} />}>
              <HugeiconsIcon icon={ChevronLeft} aria-hidden />
              Previous
            </Button>
          ) : (
            <span />
          )}
        </PaginationItem>
        <PaginationItem className="font-mono text-micro tabular-nums text-muted-foreground sm:hidden">
          {page} / {pages}
        </PaginationItem>
        <PaginationItem className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, pages).map((entry, index) => entry === "gap"
            ? <span key={`gap:${index}`} aria-hidden className="px-1 text-micro text-muted-foreground">&hellip;</span>
            : entry === page
              ? <span
                  key={entry}
                  aria-current="page"
                  className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md bg-muted px-2 font-mono text-micro tabular-nums font-medium text-foreground"
                >{entry}</span>
              : <Button
                  key={entry}
                  nativeButton={false}
                  variant="ghost"
                  size="sm"
                  className="min-h-8 min-w-8 px-2 font-mono text-micro tabular-nums"
                  render={<Link href={hrefFor(entry)} aria-label={`Page ${entry} of ${pages}`} />}
                >{entry}</Button>)}
        </PaginationItem>
        <PaginationItem>
          {page < pages ? (
            <Button nativeButton={false} variant="outline" render={<Link href={hrefFor(page + 1)} />}>
              Next
              <HugeiconsIcon icon={ChevronRight} aria-hidden />
            </Button>
          ) : (
            <span />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
