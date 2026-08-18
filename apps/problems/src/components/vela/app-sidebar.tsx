"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
/* One glyph per destination, and no glyph used twice: Overview and Problems
   were both an open book, and Claims wore the same database mark as the global
   Sources list, so the rail read as three pairs of the same place. */
import {
  Activity01Icon,
  Home01Icon,
  InboxUploadIcon,
  PuzzleIcon,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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

type SidebarDestination = {
  href: string;
  label: string;
  icon: ComponentProps<typeof HugeiconsIcon>["icon"];
  exact?: boolean;
};

const PRIMARY_DESTINATIONS: SidebarDestination[] = [
  { href: "/", label: "Home", icon: Home01Icon, exact: true },
  { href: "/problems", label: "Problems", icon: PuzzleIcon },
  { href: "/activity", label: "Updates", icon: Activity01Icon },
];

export function AppSidebar() {
  const pathname = usePathname();
  const accountState = useAccountState();
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const collapsedDesktop = !isMobile && state === "collapsed";
  const closeMobileNavigation = () => setOpenMobile(false);
  const destinations: SidebarDestination[] = PRIMARY_DESTINATIONS.flatMap((destination) => (
    accountState.status === "signed_in" && destination.href === "/activity"
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
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        className="h-10 md:h-7"
                        isActive={pathname === "/problems/erdos-problems" || pathname.startsWith("/problems/erdos-problems/")}
                        render={<Link href="/problems/erdos-problems" onClick={closeMobileNavigation} />}
                      >
                        <span>Erdős Problems</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub> : null}
                </SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
