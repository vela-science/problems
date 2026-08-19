import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { formalConjectureOccurrence } from "@vela/projection-data";
import { FormalConjecturePage } from "./formal-conjecture-page";

const item = formalConjectureOccurrence("wikipedia-oppermann-conjecture")!;
const route = "/problems/formal-conjectures/wikipedia-oppermann-conjecture";

describe("Formal Conjectures occurrence page", () => {
  test("keeps source status, proof availability, and Vela state separate", () => {
    render(<FormalConjecturePage item={item} route={route} current="overview" />);
    expect(screen.getByText("research open")).toBeVisible();
    expect(screen.getAllByText("Not retained")).toHaveLength(2);
    expect(screen.getByText("No Repository Result attached")).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Problem sections" })).toBeVisible();
    expect(screen.getByText("Open Wikipedia source").closest("a")).toHaveAttribute("href", item.source_locator);
    expect(screen.getByText("Open source", { selector: "a" })).toHaveAttribute("href", item.source_url);
    expect(screen.getByText("Tracked question").parentElement).not.toHaveTextContent("**Oppermann's Conjecture**");
  });

  test("renders a synchronized exact declaration preview without calling it a whole file", () => {
    render(<FormalConjecturePage item={item} route={route} current="sources" />);
    expect(screen.getByText("Exact retained declaration excerpt — not the whole file.")).toBeVisible();
    expect(screen.getByText(item.source_path)).toBeVisible();
    expect(screen.getByText(item.declaration)).toBeVisible();
    expect(screen.getByRole("link", { name: "Open whole file" })).toHaveAttribute("href", item.source_url);
  });

  test("does not promote upstream checks or merges into a Result", () => {
    render(<FormalConjecturePage item={item} route={route} current="results" />);
    expect(screen.getByText("No Vela Result is attached")).toBeVisible();
    expect(screen.getByText(/GitHub merge, Lean build, or advisory review does not become a Vela Result/u)).toBeVisible();
  });
});
