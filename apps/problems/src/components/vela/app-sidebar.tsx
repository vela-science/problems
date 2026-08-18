"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
/* One glyph per destination, and no glyph used twice: Overview and Problems
   were both an open book, and Claims wore the same database mark as the global
   Sources list, so the rail read as three pairs of the same place. */
import {
  Compass01Icon,
  Activity01Icon,
  GitCommitIcon,
  InboxUploadIcon,
  Search01Icon,
  Note04Icon,
  PuzzleIcon,
  Refresh01Icon,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@vela/ui/components/sidebar";
import { RecordId } from "@/components/vela/record-id";
import { BrandMark as VelaMark } from "@vela/ui/vela/brand-mark";
import { useAccountState } from "@/components/vela/account-state";

export type SidebarRepository = {
  slug: string;
  name: string;
  hasProblems: boolean;
};

type SidebarDestination = {
  href: string;
  label: string;
  icon: ComponentProps<typeof HugeiconsIcon>["icon"];
  exact?: boolean;
  selected?: boolean;
};
type SidebarDestinationGroup = { label?: string; items: SidebarDestination[] };

/* One contextual navigation system: the public product spine at the top
 * level, and Repository-owned sections inside a Repository. The spine
 * carries the two public nouns and their pulse — Problems, Updates, Search —
 * per PRODUCT.md's model. Repositories, Sources, Decisions, Proposals,
 * Hubs, and Graph keep their durable routes, reached through contextual
 * links, search, shortcuts, and the command palette rather than competing
 * here. */
function releaseDestinations(signedIn: boolean): SidebarDestinationGroup[] { return [
  {
    label: "Explore",
    items: [
      { href: "/problems", label: "Problems", icon: PuzzleIcon },
      { href: "/graph", label: "Research map", icon: GitCommitIcon },
      { href: "/activity", label: "Updates", icon: Activity01Icon },
      ...(signedIn ? [{ href: "/my-work", label: "My work", icon: WorkIcon }] : []),
      { href: "/search", label: "Search", icon: Search01Icon },
    ],
  },
] }

function repositorySections(repository: SidebarRepository): SidebarDestinationGroup[] {
  const base = `/repositories/${repository.slug}`;
  return [
    {
      label: undefined,
      items: [{ href: base, label: "Overview", icon: Compass01Icon, exact: true }],
    },
    {
      label: "Exact State records",
      items: [
        { href: `${base}/claims`, label: "Assertions", icon: Note04Icon },
        ...(repository.hasProblems
          ? [{ href: `${base}/problems`, label: "Problems", icon: PuzzleIcon }]
          : []),
      ],
    },
    {
      label: "Contribution",
      items: [
        { href: `${base}/contribute`, label: "Contribution handoff", icon: WorkIcon },
        { href: `${base}/proposals`, label: "Proposed changes", icon: InboxUploadIcon },
      ],
    },
    {
      label: "Repository provenance",
      items: [
        /* A Repository IS a Git repository, so its history belongs under the axis
           that asks whether the repository is what it says it is — beside
           Reproduce, not beside the scientific collections. */
        { href: `${base}/commits`, label: "Commits", icon: GitCommitIcon },
        { href: `${base}/reproduce`, label: "Reproduce", icon: Refresh01Icon },
      ],
    },
  ];
}

/* An instant this sidebar can render identically on both sides of hydration:
   ISO 8601 in UTC, minute precision, with the `T` and the offset dropped so it
   reads as a stamp rather than as a machine value. The machine value is on the
   `dateTime` attribute, where it belongs. An unparseable instant renders as
   nothing rather than as "Invalid Date". */
function activatedAt(value: string): string | null {
  const activated = new Date(value);
  if (Number.isNaN(activated.getTime())) return null;
  return `${activated.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function DestinationGroups({
  destinations,
  pathname,
  closeMobileNavigation,
}: {
  destinations: SidebarDestinationGroup[];
  pathname: string;
  closeMobileNavigation: () => void;
}) {
  return destinations.map((group) => (
    <SidebarGroup key={group.items[0]?.href ?? group.label} className="py-1">
      {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map(({ href, label, icon: Icon, exact, selected }) => {
            const hrefPath = href.split("?")[0];
            const active = typeof selected === "boolean"
              ? selected
              : exact ? pathname === hrefPath : pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
            const current = active && pathname === hrefPath;
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  className="h-11 md:h-8"
                  tooltip={label}
                  isActive={active}
                  render={<Link href={href} aria-current={current ? "page" : undefined} onClick={closeMobileNavigation} />}
                >
                  <HugeiconsIcon icon={Icon} aria-hidden />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}

export function AppSidebar({
  repositories,
  projectionRoot,
  activationTime,
  confirmedAt,
}: {
  repositories: SidebarRepository[];
  projectionRoot: string;
  activationTime: string;
  confirmedAt?: string | null;
}) {
  const pathname = usePathname();
  const accountState = useAccountState();
  const activatedLabel = activatedAt(activationTime);
  /* Two different facts, and the second is the one a reader is actually asking
     about. "Activated" is when this release first went live and stops moving the
     moment the sources go quiet; "confirmed" is when a refresh last re-derived
     it and agreed, which keeps moving for as long as the pipeline is alive.
     Showing only the first makes a dead pipeline look like a quiet month. */
  const confirmedLabel = confirmedAt ? activatedAt(confirmedAt) : null;
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const collapsedDesktop = !isMobile && state === "collapsed";
  /* Inside a Repository the sidebar is that Repository's; everywhere else it is the
     release's. One list is visible at a time, so no label ever means two
     different scopes on the same screen. */
  const repository = repositories.find(({ slug }) =>
    pathname === `/repositories/${slug}` || pathname.startsWith(`/repositories/${slug}/`));
  const destinations = repository ? repositorySections(repository) : releaseDestinations(accountState.status === "signed_in");
  const closeMobileNavigation = () => setOpenMobile(false);

  return (
    <Sidebar
      role={isMobile ? undefined : "navigation"}
      aria-label={isMobile ? undefined : "Vela navigation"}
      variant="inset"
      collapsible="icon"
      className="print:hidden"
    >
      <SidebarHeader className="h-12 justify-center">
        <div className="flex items-center justify-between gap-1">
          {/* The mark alone, no wordmark. Its own padding matches a menu
              button's, so the glyph sits on the same vertical line as every
              nav icon below it rather than inset by a wider brand block. */}
          {collapsedDesktop ? (
            <button
              type="button"
              aria-label="Expand navigation"
              onClick={toggleSidebar}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md p-1 hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <VelaMark profile="micro" size={22} />
            </button>
          ) : (
            <Link
              href="/"
              aria-label="Vela"
              onClick={closeMobileNavigation}
              /* Same box as a menu button, so the glyph sits on the icon
                 column every row below it uses. */
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md p-1 hover:bg-sidebar-accent md:size-8"
            >
              <VelaMark profile="micro" size={22} />
            </Link>
          )}
          {collapsedDesktop ? null : (
            <SidebarTrigger
              className="ml-auto size-11 shrink-0 md:size-8"
              aria-label={isMobile ? "Close navigation" : "Collapse navigation"}
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent
        role={isMobile ? "navigation" : undefined}
        aria-label={isMobile ? "Vela navigation" : undefined}
      >
        {/* Keyed on the first destination, not on the label. Two groups in the
            release rail are deliberately unlabelled, and `label ?? "primary"`
            gave both of them the same key. */}
        <DestinationGroups destinations={destinations} pathname={pathname} closeMobileNavigation={closeMobileNavigation} />
      </SidebarContent>

      {/* The exact release, anchored bottom-left the way a status bar anchors
          the build it is showing. Everything above is a view of this digest, so
          it stays reachable from every route rather than from an About page.

          A green dot sat to the left of the root until 2026-08-07. It took no
          input: a literal `bg-status-progress`, the token every other surface
          in this app binds to an accepted Standing or a reached rung. So it was
          green through the hours the endpoint it links to was answering 503,
          and it would have been green if every Repository in the release had
          failed strict. A signal with no input is worse than no signal, and a
          health verdict on a scientific corpus is not this page's to give.

          The activation instant is the fact this status strip actually holds, and it
          answers the one thing a build stamp is read for: how old this is. UTC,
          because this is a client component and a locale-formatted date would
          differ between the server's HTML and the browser's. */}
      <SidebarFooter className="p-2">
        <a
          href="/.well-known/vela-site.json"
          title={projectionRoot}
          className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-micro text-muted-foreground group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-foreground"
        >
          {/* The typed root, not a bare fragment of it. This was
              `projectionRoot.slice(7, 17)`, which hardcoded the length of
              `sha256:` and dropped the handle — ROOTS.md rule 2 is that the
              handle is what says which kind of root you are looking at, and
              ten hex characters without it say nothing. */}
          <span className="min-w-0 truncate">
            <RecordId value={projectionRoot} prefix={10} copy={false} />
          </span>
          {confirmedLabel ? (
            <time dateTime={confirmedAt ?? undefined} className="tabular-nums">
              Confirmed {confirmedLabel}
            </time>
          ) : activatedLabel ? (
            <time dateTime={activationTime} className="tabular-nums">
              Activated {activatedLabel}
            </time>
          ) : null}
        </a>
      </SidebarFooter>

      <SidebarRail />

    </Sidebar>
  );
}
