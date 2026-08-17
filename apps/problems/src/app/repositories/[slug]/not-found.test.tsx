import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RepositoryNotFound from "./not-found";
import { RepositoryRouteScope } from "./repository-route-scope";

describe("Repository not-found boundary", () => {
  it("adapts the missing route scope into the existing recovery composition", () => {
    render(<RepositoryRouteScope slug="not-published"><RepositoryNotFound /></RepositoryRouteScope>);

    expect(screen.getByRole("heading", { level: 1, name: "Repository “not-published” is not published here." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read published repositories/u })).toHaveAttribute("href", "/repositories");
  });
});
