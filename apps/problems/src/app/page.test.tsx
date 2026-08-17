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
    topics: [{ key: "number theory", name: "Number Theory" }],
    hubs: [],
    theme: "Number Theory",
    record: {
      problem: number,
      statement: `Statement for ${number}`,
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

/* The catalogue is sorted by problem number, so a fixture that is only the
   low-numbered head is exactly the shape that made the old page wrong: it
   counted over twelve rows and reported zero assessed while two were. */
function catalogue(): ProblemDiscovery[] {
  const filler = Array.from({ length: 12 }, (_, index) => problem(String(index + 1)));
  return [
    ...filler,
    problem("94", { local_standing: "accepted", local_assessed_at: "2026-08-15T16:04:07.000Z", declared_status: "proved (Lean)" }),
    problem("321", { local_standing: "accepted", local_assessed_at: "2026-08-14T20:25:10.000Z", declared_status: "solved" }),
  ];
}

describe("Home", () => {
  it("counts the whole catalogue, not the first page of it", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    render(await HomePage());

    /* 14 rows, of which 2 carry a standing. The defect this pins returned 12
       and 0 for exactly this shape. */
    const published = screen.getByText("Erdős problems published").closest("div")!;
    expect(within(published).getByText("14")).toBeVisible();
    const assessed = screen.getByText("Assessed by a Repository").closest("div")!;
    expect(within(assessed).getByText("2")).toBeVisible();
  });

  it("leads with the most recently assessed Problem, not the lowest numbered", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    render(await HomePage());

    /* 94 is assessed later than 321 and sorts after every filler row, so any
       page that leads with 1 or with a hardcoded 321 fails here. The lead is
       the only link carrying an h3. */
    const lead = screen.getByRole("heading", { level: 3 }).closest("a");
    expect(lead).toHaveAttribute("href", "/problems/erdos-problems/94");
    expect(lead).toHaveTextContent("Statement for 94");
    /* 321 is still present, below the lead, not displaced by it. */
    expect(screen.getByRole("link", { name: /Statement for 321/u })).toHaveAttribute("href", "/problems/erdos-problems/321");
  });

  it("says so plainly when no Repository has assessed anything", async () => {
    reads.catalog.mockResolvedValue([problem("1"), problem("2")]);
    reads.changes.mockResolvedValue([]);
    render(await HomePage());

    expect(screen.getByText("No Repository has assessed a Problem in this release.")).toBeVisible();
    const assessed = screen.getByText("Assessed by a Repository").closest("div")!;
    expect(within(assessed).getByText("0")).toBeVisible();
  });

  it("keeps open Problems as a source-declared list rather than a queue", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    const { container } = render(await HomePage());

    expect(screen.getByRole("heading", { name: "Open Problems" })).toBeVisible();
    /* 12 fillers are `open`; 94 and 321 are not. */
    expect(screen.getByRole("link", { name: "12 open" })).toBeVisible();
    expect(container).not.toHaveTextContent(/priority|ranked|most important/iu);
  });
});
