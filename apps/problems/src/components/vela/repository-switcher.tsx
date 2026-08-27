"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@vela/ui/components/dropdown-menu";

/* The container half of the header trail: `erdos ⌄ / Claims`.
 *
 * A breadcrumb whose first crumb is only a link makes you go back to the list
 * and pick again to change Repository. Making it a switcher turns the trail into
 * a control — the same move GitHub makes with its repository picker and
 * entire.io with its project chevron — so moving between Repositories is one
 * click from anywhere inside one. */

export type SwitchableRepository = {
  slug: string;
  name: string;
};

/* The section is preserved across a switch so one Repository's Claims opens the
   other's Claims rather than its Overview. */
export function switchDestination(repository: SwitchableRepository, section: string | null) {
  const base = `/repositories/${repository.slug}`;
  if (!section) return base;
  return `${base}/${section}`;
}

export function RepositorySwitcher({
  current,
  repositories,
  section,
}: {
  current: SwitchableRepository;
  repositories: SwitchableRepository[];
  /* The current section key, or null on an Overview or an unknown segment. */
  section: string | null;
}) {
  const others = repositories.filter((repository) => repository.slug !== current.slug);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex min-h-11 min-w-0 items-center gap-1 rounded px-1 text-body hover:bg-accent hover:text-foreground md:min-h-8"
        aria-label={`Switch Repository. Currently ${current.name}`}
      >
        <span className="min-w-0 truncate">{current.name}</span>
        <HugeiconsIcon icon={UnfoldMoreIcon} aria-hidden className="size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {others.map((repository) => (
          <DropdownMenuItem
            key={repository.slug}
            render={<Link href={switchDestination(repository, section)} />}
          >
            {repository.name}
          </DropdownMenuItem>
        ))}
        {others.length ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem render={<Link href="/repositories" />}>All Repositories</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
