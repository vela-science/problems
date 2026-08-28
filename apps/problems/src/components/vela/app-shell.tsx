"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { SidebarInset, SidebarProvider } from "@vela/ui/components/sidebar";
import { TooltipProvider } from "@vela/ui/components/tooltip";
import { AppSidebar } from "@/components/vela/app-sidebar";
import { AppHeader } from "@/components/vela/app-header";
import { CommandPaletteProvider } from "@/components/vela/command-palette";
import { ProjectionRootProvider } from "@/components/vela/record-preview";
import { AccountStateProvider } from "@/components/vela/account-state";
import { INFORMATION_ROUTES } from "@/components/vela/public-information-page";
import type { PublishedProblemCollection } from "@/lib/problem-collections";

type PublishedRepository = { slug: string; name: string; pending: number; hasGraph: boolean };

export function AppShell({
  children,
  publishedRepositories,
  problemCollections,
  projectionRoot,
  searchRoot,
  collectionRoot,
  authEnabled,
}: {
  children: React.ReactNode;
  publishedRepositories: PublishedRepository[];
  problemCollections: PublishedProblemCollection[];
  projectionRoot: string;
  searchRoot: string;
  collectionRoot: string;
  authEnabled: boolean;
}) {
  return (
    <TooltipProvider delay={800}>
      <AccountStateProvider enabled={authEnabled}>
       <ProjectionRootProvider root={projectionRoot} searchRoot={searchRoot} collectionRoot={collectionRoot}>
        <CommandPaletteProvider repositories={publishedRepositories} problemCollections={problemCollections} projectionRoot={projectionRoot} searchRoot={searchRoot} collectionRoot={collectionRoot}>
          <SidebarProvider
            defaultOpen
            className="h-svh min-w-0 overflow-y-hidden print:block print:h-auto print:overflow-visible print:bg-background"
            style={{ "--sidebar-width": "12.5rem", "--sidebar-width-icon": "3rem" } as CSSProperties}
          >
            {/* Inside the shell, not beside it.
              *
                It lived in `layout.tsx` as a sibling of this wrapper, and when
                a modal opens Base UI marks the wrapper `aria-hidden`. The skip
                link was outside that, so while the command palette was open a
                screen reader could still reach "Skip to content" — one control
                leaking out of a modal that otherwise contains everything. It is
                still the first focusable element in the document, because this
                is the first thing the shell renders. */}
            <a
              href="#main-content"
              className="sr-only z-100 bg-background px-4 py-3 text-body focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
              Skip to content
            </a>
            <AppSidebar problemCollections={problemCollections} />
            <SidebarInset
              className="min-w-0 md:shadow-[0_12px_40px_-28px_color-mix(in_oklab,var(--foreground)_38%,transparent)] print:m-0 print:overflow-visible print:rounded-none"
            >
              <AppHeader
                repositories={publishedRepositories}
                problemCollections={problemCollections}
              />
              {/* The skip link targets the content, not the frame around it.
                  `#main-content` was on `SidebarInset`, whose first child is
                  the app bar — so "Skip to content" landed the reader *before*
                  the breadcrumb, command palette, notifications, appearance
                  control and Sign in. It skipped nothing.

                  This is also the `main` landmark. It used to sit on the frame,
                  which put the app bar inside `main`, suppressed the `banner`
                  role on `AppHeader`'s own `<header>`, and left this region —
                  the thing every route actually renders into — unnamed. Two
                  facts, one element: what the skip link targets and what `main`
                  means are the same region. */}
              {/* The scroller is the frame; `main` and the policy footer are
                  siblings inside it.
                *
                  The links used to sit in the navigation rail, pinned under the
                  nav items, because that was the only chrome on every route and
                  a signed-out visitor otherwise had no visible path to Privacy
                  or Terms at all — ⌘K does not exist on a phone. But a rail is
                  for navigating the product, and four legal links at the bottom
                  of it read as leftovers.
                *
                  They belong at the end of the page, which is where a reader
                  looks for them. Keeping them a sibling of `main` rather than
                  inside it is what preserves the `contentinfo` landmark: a
                  `footer` scoped to `main` is a generic element, and this is
                  the product's only one. */}
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain print:h-auto print:overflow-visible">
                <main id="main-content" tabIndex={-1} className="min-w-0">
                  {children}
                </main>
                <footer
                  aria-label="Policies"
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-(--vela-page-gutter) py-4 text-micro print:hidden"
                >
                  {INFORMATION_ROUTES.map((route) => <Link
                    key={route.href}
                    href={route.href}
                    className="inline-flex min-h-6 items-center rounded text-muted-foreground hover:text-foreground hover:underline"
                  >{route.label}</Link>)}
                </footer>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </CommandPaletteProvider>
      </ProjectionRootProvider>
      </AccountStateProvider>
    </TooltipProvider>
  );
}
