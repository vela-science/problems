"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";

/* Acting on more than one Problem at a time.
 *
 * The collection holds 1,217 records and offered no way to do anything with two
 * of them. That was the sharpest finding in the power-user pass: a reader who
 * has narrowed to the nine Problems they care about still has to open each one
 * to copy its address.
 *
 * What selection may produce is bounded on purpose. Copying nine roots is nine
 * exact identities on nine lines; it is not a set, a collection, or a claim
 * about the nine together. This plane cannot assert anything and a bulk action
 * is not the place to start — so both actions are transcriptions of what the
 * rows already show, and neither writes.
 *
 * Selection is deliberately not in the URL. A filter is a view worth sharing; a
 * scratch selection is not, and putting it in the address would make the Back
 * button undo ticks one at a time. */

type Selected = { problem: string; path: string; label: string };

type SelectionApi = {
  selected: ReadonlyMap<string, Selected>;
  toggle: (entry: Selected) => void;
  clear: () => void;
};

const SelectionContext = createContext<SelectionApi | null>(null);

export function DirectorySelection({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<ReadonlyMap<string, Selected>>(new Map());
  const toggle = useCallback((entry: Selected) => {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(entry.problem)) next.delete(entry.problem);
      else next.set(entry.problem, entry);
      return next;
    });
  }, []);
  const clear = useCallback(() => setSelected(new Map()), []);
  const api = useMemo(() => ({ selected, toggle, clear }), [selected, toggle, clear]);
  return <SelectionContext.Provider value={api}>{children}</SelectionContext.Provider>;
}

/* A row's tick.
 *
 * `relative z-10` is load-bearing: each row carries one stretched link whose
 * `::after` covers the whole row, so a control painted underneath it is
 * unclickable. Raising the cell is what keeps the tick a tick and the rest of
 * the row a link to the Problem. */
export function SelectProblem({ problem, path, label }: Selected) {
  const api = useContext(SelectionContext);
  if (!api) return null;
  const checked = api.selected.has(problem);
  return (
    <span className="relative z-10 flex items-start pt-0.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`Select ${label}`}
        onClick={() => api.toggle({ problem, path, label })}
        className={`grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors ${
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-foreground"
        }`}
      >
        {checked ? <HugeiconsIcon icon={Tick02Icon} aria-hidden className="size-3" /> : null}
      </button>
    </span>
  );
}

function CopyAction({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* A refused clipboard is the browser's answer, not a product state to
             invent a message for. The button simply does not confirm. */
        }
      }}
    >
      <HugeiconsIcon icon={done ? Tick02Icon : Copy01Icon} aria-hidden className="size-3.5" />
      {done ? "Copied" : label}
    </Button>
  );
}

export function SelectionBar({ collectionName }: { collectionName: string }) {
  const api = useContext(SelectionContext);
  if (!api || api.selected.size === 0) return null;
  const entries = [...api.selected.values()].sort((a, b) => Number(a.problem) - Number(b.problem));
  const addresses = entries.map((entry) => `https://problems.science${entry.path}`).join("\n");
  /* Each line carries the source that owns the question, because a bare number
     means nothing outside this collection. */
  const citations = entries
    .map((entry) => `${collectionName} ${entry.problem} — ${entry.label} — https://problems.science${entry.path}`)
    .join("\n");
  return (
    <div
      role="status"
      className="vela-object-surface mt-4 flex flex-wrap items-center gap-3 border-primary/45 bg-[color-mix(in_oklab,var(--primary)_9%,var(--card))] p-3"
    >
      <span className="text-compact font-medium">
        {entries.length} {entries.length === 1 ? "Problem" : "Problems"} selected
      </span>
      <span aria-hidden className="h-4 w-px bg-border" />
      <div className="flex flex-wrap gap-2">
        <CopyAction label="Copy addresses" text={addresses} />
        <CopyAction label="Copy citations" text={citations} />
      </div>
      <Button type="button" size="sm" variant="ghost" className="ms-auto" onClick={api.clear}>Clear</Button>
    </div>
  );
}
