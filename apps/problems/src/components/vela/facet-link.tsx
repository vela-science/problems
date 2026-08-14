import Link from "next/link";
import { queryHref } from "@/lib/query-state";

/* An attribute that takes you to the rest of its kind.
 *
 * A record page listed its attributes as plain text, so reading that a Claim is
 * `theoretical` was the end of the thought — finding the other 2,738 meant
 * going back to the ledger and rebuilding the filter by hand. Every one of
 * these values is already a parameter the ledger accepts, so the value can be
 * the link and no new query work exists.
 *
 * This is the pattern Hugging Face uses on a model card, where the task,
 * library, and licence under the title are each a link into the catalogue
 * filtered by them; it is what makes a record page a place to leave from rather
 * than a leaf.
 *
 * Deliberately not a Badge. A badge in this product names a state axis, and
 * these are attributes — an assertion kind is not a standing. */
export function FacetLink({
  base,
  param,
  value,
  children,
}: {
  /** The collection this attribute filters, e.g. `/repositories/erdos/claims`. */
  base: string;
  param: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={queryHref(base, new URLSearchParams(), { [param]: value })}
      className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
    >
      {children ?? value.replaceAll("_", " ")}
    </Link>
  );
}
