"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vela/ui/components/select";

/* A filter that applies when you change it.
 *
 * The directory submitted as a form: ten controls and a Filter button, so
 * narrowing 1,217 Problems cost a round trip through a control that exists only
 * to say "yes, I meant it". Every reference product in AGENTS.md filters on
 * change, and the audit's power-user pass named the button specifically.
 *
 * The URL stays the state. Changing a select pushes a new address rather than
 * holding a value in memory, so a filtered view is still shareable, still
 * bookmarkable, and still the thing the Back button undoes — which is what the
 * form gave us and what a client-side filter would have quietly taken away.
 *
 * The form around it survives with a `noscript` submit, so the page still
 * filters without JavaScript. */
export function FilterSelect({
  label,
  name,
  value,
  items,
  className,
}: {
  label: string;
  name: string;
  value: string;
  items: Record<string, string>;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className={className}>
      <span className="sr-only">{label}</span>
      <Select
        name={name}
        value={value}
        items={items}
        onValueChange={(next: unknown) => {
          const params = new URLSearchParams(searchParams);
          /* "all" is the absence of a filter, so it leaves rather than being
             written down: a URL that lists every filter it is not applying is
             not a link anyone wants to share. */
          if (typeof next !== "string" || next === "all" || !next) params.delete(name);
          else params.set(name, next);
          /* Paging is a position inside a result set, and changing a filter
             makes a different set. Staying on page 7 of a list that now has
             two pages is how a filter appears to return nothing. */
          params.delete("page");
          const query = params.toString();
          router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }}
      >
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {Object.entries(items).map(([key, itemLabel]) => (
            <SelectItem key={key} value={key}>{itemLabel}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
