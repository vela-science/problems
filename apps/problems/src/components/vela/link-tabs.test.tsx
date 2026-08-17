import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkTabs } from "./link-tabs";

const tabs = [
  { key: "overview", href: "/problems/erdos-problems/321", label: "Overview" },
  { key: "sources", href: "/problems/erdos-problems/321?view=sources", label: "Sources" },
  { key: "record", href: "/problems/erdos-problems/321?view=record", label: "Record" },
  { key: "workspace", href: "/problems/erdos-problems/321?view=workspace", label: "Workspace" },
] as const;

describe("Problem views", () => {
  it("addresses every view as a link without changing the Problem route", () => {
    render(<LinkTabs label="Problem views" layoutId="problem-view" tabs={tabs} current="overview" />);
    const navigation = screen.getByRole("navigation", { name: "Problem views" });
    const current = screen.getByRole("link", { name: "Overview" });

    expect(navigation).toHaveClass("border-b");
    expect(navigation).not.toHaveClass("rounded-lg", "bg-muted");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAttribute("href", "/problems/erdos-problems/321");
    expect(current).toHaveClass("min-h-11", "items-center", "justify-center");
    expect(current.querySelector("[aria-hidden='true']")).toHaveClass("h-0.5", "bg-foreground");
    /* The default view owns the bare URL; every other view carries its own
       address, so each panel is complete HTML somewhere linkable. */
    expect(screen.getByRole("link", { name: "Sources" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=sources");
    expect(screen.getByRole("link", { name: "Record" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=record");
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=workspace");
    expect(screen.getByRole("link", { name: "Workspace" })).not.toHaveAttribute("aria-current");
  });
});
