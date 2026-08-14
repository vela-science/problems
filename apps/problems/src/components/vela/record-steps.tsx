import Link from "next/link";
import { ArrowLeft01Icon as Left, ArrowRight01Icon as Right } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { ButtonGroup } from "@vela/ui/components/button-group";

/* Step to the record beside this one.
 *
 * A Repository holds 2,782 Claims and a record page offered no way to reach its
 * neighbour: you went back to the ledger, found your place, and clicked the
 * next row. entire.io puts these chevrons inside the breadcrumb so a reader can
 * walk a repository's records without leaving them, and it is the single thing
 * that turns a record page from a leaf into somewhere you read *from*.
 *
 * Adaptation of Tailwind Plus Application UI v4
 * `elements/button-groups/02-icon-only`: the joined pair with `sr-only` labels
 * and a shared border between them. Its `-ml-px` seam, gray ring and Heroicons
 * are dropped for `ButtonGroup`, the installed shadcn primitive that does the
 * joining, and Hugeicons. Recorded in docs/editorial-references.md.
 *
 * The order is the ledger's default, not the page's — a reader who arrived via
 * a filtered view steps through the unfiltered corpus, which is the honest
 * behaviour when the record page carries no filter state of its own.
 *
 * An absent neighbour renders as a disabled control rather than vanishing, so
 * the pair does not reflow at the two ends of 2,782 records. */
export function RecordSteps({
  previous,
  next,
  hrefFor,
  label,
}: {
  previous: { id: string; assertion: string } | null;
  next: { id: string; assertion: string } | null;
  hrefFor: (id: string) => string;
  /** Names what is being stepped through, for a reader who cannot see the pair. */
  label: string;
}) {
  if (!previous && !next) return null;
  return (
    <ButtonGroup aria-label={`${label} navigation`} className="shrink-0">
      {previous ? (
        <Button
          nativeButton={false}
          variant="outline"
          size="icon-sm"
          render={<Link href={hrefFor(previous.id)} rel="prev" />}
          aria-label={`Previous ${label}: ${previous.assertion.slice(0, 80)}`}
        >
          <HugeiconsIcon icon={Left} aria-hidden />
        </Button>
      ) : (
        <Button variant="outline" size="icon-sm" disabled aria-label={`No previous ${label}`}>
          <HugeiconsIcon icon={Left} aria-hidden />
        </Button>
      )}
      {next ? (
        <Button
          nativeButton={false}
          variant="outline"
          size="icon-sm"
          render={<Link href={hrefFor(next.id)} rel="next" />}
          aria-label={`Next ${label}: ${next.assertion.slice(0, 80)}`}
        >
          <HugeiconsIcon icon={Right} aria-hidden />
        </Button>
      ) : (
        <Button variant="outline" size="icon-sm" disabled aria-label={`No next ${label}`}>
          <HugeiconsIcon icon={Right} aria-hidden />
        </Button>
      )}
    </ButtonGroup>
  );
}
