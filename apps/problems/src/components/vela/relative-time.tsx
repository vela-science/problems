import { formatAgo, formatDate, machineInstant } from "@/lib/format";

/* Relative on the row, exact on hover and in the DOM.
 *
 * Every product a reader of this one arrives from — GitHub, Hugging Face,
 * entire.io — puts "2d ago" on the row and the timestamp behind it. Vela
 * printed nineteen characters of absolute time on every row of every list
 * sorted by recency, which is the value a reader needs least often and the one
 * hardest to scan down a column.
 *
 * A `<time>` element, so the exact instant stays machine-readable: the
 * projection's own value is in `dateTime`, and the formatted one in `title`. */
export function RelativeTime({ value, className }: { value: string | null; className?: string }) {
  if (!value) return <span className={className}>not recorded</span>;
  return (
    <time dateTime={machineInstant(value)} title={formatDate(value)} className={className}>
      {formatAgo(value)}
    </time>
  );
}
