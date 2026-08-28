"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@vela/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@vela/ui/components/popover";

/* The handoffs that were two clicks away, in the header where the object is.
 *
 * `DESIGN.md` asks for "Start work and Open source at the right when space
 * permits", and only Start work was there. Continue locally — the exact
 * Workbench v1 handoff — existed but lived inside the Work view, so a reader
 * who wanted to take the Problem into their own tools first had to enter a
 * surface they were not going to use.
 *
 * Start work stays a plain link rather than becoming a menu item: it is the
 * primary path and should not cost a click to reach. The disclosure beside it
 * carries the exits.
 *
 * Provider-neutral by construction. There is no "open in <vendor>" entry here:
 * `AGENTS.md` requires external session references stay provider-neutral and
 * forbids vendor-specific runtime code without a separate product decision. The
 * Workbench handoff names a Problem, a source revision and an authority
 * Repository, and nothing about who executes.
 *
 * Both entries fail closed. `problemWorkbenchHandoff` returns null unless every
 * required public field resolves, and a Problem with no retained locator has no
 * source to open — in either case the entry is absent rather than dead. */
export function StartWorkMenu({ workbenchHandoff, sourceLocator }: {
  workbenchHandoff: string | null;
  sourceLocator: string | null;
}) {
  const exits = [
    workbenchHandoff ? {
      href: workbenchHandoff,
      label: "Continue locally",
      detail: "Opens this exact Problem, source revision and authority Repository in Workbench. Nothing is cloned, uploaded or executed.",
    } : null,
    sourceLocator ? {
      href: sourceLocator,
      label: "Open source",
      detail: "The upstream record this Problem was observed from.",
    } : null,
  ].filter((exit) => exit !== null);

  if (!exits.length) return null;

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="sm" aria-label="Other ways to work on this Problem" />}
      >
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1">
        <p className="px-2 pb-1 pt-2 text-meta text-muted-foreground">
          Work happens in your own tools. This page keeps the exact identity.
        </p>
        <ul>
          {exits.map((exit) => <li key={exit.label}>
            <a
              href={exit.href}
              className="block rounded-md px-2 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
            >
              <span className="block text-compact font-medium">{exit.label}</span>
              <span className="mt-0.5 block text-meta leading-5 text-muted-foreground">{exit.detail}</span>
            </a>
          </li>)}
        </ul>
        <p className="px-2 pb-2 pt-1 text-micro text-muted-foreground">
          The Work view at <span className="font-medium text-foreground">Start work</span> keeps approaches,
          evidence and an unsigned draft.
        </p>
      </PopoverContent>
    </Popover>
  );
}
