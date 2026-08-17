import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("keeps one compact trust landmark without repeating task navigation", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Product information" })).toBeVisible();
    for (const [name, href] of [
      ["About", "/about"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Accessibility", "/accessibility"],
      ["Contact", "/contact"],
    ] as const) expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);

    for (const name of [
      "Home", "Problems", "Updates", "Search", "Add a contribution",
      "Repositories", "Sources", "Relationship graph", "Deployment manifest",
      "Decisions", "Proposed changes", "Hubs",
    ]) expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
  });
});
