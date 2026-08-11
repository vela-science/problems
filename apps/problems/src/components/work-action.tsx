"use client";

import type { ReactNode } from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@vela/ui/components/collapsible";
import { cn } from "@vela/ui/lib/utils";

export function WorkAction({ title, description, children, compact = false }: { title: string; description: string; children: ReactNode; compact?: boolean }) {
  /* Composition adapted from Tailwind Plus Application UI disclosure/action
     patterns. Interaction and accessibility remain Base UI Collapsible. */
  return <Collapsible className={cn("group border bg-background", compact ? "px-4 py-3" : "rounded-xl px-5 py-4 shadow-xs")}>
    <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4">
      <span>
        <span className={cn("block", compact ? "font-medium" : "text-subtitle")}>{title}</span>
        <span className="mt-1 block text-meta text-muted-foreground">{description}</span>
      </span>
      <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden className="size-5 shrink-0 transition-transform duration-200 ease-out group-data-open:rotate-180" />
    </CollapsibleTrigger>
    <CollapsibleContent className="overflow-hidden data-open:animate-in data-open:fade-in data-open:slide-in-from-top-1 data-closed:animate-out data-closed:fade-out data-closed:slide-out-to-top-1">
      <div className="pt-5">{children}</div>
    </CollapsibleContent>
  </Collapsible>;
}
