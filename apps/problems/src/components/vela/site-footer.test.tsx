import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("links product trust surfaces without promoting record types to global destinations", () => {
    render(<SiteFooter />);
    for (const [name, href] of [
      ["How it works", "/about"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Accessibility", "/accessibility"],
      ["Contact", "/contact"],
    ] as const) expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);

    expect(screen.queryByRole("link", { name: "Decisions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Proposed changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Hubs" })).not.toBeInTheDocument();
    expect(screen.getByText(/source-owned Problems and Repository-local scientific state/iu)).toBeVisible();
  });
});
