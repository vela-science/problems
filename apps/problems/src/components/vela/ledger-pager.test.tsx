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

  /* Both ends stay reachable from the middle, which is the whole point: with
     arrows alone, page 14 of 26 cost thirteen round trips. */
  test("reaches either end of a long range in one click from the middle", () => {
    render(<LedgerPager page={14} pages={26} hrefFor={hrefFor} label="Problem pages" />);
    expect(screen.getByRole("link", { name: "Page 1 of 26" })).toHaveAttribute("href", hrefFor(1));
    expect(screen.getByRole("link", { name: "Page 26 of 26" })).toHaveAttribute("href", hrefFor(26));
    expect(screen.getByRole("link", { name: "Page 13 of 26" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Page 15 of 26" })).toBeInTheDocument();
    /* The current page is marked, and is not a link to where the reader is. */
    expect(screen.queryByRole("link", { name: "Page 14 of 26" })).toBeNull();
    expect(screen.getByText("14", { selector: "[aria-current=page]" })).toBeInTheDocument();
  });

  /* A contiguous range must not claim pages are missing. */
  test("renders no gap when every page in the range is shown", () => {
    const { container } = render(<LedgerPager page={2} pages={3} hrefFor={hrefFor} label="Problem pages" />);
    expect(container.textContent).not.toContain("\u2026");
    for (const page of [1, 3]) {
      expect(screen.getByRole("link", { name: `Page ${page} of 3` })).toBeInTheDocument();
    }
  });
});
