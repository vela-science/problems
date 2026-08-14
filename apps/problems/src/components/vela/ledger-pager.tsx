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
 */
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
        <PaginationItem className="font-mono text-micro tabular-nums text-muted-foreground">
          {page} / {pages}
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
