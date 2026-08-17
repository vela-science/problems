import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { LedgerPager } from "./ledger-pager";

afterEach(cleanup);

const hrefFor = (page: number) => `/repositories/erdos/problems?sort=sources&page=${page}`;

describe("LedgerPager", () => {
  test("draws nothing when the result fits on one page", () => {
    const { container } = render(<LedgerPager page={1} pages={1} hrefFor={hrefFor} label="Problem pages" />);
    expect(container).toBeEmptyDOMElement();
  });

  test("names the collection it pages and carries the narrowing into both arrows", () => {
    render(<LedgerPager page={12} pages={25} hrefFor={hrefFor} label="Problem pages" />);
    expect(screen.getByRole("navigation", { name: "Problem pages" })).toBeInTheDocument();
    expect(screen.getByText("12 / 25")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", hrefFor(11));
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", hrefFor(13));
  });

  test("offers no link past either end of the range", () => {
    render(<LedgerPager page={1} pages={25} hrefFor={hrefFor} label="Claim pages" />);
    expect(screen.queryByRole("link", { name: "Previous" })).toBeNull();
    expect(screen.getByRole("link", { name: "Next" })).toBeInTheDocument();
    cleanup();

    render(<LedgerPager page={25} pages={25} hrefFor={hrefFor} label="Claim pages" />);
    expect(screen.getByRole("link", { name: "Previous" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Next" })).toBeNull();
  });
});
