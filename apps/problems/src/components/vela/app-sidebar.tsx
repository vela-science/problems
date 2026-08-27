"use client";

import { useSyncExternalStore, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
/* One glyph per destination, and no glyph used twice: Overview and Problems
   were both an open book, and Claims wore the same database mark as the global
   Sources list, so the rail read as three pairs of the same place. */
import {
  Activity01Icon,
  BookOpen01Icon,
  Clock01Icon,
  FileCheckIcon,
  Home01Icon,
  InboxUploadIcon,
  PuzzleIcon,
  SourceCodeIcon,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@vela/ui/components/sidebar";
import { BrandMark as VelaMark } from "@vela/ui/vela/brand-mark";
import { useAccountState } from "@/components/vela/account-state";
import { recentObjectsServerSnapshot, recentObjectsSnapshot, subscribeRecentObjects } from "@/lib/recent-objects";
import type { PublishedProblemCollection } from "@/lib/problem-collections";

type SidebarDestination = {
  href: string;
  label: string;
  icon: ComponentProps<typeof HugeiconsIcon>["icon"];
  exact?: boolean;
};

/* The rail moves between objects; the Problem's own header moves between its
   sections.
 *
 * The rail used to carry the five Problem sections, on the reading that inside
 * a dominant object the rail becomes that object's navigation. In practice the
 * page then named the same object three times — breadcrumb, rail group, and
 * the hero above the content — and the section list was the copy a reader had
 * just used to arrive. GitHub and Hugging Face both settle this the other way:
 * object identity and its sections live in one header, and the rail is for
 * getting to a different object. The sections now live in `problem-header`,
 * where their counts can say where the substance is before the click.
 *
 * What the rail gains instead is the list of objects recently opened, which is
 * the cross-object move it could not previously make without going back out
 * through the collection index. */

/* A Repository's own sections, shown *under* the product spine rather than in
   place of it. The cluster had no navigation of any kind — its layout is a
   context provider, and `graph/page.tsx` still asserts a "repository tab bar"
   that has never existed — so eight routes were reachable only from the command
   palette. Additive, because `app-sidebar.test.tsx` fixes the deliberate rule
   that a Repository keeps the global spine: it is a provenance surface, not one
   of the five primary destinations in PRODUCT.md. */
const REPOSITORY_SECTIONS: Array<{ key: string; label: string; icon: SidebarDestination["icon"] }> = [
  { key: "", label: "Overview", icon: BookOpen01Icon },
  /* Not "Problems": the spine above already has a link by that name pointing at
     the whole product. This is the Repository's own ledger, which is what its
     page calls it. */
  { key: "problems", label: "Problem ledger", icon: PuzzleIcon },
  { key: "claims", label: "Assertions", icon: FileCheckIcon },
  { key: "proposals", label: "Proposed changes", icon: WorkIcon },
  { key: "commits", label: "Commits", icon: Clock01Icon },
  { key: "reproduce", label: "Reproduce", icon: SourceCodeIcon },
];

/* `/repositories/<slug>` plus one optional section segment. A deeper path — a
   Claim or Proposal record — keeps the group and marks no section, because it
   sits under a section rather than beside one. */
function repositoryRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts[0] !== "repositories") return null;
  return { slug: parts[1]!, href: `/repositories/${parts[1]}`, section: parts[2] ?? "" };
}

/* Frontiers is not in the spine.
 *
 * The route serves a Protocol-1 reference demonstration: two authority
 * histories replayed from frozen Git bundles, with the correction and
 * downstream work deliberately synthetic. That is a real and useful protocol
 * artefact, and "Frontiers" is a word scientists read as open questions, so a
 * primary destination promised a register of unsolved problems and delivered a
 * fixture. PRODUCT.md puts release and protocol detail under About rather than
 * in task navigation. The address stays live and reachable — it is published,
 * and durable URLs do not get to break for a navigation change. */
const PRIMARY_DESTINATIONS: SidebarDestination[] = [
  { href: "/", label: "Home", icon: Home01Icon, exact: true },
  { href: "/problems", label: "Problems", icon: PuzzleIcon },
  { href: "/updates", label: "Updates", icon: Activity01Icon },
];

export function AppSidebar({ problemCollections = [{ namespace: "erdos-problems", name: "Erdős Problems", identifierKind: "number" }] }: { problemCollections?: PublishedProblemCollection[] }) {
  const pathname = usePathname();
  const accountState = useAccountState();
  const repository = repositoryRoute(pathname);
  /* localStorage, so the server renders the group empty and the client fills
     it in. That is also exactly what a reader who has opened nothing sees. */
  const recent = useSyncExternalStore(subscribeRecentObjects, recentObjectsSnapshot, recentObjectsServerSnapshot).slice(0, 5);
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const collapsedDesktop = !isMobile && state === "collapsed";
  const closeMobileNavigation = () => setOpenMobile(false);
  const destinations: SidebarDestination[] = PRIMARY_DESTINATIONS.flatMap((destination) => (
    accountState.status === "signed_in" && destination.href === "/updates"
      ? [{ href: "/my-work", label: "My work", icon: WorkIcon }, destination]
      : [destination]
  ));

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
              aria-label="problems.science home"
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
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {destinations.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
                const current = pathname === href;
                return <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    className="h-11 md:h-8"
                    tooltip={label}
                    isActive={active}
                    render={<Link href={href} aria-current={current ? "page" : undefined} onClick={closeMobileNavigation} />}
                  >
                    <HugeiconsIcon icon={Icon} aria-hidden />
                    <span>{label}</span>
                  </SidebarMenuButton>
                  {href === "/problems" && pathname.startsWith("/problems") ? <SidebarMenuSub>
                    {problemCollections.map((collection) => <SidebarMenuSubItem key={collection.namespace}>
                      <SidebarMenuSubButton
                        className="h-10 md:h-7"
                        isActive={pathname === `/problems/${collection.namespace}` || pathname.startsWith(`/problems/${collection.namespace}/`)}
                        render={<Link href={`/problems/${collection.namespace}`} onClick={closeMobileNavigation} />}
                      >
                        <span>{collection.name}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>)}
                  </SidebarMenuSub> : null}
                </SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {recent.length ? <SidebarGroup className="border-t border-sidebar-border py-1">
          <SidebarGroupLabel>Recently opened</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recent.map((object) => <SidebarMenuItem key={object.href}>
                <SidebarMenuButton
                  className="h-11 md:h-8"
                  tooltip={object.context ? `${object.title} · ${object.context}` : object.title}
                  isActive={pathname === object.href}
                  render={<Link href={object.href} onClick={closeMobileNavigation} />}
                >
                  <HugeiconsIcon icon={PuzzleIcon} aria-hidden />
                  <span className="truncate">{object.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> : null}

        {repository ? <SidebarGroup className="border-t border-sidebar-border py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {REPOSITORY_SECTIONS.map(({ key, label, icon: Icon }) => {
                const href = key ? `${repository.href}/${key}` : repository.href;
                const active = repository.section === key;
                return <SidebarMenuItem key={key || "overview"}>
                  <SidebarMenuButton
                    className="h-11 md:h-8"
                    tooltip={`${repository.slug} · ${label}`}
                    isActive={active}
                    render={<Link href={href} aria-current={active ? "page" : undefined} onClick={closeMobileNavigation} />}
                  >
                    <HugeiconsIcon icon={Icon} aria-hidden />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> : null}

        <SidebarGroup className="mt-auto border-t border-sidebar-border py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-11 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground md:h-9"
                  tooltip="Add contribution"
                  isActive={pathname === "/contribute"}
                  render={<Link href="/contribute" aria-current={pathname === "/contribute" ? "page" : undefined} onClick={closeMobileNavigation} />}
                >
                  <HugeiconsIcon icon={InboxUploadIcon} aria-hidden />
                  <span>Add contribution</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarRail />

    </Sidebar>
  );
}
