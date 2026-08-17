"use client";

import type { CSSProperties } from "react";
import { SidebarInset, SidebarProvider } from "@vela/ui/components/sidebar";
import { TooltipProvider } from "@vela/ui/components/tooltip";
import { AppSidebar } from "@/components/vela/app-sidebar";
import { AppHeader } from "@/components/vela/app-header";
import { CommandPaletteProvider } from "@/components/vela/command-palette";
import { ProjectionRootProvider } from "@/components/vela/record-preview";
import { SiteFooter } from "@/components/vela/site-footer";
import { AccountStateProvider } from "@/components/vela/account-state";
import type { PublishedProblemCollection } from "@/lib/problem-collections";

type PublishedRepository = { slug: string; name: string; pending: number; hasGraph: boolean; hasProblems: boolean };

export function AppShell({
  children,
  publishedRepositories,
  problemCollections,
  projectionRoot,
  activationTime,
  confirmedAt,
  authEnabled,
}: {
  children: React.ReactNode;
  publishedRepositories: PublishedRepository[];
  problemCollections: PublishedProblemCollection[];
  projectionRoot: string;
  activationTime: string;
  confirmedAt?: string | null;
  authEnabled: boolean;
}) {
  return (
    <TooltipProvider delay={800}>
      <AccountStateProvider enabled={authEnabled}>
       <ProjectionRootProvider root={projectionRoot}>
        <CommandPaletteProvider repositories={publishedRepositories} problemCollections={problemCollections} projectionRoot={projectionRoot}>
          <SidebarProvider
            defaultOpen
            className="h-svh min-w-0 overflow-y-hidden print:block print:h-auto print:overflow-visible print:bg-background"
            style={{ "--sidebar-width": "14rem", "--sidebar-width-icon": "3rem" } as CSSProperties}
          >
            <AppSidebar
              repositories={publishedRepositories}
              projectionRoot={projectionRoot}
              activationTime={activationTime}
              confirmedAt={confirmedAt}
            />
            <SidebarInset
              id="main-content"
              tabIndex={-1}
              className="min-w-0 md:shadow-[0_12px_40px_-28px_color-mix(in_oklab,var(--foreground)_38%,transparent)] print:m-0 print:overflow-visible print:rounded-none"
            >
              <AppHeader
                repositories={publishedRepositories}
                problemCollections={problemCollections}
              />
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain print:h-auto print:overflow-visible">
                {children}
                <SiteFooter />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </CommandPaletteProvider>
      </ProjectionRootProvider>
      </AccountStateProvider>
    </TooltipProvider>
  );
}
