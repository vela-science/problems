import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProblemDiscovery } from "@/lib/scientific-state";

vi.mock("server-only", () => ({}));

const reads = vi.hoisted(() => ({ catalog: vi.fn(), changes: vi.fn() }));
vi.mock("@/lib/scientific-state", () => ({
  discoveredProblems: reads.catalog,
  recentScientificChanges: reads.changes,
}));

import HomePage from "./page";

function problem(number: string, overrides: Partial<ProblemDiscovery["record"]> = {}): ProblemDiscovery {
  return {
    releaseRoot: `sha256:${"a".repeat(64)}`,
    repository: "math",
    problem: number,
    canonicalPath: `/problems/erdos-problems/${number}`,
    collection: { key: "erdos-problems", name: "Erdős Problems" },
    domain: { key: "mathematics", name: "Mathematics" },
    field: null,
    topics: [{ key: "number-theory", name: "Number Theory" }],
    hubs: [],
    theme: "Number Theory",
    record: {
      problem: number,
      statement: `Statement for ${number}`,
      statement_kind: "prose",
      declared_status: "open",
      local_standing: null,
      local_assessed_at: null,
      formalized: false,
      source_count: 1,
      tags: [],
      ...overrides,
    },
  } as unknown as ProblemDiscovery;
}

function catalogue(): ProblemDiscovery[] {
  const filler = Array.from({ length: 12 }, (_, index) => problem(String(index + 1)));
  return [
    ...filler,
    problem("94", { local_standing: "accepted", local_assessed_at: "2026-08-15T16:04:07.000Z", declared_status: "proved (Lean)" }),
    problem("321", { local_standing: "accepted", local_assessed_at: "2026-08-14T20:25:10.000Z", declared_status: "solved" }),
  ];
}

describe("Home", () => {
  it("gives a newcomer the product, next actions, and honest current coverage", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    const { container } = render(await HomePage());

    expect(screen.getByRole("heading", { level: 1, name: "Find a problem. See what is known. Add evidence." })).toBeVisible();
    expect(screen.getByText(/find scientific questions, understand the evidence around them/iu)).toBeVisible();
    expect(screen.getByRole("link", { name: /browse problems/iu })).toHaveAttribute("href", "/problems");
    expect(screen.getAllByRole("link", { name: "Add a contribution" })[0]).toHaveAttribute("href", "/contribute");

    const availability = screen.getByText("Available today").parentElement!;
    expect(availability).toHaveTextContent("One published collection with 14 questions: Erdős Problems.");
    expect(within(availability).getByRole("link", { name: "Erdős Problems" })).toHaveAttribute("href", "/problems/erdos-problems");

    const hero = container.querySelector(".vela-page-hero")!;
    expect(hero).not.toHaveTextContent(/Repository|Standing|authority|roots|records/iu);
  });

  it("uses one prominent problem search that lands in the published collection", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    render(await HomePage());

    const search = screen.getByRole("form", { name: "Find a problem" });
    expect(search).toHaveAttribute("action", "/problems/erdos-problems");
    expect(search).toHaveAttribute("method", "get");
    expect(within(search).getByRole("searchbox", { name: "Find a problem" })).toHaveAttribute("name", "q");
    expect(within(search).getByRole("button", { name: "Search" })).toHaveAttribute("type", "submit");
  });

  it("keeps the three-step path compact and action-led", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    render(await HomePage());

    expect(screen.getByRole("link", { name: /Choose a question/iu })).toHaveAttribute("href", "/problems/erdos-problems");
    expect(screen.getByRole("link", { name: /Read what is known/iu })).toHaveAttribute("href", "/problems/erdos-problems/94?view=contributions");
    expect(screen.getAllByRole("link", { name: /Add a contribution/iu })[1]).toHaveAttribute("href", "/contribute");
  });

  it("labels coverage and source status without turning them into ranking claims", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    const { container } = render(await HomePage());

    expect(screen.getByText("Listed as open by source")).toBeVisible();
    expect(screen.getByText("With reviewed evidence")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Problems with reviewed evidence" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Statement for 94/iu })).toHaveAttribute("href", "/problems/erdos-problems/94?view=contributions");
    expect(container).not.toHaveTextContent(/priority|ranked|most important|central queue/iu);
  });

  it("states empty reviewed evidence and activity as ordinary absence", async () => {
    reads.catalog.mockResolvedValue([problem("1"), problem("2")]);
    reads.changes.mockResolvedValue([]);
    render(await HomePage());

    expect(screen.getByText("No Problem has reviewed evidence in this release yet.")).toBeVisible();
    expect(screen.getByText("No recent source updates are available.")).toBeVisible();
  });
});
