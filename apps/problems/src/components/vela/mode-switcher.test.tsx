import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModeSwitcher } from "./mode-switcher";

describe("Problem modes", () => {
  it("makes Current State and Workspace explicit without changing the Problem route", () => {
    render(<ModeSwitcher basePath="/problems/erdos-problems/321" mode="state" />);
    const navigation = screen.getByRole("navigation", { name: "Problem mode" });
    const current = screen.getByRole("link", { name: "Current State" });

    expect(navigation).toHaveClass("border-b");
    expect(navigation).not.toHaveClass("rounded-lg", "bg-muted");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveClass("min-h-11", "items-center", "justify-center");
    expect(current.querySelector("[aria-hidden='true']")).toHaveClass("h-0.5", "bg-foreground");
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("href", "/problems/erdos-problems/321?mode=work");
  });
});
