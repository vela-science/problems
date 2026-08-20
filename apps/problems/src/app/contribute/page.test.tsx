import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProblemDiscovery } from "@/lib/scientific-state";

vi.mock("server-only", () => ({}));
vi.mock("@vela/ui/vela/scientific-text", () => ({
  ScientificText: ({ text }: { text: string }) => text,
}));

const reads = vi.hoisted(() => ({ catalog: vi.fn(), previews: vi.fn() }));
vi.mock("@/lib/scientific-state", () => ({
  discoveredProblems: reads.catalog,
  problemStatePreviews: reads.previews,
}));

import ContributePage from "./page";

afterEach(cleanup);

function discovery(problem: string, reviewed = false): ProblemDiscovery {
  return {
    releaseRoot: `sha256:${"a".repeat(64)}`,
    repository: "math",
    problem,
    canonicalPath: `/problems/erdos-problems/${problem}`,
    collection: { key: "erdos-problems", name: "Erdős Problems" },
    domain: { key: "mathematics", name: "Mathematics" },
    field: null,
    topics: [],
    hubs: [],
    theme: "Number Theory",
    record: {
      problem,
      statement: `Statement for ${problem}`,
      statement_kind: "prose",
      declared_status: "open",
      local_standing: reviewed ? "accepted" : null,
      local_assessed_at: reviewed ? `2026-08-${problem === "94" ? "18" : "17"}T12:00:00.000Z` : null,
      formalized: true,
      source_count: 1,
      tags: [],
    },
  } as unknown as ProblemDiscovery;
}

function preview(item: ProblemDiscovery, question: string) {
  return {
    discovery: item,
    state: {
      problem: {
        declared_status: item.record.declared_status,
        label: `Erdős problem ${item.problem}`,
        statement: question,
        statement_kind: "prose",
        source_id: "source:erdos-problems",
      },
      source: { title: `Erdős problem ${item.problem}` },
      locator: null,
      claims: [],
      sources: { occurrences: [], statements: [] },
    },
  } as never;
}

describe("Add contribution", () => {
  it("opens with a real Problem search instead of a contribution explainer", async () => {
    const catalog = [discovery("94", true), discovery("321", true), discovery("4")];
    reads.catalog.mockResolvedValue(catalog);
    reads.previews.mockResolvedValue(catalog.map((item) => preview(item, `Question for ${item.problem}?`)));
    render(await ContributePage());

    expect(screen.getByRole("heading", { level: 1, name: "Choose a Problem" })).toBeVisible();
    const form = screen.getByRole("form", { name: "Find a Problem to contribute to" });
    expect(form).toHaveAttribute("action", "/search");
    expect(within(form).getByRole("searchbox", { name: "Find a Problem to contribute to" })).toHaveAttribute("name", "q");
    expect(form.querySelector('input[name="kind"]')).toHaveValue("problem");
    expect(form.querySelector('input[name="intent"]')).toHaveValue("contribute");
    expect(screen.queryByText(/Step 1 of 4|Contribution path|From question to contribution/iu)).not.toBeInTheDocument();
  });

  it("offers collection-qualified starting points that open Work directly", async () => {
    const catalog = [discovery("94", true), discovery("321", true), discovery("4")];
    reads.catalog.mockResolvedValue(catalog);
    reads.previews.mockResolvedValue(catalog.map((item) => preview(item, `Question for ${item.problem}?`)));
    const { container } = render(await ContributePage());

    expect(screen.getByRole("heading", { name: "Erdős Problems" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Formal Conjectures" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Open Work: Erdős problem 94/iu })).toHaveAttribute("href", "/problems/erdos-problems/94/work");
    expect(container.querySelector('a[href^="/problems/formal-conjectures/"][href$="/work"]')).toBeTruthy();
    expect(screen.getByRole("link", { name: /Connect code/iu })).toHaveAttribute("href", "/import");
    expect(screen.getByRole("link", { name: "Browse all Problems" })).toHaveAttribute("href", "/problems");
  });

  it("renders a useful empty state without inventing a Problem", async () => {
    reads.catalog.mockResolvedValue([]);
    reads.previews.mockResolvedValue([]);
    render(await ContributePage());

    expect(screen.getByText("No Problem has a retained question to start from")).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse every Problem" })).toHaveAttribute("href", "/problems");
    expect(screen.getByRole("link", { name: "Browse all Problems" })).toHaveAttribute("href", "/problems");
  });
});
