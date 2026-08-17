import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SidebarProvider,
  useSidebar,
} from "@vela/ui/components/sidebar";
import { TooltipProvider } from "@vela/ui/components/tooltip";

const navigation = vi.hoisted(() => ({ pathname: "/problems", search: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.search,
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    />
  ),
}));

import { AppSidebar } from "@/components/vela/app-sidebar";

function MobileState() {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <>
      <button type="button" onClick={() => setOpenMobile(true)}>Open test navigation</button>
      <output aria-label="Mobile navigation state">{openMobile ? "open" : "closed"}</output>
    </>
  );
}

function DesktopState() {
  const { open, toggleSidebar } = useSidebar();
  return <><output aria-label="Desktop sidebar state">{open ? "expanded" : "collapsed"}</output><button type="button" onClick={toggleSidebar}>Toggle desktop test sidebar</button></>;
}

function renderSidebar(confirmedAt?: string | null) {
  return render(
    <TooltipProvider>
      <SidebarProvider>
        <MobileState />
        <AppSidebar
          repositories={[{ slug: "erdos", name: "Erdős formalization fidelity", hasProblems: true }]}
          projectionRoot="sha256:test-release-root"
          activationTime="2026-08-07T17:56:54.000Z"
          confirmedAt={confirmedAt}
        />
      </SidebarProvider>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  navigation.pathname = "/problems";
  navigation.search = new URLSearchParams();
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 390,
  });
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
});

describe("AppSidebar mobile navigation", () => {
  it("uses one declared initial state and toggles without a second persistence layer", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    const first = render(<SidebarProvider defaultOpen={false}><DesktopState /></SidebarProvider>);
    expect(screen.getByLabelText("Desktop sidebar state")).toHaveTextContent("collapsed");
    fireEvent.click(screen.getByRole("button", { name: "Toggle desktop test sidebar" }));
    expect(screen.getByLabelText("Desktop sidebar state")).toHaveTextContent("expanded");
    first.unmount();

    render(<SidebarProvider defaultOpen={false}><DesktopState /></SidebarProvider>);
    expect(screen.getByLabelText("Desktop sidebar state")).toHaveTextContent("collapsed");
  });

  it("exposes the exact current route to assistive technology", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    expect(await screen.findByRole("link", { name: "Problems" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("provides an explicit close control", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));
    expect(screen.getByLabelText("Mobile navigation state")).toHaveTextContent("open");
    expect(await screen.findByRole("navigation", { name: "Vela navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Problems" })).toHaveClass("h-11", "md:h-8");

    fireEvent.click(await screen.findByRole("button", { name: "Close navigation" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Mobile navigation state")).toHaveTextContent("closed");
    });
  });

  it("keeps the desktop collapse control beside the Vela home affordance", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    renderSidebar();

    const home = await screen.findByRole("link", { name: "Vela" });
    const trigger = screen.getByRole("button", { name: "Collapse navigation" });
    expect(home.parentElement).toBe(trigger.parentElement);
    expect(screen.queryByText("Vela")).not.toBeInTheDocument();
    expect(home.querySelector("svg")).toHaveStyle({ width: "22px", height: "22px" });

    fireEvent.click(trigger);
    expect(screen.queryByRole("link", { name: "Vela" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse navigation" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
    expect(screen.getByRole("link", { name: "Vela" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse navigation" })).toBeInTheDocument();
  });

  it("closes after an internal navigation link is activated", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));
    expect(screen.getByLabelText("Mobile navigation state")).toHaveTextContent("open");

    fireEvent.click(await screen.findByRole("link", { name: "Updates" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Mobile navigation state")).toHaveTextContent("closed");
    });
  });

  /* The sidebar is contextual, so a name means one scope and one scope only.
     Outside a Repository every release-wide destination is listed and points at
     its release-wide route; the three that also exist inside a Repository are
     grouped under a heading that says which scope this one is. */
  it("lists every release-wide destination outside a Repository", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    for (const [label, href] of [
      ["Home", "/"],
      ["Problems", "/problems"],
      ["Updates", "/activity"],
      ["Search", "/search"],
    ]) {
      expect(await screen.findByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    expect(screen.getByText("Explore")).toBeInTheDocument();
    /* Repositories, Sources, and the other record routes keep their pages
       but reach the reader through contextual links, search, and the footer
       map rather than the spine. */
    expect(screen.queryByRole("link", { name: "Repositories" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sources" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Contribute" })).not.toBeInTheDocument();
  });

  /* A Repository's own sections stay out. "Claims" here would have meant
     something different from "Claims" inside a Repository, with nothing saying
     which, and no grouping label rescues a name that means two scopes. */
  it("keeps Repository-only sections out of the release rail", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    await screen.findByRole("link", { name: "Problems" });
    for (const section of ["Assertions", "Reproduce", "Overview", "Graph", "Proposed changes"]) {
      expect(screen.queryByRole("link", { name: section })).not.toBeInTheDocument();
    }
  });

  it("becomes the Repository's own sections inside one", async () => {
    navigation.pathname = "/repositories/erdos/claims";
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    expect(await screen.findByRole("link", { name: "Assertions" })).toHaveAttribute(
      "href",
      "/repositories/erdos/claims",
    );
    expect(screen.getByRole("link", { name: "Assertions" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Proposed changes" })).toHaveAttribute(
      "href",
      "/repositories/erdos/proposals",
    );
    expect(screen.getByRole("link", { name: "Contribution handoff" })).toHaveAttribute(
      "href",
      "/repositories/erdos/contribute",
    );
    expect(screen.queryByRole("link", { name: "Sources" })).not.toBeInTheDocument();
    expect(screen.getByText("Exact State records")).toBeInTheDocument();
    expect(screen.getByText("Contribution")).toBeInTheDocument();
    expect(screen.getByText("Repository provenance")).toBeInTheDocument();
  });

  it("keeps the global product map visible inside a legacy Problem route", async () => {
    navigation.pathname = "/p/erdos/321";
    navigation.search = new URLSearchParams("mode=work");
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    expect(await screen.findByRole("link", { name: "Problems" })).toHaveAttribute("href", "/problems");
    expect(screen.getByRole("link", { name: "Updates" })).toHaveAttribute("href", "/activity");
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/search");
    expect(screen.queryByRole("link", { name: "Current State" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Workspace" })).not.toBeInTheDocument();
  });

  it("keeps the global product map visible inside a canonical Problem route", async () => {
    navigation.pathname = "/problems/erdos-problems/321";
    navigation.search = new URLSearchParams("mode=work");
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    expect(await screen.findByRole("link", { name: "Problems" })).toHaveAttribute("href", "/problems");
    expect(screen.getByRole("link", { name: "Updates" })).toHaveAttribute("href", "/activity");
    expect(screen.queryByRole("link", { name: "Repositories" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Current State" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Workspace" })).not.toBeInTheDocument();
  });

  it("keeps the exact release reachable from every route", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    /* The footer draws the root through RecordId, which carries the handle and
       the full value, so the link is found by the exact root it names rather
       than by a truncated fragment of it. */
    expect(await screen.findByRole("link", { name: /sha256:test-release-root/u })).toHaveAttribute(
      "href",
      "/.well-known/vela-site.json",
    );
  });

  /* What replaced the green dot. Two things are asserted because both were
     wrong about the dot: that the stamp comes from the manifest rather than
     from a constant, and that it renders in UTC — this is a client component,
     so a locale-formatted instant would differ between the server's HTML and
     the browser's and hydration would paper over it. */
  it("stamps the activation instant the manifest reports, in UTC", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    const stamp = await screen.findByText("Activated 2026-08-07 17:56 UTC");
    expect(stamp).toHaveAttribute("datetime", "2026-08-07T17:56:54.000Z");
  });

  /* Confirmation wins when there is one, and it is a different question.
     "Activated" stops moving when the sources go quiet, so on its own it cannot
     distinguish a month of nothing-to-do from a month of broken refreshes.
     Whichever is shown, only one instant appears — two would ask the reader to
     work out which of them means "is this current". */
  it("prefers the confirmation instant, because that is the one that keeps moving", async () => {
    renderSidebar("2026-09-14T04:02:11.000Z");
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    const stamp = await screen.findByText("Confirmed 2026-09-14 04:02 UTC");
    expect(stamp).toHaveAttribute("datetime", "2026-09-14T04:02:11.000Z");
    expect(screen.queryByText(/^Activated /u)).toBeNull();
  });

  /* Null until the first refresh after the column was added. The row that
     existed then was confirmed at an instant nobody recorded. */
  it("falls back to activation when nothing has confirmed the release yet", async () => {
    renderSidebar(null);
    fireEvent.click(screen.getByRole("button", { name: "Open test navigation" }));

    expect(await screen.findByText("Activated 2026-08-07 17:56 UTC")).toBeInTheDocument();
    expect(screen.queryByText(/^Confirmed /u)).toBeNull();
  });
});
