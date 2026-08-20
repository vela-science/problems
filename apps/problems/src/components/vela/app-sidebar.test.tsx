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
    for (const label of ["Search", "Research map", "Release details", "Repositories", "Assertions", "Proposed changes"]) {
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

  /* Entire's dominant-object model, which PRODUCT.md names as the reference:
     within an object the rail stops being site navigation and becomes that
     object's sections, so the strip of tabs that used to repeat them under the
     question could go. The way back out has to stay reachable. */
  it("becomes the Problem's own sections inside a Problem", async () => {
    navigation.pathname = "/problems/erdos-problems/321";
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    expect(await screen.findByRole("link", { name: "Overview" })).toHaveAttribute("href", "/problems/erdos-problems/321");
    for (const [label, view] of [["Work", "work"], ["Results", "results"], ["Sources", "sources"], ["History", "history"]]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", `/problems/erdos-problems/321/${view}`);
    }
    expect(screen.getByRole("link", { name: "All problems" })).toHaveAttribute("href", "/problems/erdos-problems");
    expect(screen.queryByRole("link", { name: "Updates" })).not.toBeInTheDocument();
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

  it("shows My work only for a signed-in account", async () => {
    const signedOut = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));
    expect(screen.queryByRole("link", { name: "My work" })).not.toBeInTheDocument();
    signedOut.unmount();

    account.state = { status: "signed_in", account: { displayName: "Ada", email: "ada@example.test", initials: "AD" } };
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));
    expect(await screen.findByRole("link", { name: "My work" })).toHaveAttribute("href", "/my-work");
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
