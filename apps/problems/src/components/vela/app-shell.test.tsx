import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@vela/ui/components/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarInset: (props: React.ComponentProps<"div">) => <div {...props} />,
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

/* Every authored component, so a cross-cutting policy can be held across all of
   them rather than at the handful of call sites someone remembered. */
function componentSources(directory = "src"): Array<{ path: string; source: string }> {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return componentSources(path);
    if (!/\.tsx?$/u.test(entry.name) || /\.test\./u.test(entry.name)) return [];
    return [{ path, source: readFileSync(path, "utf8") }];
  });
}

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

    /* The skip-link target and the `main` landmark are the same element.
       They were not: `main` was the frame, whose first child is the app bar, so
       the skip link landed the reader before the breadcrumb, command palette,
       notifications, appearance control and Sign in and skipped nothing — and
       a `<header>` nested inside `main` gets no `banner` role, so the product
       had no banner either. One `main`, and it is the content. */
    const main = screen.getByRole("main");
    const target = document.getElementById("main-content");
    expect(target).not.toBeNull();
    expect(target).toHaveAttribute("tabindex", "-1");
    expect(main).toBe(target);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    /* The app bar is a sibling of the content, not inside it. */
    expect(target!.querySelector("header")).toBeNull();
    /* The skip link is the first focusable element and lives inside the shell.
       As a sibling of the shell it sat outside the `aria-hidden` a modal puts
       on the wrapper, so an open command palette leaked one reachable control.
       Inside, it is still first in the document and now covered. */
    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(skip).toHaveAttribute("href", "#main-content");
    expect(skip.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector(".group\\/sidebar-wrapper")?.contains(skip) ?? skip.parentElement !== document.body).toBeTruthy();
    expect(document.querySelector("header")).not.toBeNull();
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

  /* One policy, keyed to the pointer, in one file.
   *
   * It was written three ways — this block, a `pointer-coarse:` utility on the
   * section nav, and sixty-five viewport-width classes across twenty-six files.
   * The width-keyed copy inflated every control in a narrow *mouse* window,
   * which is what wrapped the application bar into three rows and spent 148px
   * of a 390px screen before any content. This test now fails if a second
   * spelling comes back. */
  it("keeps primary controls touch-sized without inflating pointer-dense layouts", () => {
    const globals = readFileSync("src/app/globals.css", "utf8");
    expect(globals).toContain("@media (pointer: coarse)");
    /* 2rem, not 2.75rem: WCAG 2.5.8 (AA) asks 1.5rem, and promoting every
       control to the 2.5.5 (AAA) 2.75rem made a header a row of slabs. Typing
       targets keep a taller floor because a field is never packed against a
       sibling. */
    expect(globals).toContain('[data-slot="tooltip-trigger"] { min-width: 2rem; min-height: 2rem; }');
    expect(globals).toContain('[data-slot="input"], [data-slot="textarea"], [data-slot="command-input"] { min-height: 2.5rem; }');
    expect(globals).toContain(".min-h-6, .min-h-7, .min-h-8, .min-h-9 { min-height: 2rem; }");

    const widthKeyed = /\b(?:max-)?(?:sm|md|lg):?min-[hw]-11\b|\bsize-11 (?:sm|md):|\bh-11 (?:sm|md):|pointer-coarse:/u;
    for (const file of componentSources()) {
      expect(file.source, `${file.path} re-declares the touch target by viewport width`).not.toMatch(widthKeyed);
    }
  });

  /* A positive tabindex pulls an element to the front of the whole document's
     tab order, which is why a single one anywhere breaks focus order
     everywhere. A keyboard pass over eight routes found none; this keeps it
     that way without needing the pass repeated. */
  it("never lifts an element out of the document tab order", () => {
    for (const file of componentSources()) {
      const positive = file.source.match(/tabIndex=\{\s*[1-9]\d*\s*\}|tabindex="[1-9]\d*"/gu);
      expect(positive, `${file.path} sets a positive tabindex`).toBeNull();
    }
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
