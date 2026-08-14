import { CopyButton } from "@vela/ui/vela/copy-button";
import { cn } from "@vela/ui/lib/utils";

/* A 64-hex digest rendered in full, first, at row width is not disclosure —
 * it is the widest and least readable thing on the row, and on a 375px viewport
 * it is silently clipped, which loses the value entirely.
 *
 * So: a short prefix for reference, the full value one action away. This is
 * what `apps/problems/DESIGN.md` already asks for ("Exact roots remain one
 * disclosure away"), and it is what every mature system does — Git shows 7
 * characters, Stripe and AWS truncate and keep a copy control.
 *
 * ROOTS.md rule 2 governs the split: short handles route, the full typed root
 * is what any comparison uses. Nothing here is ever compared. */

export function RecordId({
  value,
  prefix = 12,
  copy = true,
  label,
  className,
}: {
  value: string;
  /** Characters kept after the handle prefix. Enough to be unambiguous in a page. */
  prefix?: number;
  copy?: boolean;
  /** What this identifier names, when a page carries several. */
  label?: string;
  className?: string;
}) {
  const handle = value.match(/^([a-z]+_|sha256:)/u)?.[0] ?? "";
  const body = value.slice(handle.length);
  const short = body.length > prefix ? `${body.slice(0, prefix)}…` : body;
  /* The value was emitted three times per identifier: as `title`, as the
     screen-reader completion, and inside the copy control's accessible name.
     The completion is the one that earns its place — it keeps the exact value
     in the accessibility tree and in selected text. `title` restated it as a
     tooltip no one can read 64 hex characters out of, and the copy control's
     name restated it again, so a Record page announced five controls whose
     names differed only somewhere past their fortieth character. */
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className="font-mono text-micro text-muted-foreground">
        <span className="sr-only">{value}</span>
        <span aria-hidden>{handle}{short}</span>
      </span>
      {copy ? <CopyButton compact value={value} label={`Copy ${label ?? `${handle}${short}`}`} /> : null}
    </span>
  );
}
