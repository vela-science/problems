import type { ReactNode } from "react";
import { cn } from "@vela/ui/lib/utils";

/* Native `<details>`, deliberately, not Base UI's `Collapsible`.
 *
 * Base UI keeps closed content out of the DOM, and a root a reader cannot find
 * with the browser's own find-in-page is not disclosed, it is deleted. Native
 * disclosures also survive without JavaScript and print open. That argument is
 * `decision-boundary.tsx`'s and it holds for every disclosure on the site.
 *
 * What was not shared was the chrome. Suppressing the default triangle takes
 * three separate incantations — `list-none` for the list-item display,
 * `marker:content-none` for the pseudo-element, and the WebKit-specific
 * `::-webkit-details-marker` — and the tree carried them in different
 * combinations, so some disclosures showed a browser triangle and some did
 * not. They live here once, with the chevron that replaces them. */
const SUMMARY = "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden";

export function Disclosure({
  summary,
  meta,
  chevron = true,
  className,
  summaryClassName,
  children,
  ...props
}: {
  summary: ReactNode;
  /* Right-aligned material that stays readable while the body is closed. */
  meta?: ReactNode;
  chevron?: boolean;
  summaryClassName?: string;
  children: ReactNode;
} & Omit<React.ComponentProps<"details">, "children" | "title">) {
  return (
    <details data-slot="disclosure" {...props} className={cn("group", className)}>
      <summary data-slot="disclosure-summary" className={cn(SUMMARY, summaryClassName)}>
        <span className="flex min-w-0 items-center gap-2">
          {chevron ? (
            <span data-slot="disclosure-chevron" aria-hidden className="inline-block shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-90">
              ›
            </span>
          ) : null}
          {summary}
        </span>
        {meta ? <span className="shrink-0 text-meta font-normal text-muted-foreground">{meta}</span> : null}
      </summary>
      {children}
    </details>
  );
}
