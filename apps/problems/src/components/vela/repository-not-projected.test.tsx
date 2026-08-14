import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RepositoryNotProjected } from "./repository-not-projected";

describe("Repository-specific missing state", () => {
  it("names the unprojected Repository scope and provides a published read path", () => {
    render(<RepositoryNotProjected repository="not-published" />);

    expect(screen.getByRole("heading", { level: 1, name: "Repository “not-published” is not published here." })).toBeInTheDocument();
    expect(screen.getByText(/contains no Repository under that scope/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Read published repositories/u })).toHaveAttribute("href", "/repositories");
  });
});
