import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModeSwitcher } from "./mode-switcher";

describe("Problem modes", () => {
  it("makes State and Work explicit without changing the Problem route", () => {
    render(<ModeSwitcher repository="math" problem="321" mode="state" />);
    expect(screen.getByRole("link", { name: "state" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "work" })).toHaveAttribute("href", "/p/math/321?mode=work");
  });
});
