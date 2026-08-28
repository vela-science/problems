import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, useSidebar } from "@vela/ui/components/sidebar";
import { TooltipProvider } from "@vela/ui/components/tooltip";

const navigation = vi.hoisted(() => ({ pathname: "/problems" }));
const account = vi.hoisted(() => ({ state: { status: "signed_out" } as { status: "signed_out" | "signed_in"; account?: { displayName: string; email: string; initials: string } } }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("@/components/vela/account-state", () => ({ useAccountState: () => account.state }));
vi.mock("next/link", () => ({
  default: ({ href, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} onClick={(event) => { event.preventDefault(); onClick?.(event); }} {...props} />
  ),
}));

import { AppSidebar } from "@/components/vela/app-sidebar";

function MobileState() {
  const { openMobile, setOpenMobile } = useSidebar();
  return <>
    <button type="button" onClick={() => setOpenMobile(true)}>Open test navigation</button>
    <output aria-label="Mobile navigation state">{openMobile ? "open" : "closed"}</output>
  </>;
}

function DesktopState() {
  const { open, toggleSidebar } = useSidebar();
  return <><output aria-label="Desktop sidebar state">{open ? "expanded" : "collapsed"}</output><button type="button" onClick={toggleSidebar}>Toggle desktop test sidebar</button></>;
}

function renderSidebar() {
  return render(
    <TooltipProvider>
      <SidebarProvider>
        <MobileState />
        <AppSidebar problemCollections={[
          { namespace: "erdos-problems", name: "Erdős Problems", identifierKind: "number" },
          { namespace: "formal-conjectures", name: "Formal Conjectures", identifierKind: "slug" },
        ]} />
      </SidebarProvider>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  navigation.pathname = "/problems";
  account.state = { status: "signed_out" };
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
});

describe("AppSidebar", () => {
  it("uses one declared desktop state without a second persistence layer", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    const first = render(<SidebarProvider defaultOpen={false}><DesktopState /></SidebarProvider>);
    expect(screen.getByLabelText("Desktop sidebar state")).toHaveTextContent("collapsed");
    fireEvent.click(screen.getByRole("button", { name: "Toggle desktop test sidebar" }));
    expect(screen.getByLabelText("Desktop sidebar state")).toHaveTextContent("expanded");
    first.unmount();
    render(<SidebarProvider defaultOpen={false}><DesktopState /></SidebarProvider>);
    expect(screen.getByLabelText("Desktop sidebar state")).toHaveTextContent("collapsed");
  });

  it("shows the frozen product spine and no duplicate search, map, or release navigation", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    for (const [label, href] of [["Home", "/"], ["Problems", "/problems"], ["Updates", "/updates"], ["Add contribution", "/contribute"]]) {
      expect(await screen.findByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    /* Frontiers serves a replay fixture with deliberately synthetic
       correction data. A primary destination named for open questions that
       delivers one is the clearest naming break in the product, so it moved
       to About with the rest of the protocol and release detail. The route
       itself stays reachable: it is published. */
    for (const label of ["Search", "Research map", "Release details", "Repositories", "Assertions", "Proposed changes", "Frontiers"]) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
    expect(screen.queryByText("Explore")).not.toBeInTheDocument();
  });

  it("keeps the global product spine on exact Repository routes", async () => {
    navigation.pathname = "/repositories/erdos/claims";
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    expect(await screen.findByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Problems" })).toHaveAttribute("href", "/problems");
    expect(screen.getByRole("link", { name: "Updates" })).toHaveAttribute("href", "/updates");

    /* The spine stays — a Repository is a provenance surface, not one of the
       five primary destinations, so it does not take the rail a Problem takes.
       Its sections are now offered *beneath* the spine rather than not at all:
       eight routes used to be reachable only from the command palette. */
    expect(screen.getByRole("link", { name: "Assertions" })).toHaveAttribute("href", "/repositories/erdos/claims");
    expect(screen.getByRole("link", { name: "Commits" })).toHaveAttribute("href", "/repositories/erdos/commits");
    expect(screen.getByRole("link", { name: "Assertions" })).toHaveAttribute("aria-current", "page");
  });

  it("shows the compact published collections beneath Problems only on that branch", async () => {
    /* The collection index, not a Problem page: inside a Problem the rail
       becomes that Problem's own sections. */
    navigation.pathname = "/problems/erdos-problems";
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    expect(await screen.findByRole("link", { name: "Problems" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Erdős Problems" })).toHaveAttribute("href", "/problems/erdos-problems");
    expect(screen.getByRole("link", { name: "Erdős Problems" })).toHaveAttribute("data-active");
    expect(screen.getByRole("link", { name: "Formal Conjectures" })).toHaveAttribute("href", "/problems/formal-conjectures");
  });

  /* The rail keeps the product spine inside a Problem, and the Problem's own
     header carries its sections.
   *
     The rail used to become the Problem's sections. That made the page name
     the same object three times over — breadcrumb, rail group, hero — and left
     no way to reach another destination without first leaving the object. The
     sections moved to `problem-header`, where a count beside each says where
     the substance is before the reader spends a click on finding out. */
  it("keeps the product spine inside a Problem and carries no section list", async () => {
    navigation.pathname = "/problems/erdos-problems/321";
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    expect(await screen.findByRole("link", { name: "Problems" })).toHaveAttribute("href", "/problems");
    expect(screen.getByRole("link", { name: "Updates" })).toHaveAttribute("href", "/updates");
    for (const label of ["Work", "Results", "Sources", "History", "All problems"]) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
    /* The collection stays one click away, as the open branch under Problems. */
    expect(screen.getByRole("link", { name: "Erdős Problems" })).toHaveAttribute("href", "/problems/erdos-problems");
  });

  it("marks exact pages and closes after navigation", async () => {
    navigation.pathname = "/";
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    expect(await screen.findByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "problems.science home" })).not.toHaveAttribute("aria-current");
    fireEvent.click(screen.getByRole("link", { name: "Updates" }));
    await waitFor(() => expect(screen.getByLabelText("Mobile navigation state")).toHaveTextContent("closed"));
  });

  it("shows Workspaces only for a signed-in account", async () => {
    const signedOut = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));
    expect(screen.queryByRole("link", { name: "Workspaces" })).not.toBeInTheDocument();
    signedOut.unmount();

    account.state = { status: "signed_in", account: { displayName: "Ada", email: "ada@example.test", initials: "AD" } };
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));
    expect(await screen.findByRole("link", { name: "Workspaces" })).toHaveAttribute("href", "/workspaces");
  });

  it("keeps the collapse control beside the logo home affordance", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    renderSidebar();

    const home = await screen.findByRole("link", { name: "problems.science home" });
    const trigger = screen.getByRole("button", { name: "Collapse navigation" });
    expect(home.parentElement).toBe(trigger.parentElement);
    fireEvent.click(trigger);
    expect(screen.queryByRole("link", { name: "problems.science home" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
    expect(screen.getByRole("link", { name: "problems.science home" })).toBeInTheDocument();
  });
});
