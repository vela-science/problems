import { readFileSync } from "node:fs";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, useSidebar } from "@vela/ui/components/sidebar";

const navigation = vi.hoisted(() => ({ pathname: "/repositories" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  /* The Problem switcher navigates on select rather than rendering links, so
     the trail now needs a router in this shell. */
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/components/vela/command-palette", () => ({
  COMMAND_PALETTE_TRIGGER_ID: "vela-command-palette-trigger",
  useCommandPalette: () => ({ setOpen: vi.fn() }),
}));
vi.mock("@/components/vela/theme-toggle", () => ({
  ThemeToggle: () => <button type="button" aria-label="Choose appearance" />,
}));
vi.mock("@/components/vela/account-menu", () => ({
  AccountMenu: () => <a href="/sign-in">Sign in</a>,
}));

import { AppHeader } from "@/components/vela/app-header";

const repositories = [{
  slug: "quantum-codes",
  name: "Quantum Codes",
  pending: 0,
  hasGraph: false,
}];
const problemCollections = [{ namespace: "erdos-problems", name: "Erdős Problems" }];

/* The header owns a real SidebarTrigger, so it needs the real provider around
   it. Mocking the trigger away is what let the mobile open-control regress
   unnoticed. */
function Shell() {
  return (
    <SidebarProvider>
      <AppHeader repositories={repositories} problemCollections={problemCollections} />
    </SidebarProvider>
  );
}

afterEach(() => {
  cleanup();
  navigation.pathname = "/repositories";
});

describe("AppHeader trail", () => {
  /* The trail replaced a crumb list. Inside a Repository it reads
     `<switcher> / <Section>`: the container is a control rather than a link,
     because switching Repository used to mean going back to the list and picking
     again, and the section is text rather than a link because it is the page
     you are already on. */
  it("names the current section as text, not a link", () => {
    navigation.pathname = "/repositories/quantum-codes/claims";
    render(<Shell />);

    const section = screen.getByText("Claims");
    expect(section).toHaveAttribute("aria-current", "page");
    expect(section.closest("a")).toBeNull();
  });

  it("offers the Repository as a switcher", () => {
    navigation.pathname = "/repositories/quantum-codes/claims";
    render(<Shell />);

    expect(screen.getByRole("button", { name: /Switch Repository. Currently Quantum Codes/ })).toBeInTheDocument();
  });

  it("shows a global destination without a Repository switcher", () => {
    navigation.pathname = "/decisions";
    render(<Shell />);

    expect(screen.getByText("Decisions")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: /Switch Repository/ })).not.toBeInTheDocument();
  });

  it("names the retained routes by their truthful product surfaces", () => {
    navigation.pathname = "/contribute";
    const { rerender } = render(<Shell />);
    expect(screen.getByText("Add a contribution")).toHaveAttribute("aria-current", "page");

    navigation.pathname = "/updates";
    rerender(<Shell />);
    expect(screen.getByText("Updates")).toHaveAttribute("aria-current", "page");
  });

  it("names public trust routes without a Repository switcher", () => {
    navigation.pathname = "/privacy";
    render(<Shell />);
    expect(screen.getByText("Privacy")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: /Switch Repository/ })).not.toBeInTheDocument();
  });

  it("names a Repository overview without a section", () => {
    navigation.pathname = "/repositories/quantum-codes";
    render(<Shell />);

    expect(screen.getByText("Overview")).toHaveAttribute("aria-current", "page");
  });

  /* The Problem's identity is one control now rather than three crumbs. The
     old trail spelled `Problems / Erdős Problems / Erdős problem 321`, naming
     the collection twice and "problem" three times; the switcher carries the
     collection and the number together and can move between collections. */
  it("keeps a canonical reviewed Problem in the Problem context", () => {
    navigation.pathname = "/problems/erdos-problems/321";
    render(<Shell />);

    const switcher = screen.getByRole("button", { name: /Erdős Problems #321/u });
    expect(switcher).toBeVisible();
    expect(within(switcher).getByText("Erdős Problems")).toBeVisible();
    expect(within(switcher).getByText("#321")).toBeVisible();
  });

  it("names the collection directory between the global entry and its records", () => {
    navigation.pathname = "/problems/erdos-problems";
    render(<Shell />);

    expect(screen.getByRole("link", { name: "Problems" })).toHaveAttribute("href", "/problems");
    expect(screen.getByText("Erdős Problems")).toHaveAttribute("aria-current", "page");
  });

  it("keeps a contributor profile in contextual chrome without adding People navigation", () => {
    navigation.pathname = "/people/ada-lovelace";
    render(<Shell />);

    expect(screen.getByText("Contributor")).not.toHaveAttribute("aria-current");
    expect(screen.getByText("@ada-lovelace")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "People" })).not.toBeInTheDocument();
  });

  it("keeps public profile settings inside Account context", () => {
    navigation.pathname = "/account/profile";
    render(<Shell />);

    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
    expect(screen.getByText("Public profile")).toHaveAttribute("aria-current", "page");
  });

  /* Collapsing the section crumb below `sm` left its separator behind, so a
     Problem or Source page opened with a bare "/" on a phone — the shape of
     1,217 of the 1,253 URLs in the sitemap. A separator is hidden exactly when
     the crumb to its left is. */
  it("hides a separator that would lead the trail on a small viewport", () => {
    /* On a Problem the switcher leads the trail and never collapses, so no
       separator can be orphaned there any more. The concern survives wherever
       a collapsing crumb still leads: the collection directory. */
    navigation.pathname = "/problems/erdos-problems";
    const { rerender } = render(<Shell />);

    const [collapsing] = screen.getAllByText("/");
    expect(screen.getByRole("link", { name: "Problems" }).className).toContain("hidden");
    expect(collapsing!.className).toContain("hidden");
    expect(collapsing!.className).toContain("sm:inline");

    /* Inside a Repository the switcher never collapses, so the separator after
       it has something to separate and must stay. */
    navigation.pathname = "/repositories/quantum-codes/claims";
    rerender(<Shell />);

    const separators = screen.getAllByText("/");
    expect(separators.some((node) => !node.className.includes("hidden"))).toBe(true);
  });

  it("keeps global search, notifications, appearance, and account access in the header", () => {
    render(<Shell />);

    expect(screen.getByRole("button", { name: "Search or navigate problems.science" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose appearance" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("does not duplicate release provenance beneath the breadcrumb", () => {
    render(<Shell />);

    expect(screen.queryByText("Published State")).not.toBeInTheDocument();
    expect(screen.queryByText("Canonical source: Git Repository.")).not.toBeInTheDocument();
  });
});

/* Under `md` the rail is a Sheet that starts closed and the sidebar's own
   trigger rides inside it, so without a header control nothing on screen can
   open navigation: a phone reached Home, Open work, State history, Repositories
   and Sources only through the command palette. These tests pin both halves —
   that the control opens the rail, and that it stays off desktop so the
   sidebar-owned trigger remains the only one there. */
describe("AppHeader navigation access", () => {
  function ReportOpenMobile() {
    const { openMobile } = useSidebar();
    return <output>{openMobile ? "rail open" : "rail closed"}</output>;
  }

  it("opens the rail from the header when the rail is off-screen", async () => {
    const width = window.innerWidth;
    /* `useIsMobile` reads innerWidth, and jsdom defaults to 1024. Without this
       the trigger toggles the desktop rail and the regression passes. */
    window.innerWidth = 390;
    try {
      const user = userEvent.setup();
      render(
        <SidebarProvider>
            <AppHeader repositories={repositories} problemCollections={problemCollections} />
          <ReportOpenMobile />
        </SidebarProvider>,
      );

      expect(screen.getByText("rail closed")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Open navigation" }));
      expect(screen.getByText("rail open")).toBeInTheDocument();
    } finally {
      window.innerWidth = width;
    }
  });

  it("leaves the desktop header to the rail's own trigger", () => {
    const header = readFileSync("src/components/vela/app-header.tsx", "utf8");

    expect(header).toContain('<SidebarTrigger className="size-11 md:hidden"');
  });
});
