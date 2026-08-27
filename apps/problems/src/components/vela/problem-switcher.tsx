"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@vela/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@vela/ui/components/popover";
import type { PublishedProblemCollection } from "@/lib/problem-collections";

/* The Problem's identity as one control rather than three crumbs.
 *
 * The trail used to spell `Problems / Erdős Problems / Erdős problem 94`,
 * which names the collection twice and the word "problem" three times, and
 * offers nothing to do. Entire and Vercel both group the object's identity
 * into a single control and leave only the open section outside it, so the
 * crumb that is a page reads as a page and the crumb that is a place reads as
 * a place you can move between.
 *
 * Typing a number jumps to that Problem in the current collection, which is
 * how these are addressed. Anything else filters the collections, and the
 * command palette stays the way to search Problems by their text. */
export function ProblemSwitcher({
  collectionName,
  collectionHref,
  label,
  collections,
  namespace,
}: {
  collectionName: string;
  collectionHref: string;
  /* The Problem's compact identity — `#94`, or a slug where the collection
     addresses its Problems by name. */
  label: string;
  collections: PublishedProblemCollection[];
  namespace: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const go = (href: string) => { setOpen(false); setQuery(""); router.push(href); };
  const jump = query.trim();
  const numeric = /^[1-9][0-9]*$/u.test(jump) ? jump : null;

  return (
    <Popover open={open} onOpenChange={(next: boolean) => { setOpen(next); if (!next) setQuery(""); }}>
      <PopoverTrigger
        className="flex min-h-8 min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-body hover:bg-accent hover:text-foreground data-[popup-open]:bg-accent"
        aria-label={`${collectionName} ${label}. Switch Problem or collection`}
      >
        <span className="hidden min-w-0 shrink truncate text-muted-foreground sm:inline">{collectionName}</span>
        <span aria-hidden className="hidden text-muted-foreground/50 sm:inline">/</span>
        <span className="min-w-0 truncate font-mono text-label text-foreground">{label}</span>
        <HugeiconsIcon icon={UnfoldMoreIcon} aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter={!numeric}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={`Go to a problem number, or a collection`}
          />
          <CommandList>
            <CommandEmpty>Nothing matches that.</CommandEmpty>
            {numeric ? (
              <CommandGroup heading={collectionName}>
                <CommandItem value={`go-${numeric}`} onSelect={() => go(`/problems/${namespace}/${numeric}`)}>
                  Go to <span className="font-mono">#{numeric}</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup heading="Collections">
              <CommandItem value={collectionName} onSelect={() => go(collectionHref)}>
                All of {collectionName}
              </CommandItem>
              {collections
                .filter((collection) => collection.namespace !== namespace)
                .map((collection) => (
                  <CommandItem
                    key={collection.namespace}
                    value={collection.name}
                    onSelect={() => go(`/problems/${collection.namespace}`)}
                  >
                    {collection.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
