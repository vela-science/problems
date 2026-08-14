"use client";

import { Kbd, KbdGroup } from "@vela/ui/components/kbd";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@vela/ui/components/sheet";

/* The release destinations a `g` prefix reaches, and the single place their
   keys are declared. The handler in `command-palette.tsx` maps from here, so a
   key that opens this sheet and a key that navigates cannot disagree — the
   usual failure of a hand-maintained help panel. */
export const JUMP_DESTINATIONS = [
  { key: "h", href: "/", label: "Home" },
  { key: "p", href: "/problems", label: "Problems" },
  { key: "w", href: "/work", label: "Contribute" },
  { key: "u", href: "/hubs", label: "Hubs" },
  { key: "a", href: "/activity", label: "State history" },
  { key: "r", href: "/repositories", label: "Repositories" },
  { key: "s", href: "/sources", label: "Sources" },
] as const;

const SEARCH_KEYS = [
  { keys: ["⌘", "K"], label: "Open search and jump" },
  { keys: ["/"], label: "Open search and jump" },
  { keys: ["?"], label: "Show these shortcuts" },
] as const;

function Row({ keys, label }: { keys: readonly string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="min-w-0 text-compact">{label}</span>
      <KbdGroup className="shrink-0">
        {keys.map((key) => <Kbd key={key}>{key}</Kbd>)}
      </KbdGroup>
    </div>
  );
}

export function KeyboardShortcuts({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Keyboard shortcuts</SheetTitle>
          <SheetDescription>
            Navigation never changes scientific state. Mutations remain inside
            an authorized Problem workspace.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6">
          <h3 className="mt-2 text-eyebrow uppercase text-muted-foreground">Anywhere</h3>
          <div className="divide-y">
            {SEARCH_KEYS.map((entry) => <Row key={entry.label + entry.keys.join()} {...entry} />)}
          </div>

          <h3 className="mt-6 text-eyebrow uppercase text-muted-foreground">Go to</h3>
          <div className="divide-y">
            {JUMP_DESTINATIONS.map((entry) => (
              <Row key={entry.key} keys={["g", entry.key]} label={entry.label} />
            ))}
          </div>

          <p className="mt-6 text-micro text-muted-foreground">
            A shortcut never fires while you are typing in a field, so a
            &ldquo;g&rdquo; in a search query stays a letter.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
