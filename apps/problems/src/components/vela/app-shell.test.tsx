import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@vela/ui/components/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarInset: (props: React.ComponentProps<"main">) => <main {...props} />,
}));
vi.mock("@vela/ui/components/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/vela/app-sidebar", () => ({ AppSidebar: () => <nav /> }));
vi.mock("@/components/vela/app-header", () => ({ AppHeader: () => <header /> }));
vi.mock("@/components/vela/command-palette", () => ({
  CommandPaletteProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/vela/record-preview", () => ({
  ProjectionRootProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AppShell } from "@/components/vela/app-shell";

describe("AppShell accessibility boundary", () => {
  it("keeps the responsive sidebar independent of Problem query state", () => {
    const shell = readFileSync("src/components/vela/app-shell.tsx", "utf8");
    const sidebar = readFileSync("src/components/vela/app-sidebar.tsx", "utf8");

    expect(shell).not.toContain("<Suspense");
    expect(sidebar).not.toContain("<Suspense");
    expect(sidebar).not.toContain("useSearchParams()");
    expect(sidebar).not.toContain("ProblemDestinationGroups");
    expect(sidebar).toContain('label: "Home"');
    expect(sidebar).toContain('label: "Problems"');
    expect(sidebar).toContain('label: "Updates"');
  });

  it("gives the skip-link target a proven programmatic focus destination", () => {
    render(
      <AppShell
        publishedRepositories={[]}
        problemCollections={[{ namespace: "erdos-problems", name: "Erdős Problems" }]}
        projectionRoot={`sha256:${"a".repeat(64)}`}
        searchRoot={`sha256:${"b".repeat(64)}`}
        collectionRoot={`sha256:${"c".repeat(64)}`}
        authEnabled={false}
      >
        <p>Published state</p>
      </AppShell>,
    );

    /* The target is the content, not the frame around it. `#main-content` sat
       on the `main` element, whose first child is the app bar — so the skip
       link landed the reader before the breadcrumb, command palette,
       notifications, appearance control and Sign in, and skipped nothing. */
    const main = screen.getByRole("main");
    const target = document.getElementById("main-content");
    expect(target).not.toBeNull();
    expect(target).toHaveAttribute("tabindex", "-1");
    expect(main).not.toHaveAttribute("id", "main-content");
    expect(main.contains(target)).toBe(true);
    expect(target!.querySelector("header")).toBeNull();
    expect(target).toHaveTextContent("Published state");
    target!.focus();
    expect(target).toHaveFocus();
    expect(target).not.toHaveClass("overflow-hidden");
  });

  it("lets the canonical provider own sidebar state, geometry, and shortcut", () => {
    const shell = readFileSync("src/components/vela/app-shell.tsx", "utf8");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const globals = readFileSync("src/app/globals.css", "utf8");
    expect(shell).toContain("<SidebarProvider");
    expect(shell).toContain("defaultOpen");
    expect(shell).not.toContain("useState(");
    expect(shell).not.toContain("useEffect(");
    expect(shell).not.toContain("matchMedia(");
    expect(shell).not.toContain("open={sidebarOpen}");
    expect(shell).not.toContain("onOpenChange={setSidebarOpen}");
    expect(shell).not.toContain("dataset.sidebarState");
    expect(layout).not.toContain("sidebarScript");
    expect(layout).not.toContain('from "next/headers"');
    expect(layout).not.toContain("sidebar_state");
    const primitive = readFileSync("../../packages/ui/src/components/ui/sidebar.tsx", "utf8");
    expect(primitive).not.toContain("document.cookie");
    expect(primitive).not.toContain("React.useLayoutEffect");
    expect(globals).not.toContain('html[data-sidebar-state="collapsed"]');
  });

  it("keeps primary controls touch-sized without inflating pointer-dense layouts", () => {
    const globals = readFileSync("src/app/globals.css", "utf8");
    expect(globals).toContain("@media (pointer: coarse)");
    expect(globals).toContain('[data-slot="button"] { min-width: 2.75rem; min-height: 2.75rem; }');
    expect(globals).toContain('[data-slot="input"], [data-slot="select-trigger"] { min-height: 2.75rem; }');
  });

  it("uses the shared compact hero for collection, record, and Repository openers", () => {
    for (const path of ["page-intro.tsx", "record-header.tsx", "repository-context.tsx"]) {
      const source = readFileSync(`src/components/vela/${path}`, "utf8");
      expect(source).toMatch(/<PageHero density="compact"(?:\s|>)/u);
      expect(source).not.toContain('<header className="border-b');
    }
    /* One, since `RecordSkeleton` was deleted with no consumer. The count is
       here so a skeleton cannot quietly stop using the shared hero; it tracks
       how many skeletons open with one, not a fixed number. */
    const skeleton = readFileSync("src/components/vela/route-skeleton.tsx", "utf8");
    expect(skeleton.match(/<PageHero density="compact">/gu)).toHaveLength(1);
    expect(skeleton).not.toContain('className="border-b pb-');
  });
});
