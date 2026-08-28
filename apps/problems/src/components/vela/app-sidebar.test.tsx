import { readFileSync } from "node:fs";
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
  /* The rail navigates the product and nothing else.
   *
     Four legal links and a filled contribution button used to sit under the nav
     items, because the rail was the only chrome on every route. They read as
     leftovers there. The policy links moved to the end of the page, which is
     where a reader looks for them, and this holds the rail to navigation so
     they cannot drift back. */
  it("keeps the rail to navigation, with no policy strip or contribution slab", () => {
    const source = readFileSync("src/components/vela/app-sidebar.tsx", "utf8");
    expect(source).not.toContain('aria-label="Policies"');
    expect(source).not.toContain("Add contribution");
    expect(source).not.toContain("INFORMATION_ROUTES");
  });

  /* The policy links are the product's only `contentinfo`. They are a sibling
     of `main`, not inside it: a `footer` scoped to `main` is a generic element
     and the landmark would disappear silently. */
  it("carries the policy links as the contentinfo landmark on the shell", () => {
    const source = readFileSync("src/components/vela/app-shell.tsx", "utf8");
    expect(source).toContain('<footer\n                  aria-label="Policies"');
    expect(source).toContain("INFORMATION_ROUTES.map");
    /* Inside the scroller, after `main`, and `main` must close first. */
    expect(source.indexOf("</main>")).toBeLessThan(source.indexOf('aria-label="Policies"'));
  });

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

    for (const [label, href] of [["Home", "/"], ["Problems", "/problems"], ["Updates", "/updates"]]) {
      expect(await screen.findByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    /* Frontiers serves a replay fixture with deliberately synthetic
       correction data. A primary destination named for open questions that
       delivers one is the clearest naming break in the product, so it moved
       to About with the rest of the protocol and release detail. The route
       itself stays reachable: it is published. */
    for (const label of ["Search", "Research map", "Release details", "Repositories", "Claims", "Proposed changes", "Frontiers"]) {
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

    /* The rail carries the spine and nothing else. A Repository's sections
       moved to the Repository's own header, which is the rule a Problem
       already followed — two object types had two navigation models and a
       reader had nothing to predict from. The rail moves between objects; an
       object's header moves between its sections. */
    for (const section of ["Claims", "Commits", "Problem ledger", "Proposed changes", "Reproduce"]) {
      expect(screen.queryByRole("link", { name: section })).not.toBeInTheDocument();
    }
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
