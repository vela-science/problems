import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkTabs } from "./link-tabs";

const tabs = [
  { key: "overview", href: "/problems/erdos-problems/321", label: "Overview" },
  { key: "evidence", href: "/problems/erdos-problems/321?view=evidence", label: "Evidence" },
  { key: "history", href: "/problems/erdos-problems/321?view=history", label: "History" },
  { key: "work", href: "/problems/erdos-problems/321?view=work", label: "Work" },
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
    expect(current).toHaveClass("min-h-11", "items-center", "justify-center", "px-2.5", "sm:px-4");
    expect(current.querySelector("[aria-hidden='true']")).toHaveClass("h-0.5", "bg-foreground");
    /* The default view owns the bare URL; every other view carries its own
       address, so each panel is complete HTML somewhere linkable. */
    expect(screen.getByRole("link", { name: "Evidence" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=evidence");
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=history");
    expect(screen.getByRole("link", { name: "Work" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=work");
    expect(screen.getByRole("link", { name: "Work" })).not.toHaveAttribute("aria-current");
  });
});
