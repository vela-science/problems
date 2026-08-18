import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProblemDiscovery } from "@/lib/scientific-state";

vi.mock("server-only", () => ({}));

const reads = vi.hoisted(() => ({ catalog: vi.fn(), changes: vi.fn(), previews: vi.fn() }));
vi.mock("@/lib/scientific-state", () => ({
  discoveredProblems: reads.catalog,
  recentScientificChanges: reads.changes,
  problemStatePreviews: reads.previews,
}));

import HomePage from "./page";

afterEach(cleanup);

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

/* Home shows real questions, so it needs the per-Problem state that carries
   them — a discovery row's own statement is the collection's label for most of
   the corpus. */
function preview(number: string, question: string, status = "open") {
  return {
    discovery: problem(number),
    state: {
      repositoryName: "Vela Mathematics Program",
      problem: { declared_status: status, label: `Erdős problem ${number}`, statement: null, statement_kind: "label", tags: [], oeis: [], source_count: 1 },
      source: { title: `Erdős problem ${number}` },
      claims: [],
      locator: null,
      sources: {
        occurrences: [{
          occurrence_key: `formal:${number}`,
          source_id: "source:formal-conjectures",
          source_label: "Formal Conjectures",
          source_role: "formal_statement_library",
          native_id: `Erdos${number}.erdos_${number}`,
          native_kind: "formal_conjecture",
          occurrence_status: "candidate_number_link",
          locators: [],
          summary: "True",
          formal: { docstring: question, module: `FormalConjectures.ErdosProblems.${number}`, proof_present: false, proof_sorry_free: false },
        }],
        statements: [],
      },
    },
  } as never;
}

function previews() {
  return [
    preview("94", "Suppose $n$ points determine a convex polygon.", "proved (Lean)"),
    preview("321", "What is the largest $A$ with distinct subset sums?", "solved"),
  ];
}

describe("Home", () => {
  it("gives a newcomer the product, next actions, and honest current coverage", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    reads.previews.mockResolvedValue(previews());
    const { container } = render(await HomePage());

    expect(screen.getByRole("heading", { level: 1, name: "Find scientific problems" })).toBeVisible();
    expect(screen.getByText(/find scientific questions, understand the evidence around them/iu)).toBeVisible();
    expect(screen.getByRole("link", { name: /browse problems/iu })).toHaveAttribute("href", "/problems");
    expect(screen.getAllByRole("link", { name: "Add a contribution" })[0]).toHaveAttribute("href", "/contribute");

    const availability = screen.getByText("Available today").parentElement!;
    expect(availability).toHaveTextContent("One published collection with 14 questions.");
    expect(within(availability).getByRole("link", { name: "Erdős Problems" })).toHaveAttribute("href", "/problems/erdos-problems");

    const hero = container.querySelector(".vela-page-hero")!;
    expect(hero).not.toHaveTextContent(/Repository|Standing|authority|roots|records/iu);
  });

  it("uses one prominent problem search that lands in the published collection", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    reads.previews.mockResolvedValue(previews());
    render(await HomePage());

    const search = screen.getByRole("form", { name: "Find a problem" });
    expect(search).toHaveAttribute("action", "/problems/erdos-problems");
    expect(search).toHaveAttribute("method", "get");
    expect(within(search).getByRole("searchbox", { name: "Find a problem" })).toHaveAttribute("name", "q");
    expect(within(search).getByRole("button", { name: "Search" })).toHaveAttribute("type", "submit");
  });

  /* Three steps of prose described the product; six real questions are the
     product. A newcomer learns more from one Erdős statement than from being
     told that they may search by number, topic or wording. */
  it("opens with real questions rather than a description of the path", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    reads.previews.mockResolvedValue(previews());
    render(await HomePage());

    expect(screen.getByRole("heading", { name: "Problems to explore" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Erdős problem 94: Suppose n points determine a convex polygon." }))
      .toHaveAttribute("href", "/problems/erdos-problems/94");
    expect(screen.getByRole("link", { name: /What is the largest A with distinct subset sums\?/iu }))
      .toHaveAttribute("href", "/problems/erdos-problems/321");
    expect(screen.queryByText("Choose a question")).toBeNull();
    expect(screen.queryByText("From question to contribution")).toBeNull();
  });

  it("labels coverage and source status without turning them into ranking claims", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.changes.mockResolvedValue([]);
    reads.previews.mockResolvedValue(previews());
    const { container } = render(await HomePage());

    expect(screen.getAllByText("Open per source")).toHaveLength(2);
    expect(screen.getByText("Reviewed Results")).toBeVisible();
    expect(screen.getByText("With Repository-reviewed evidence")).toBeVisible();
    expect(container).not.toHaveTextContent(/priority|ranked|most important|central queue/iu);
  });

  it("states empty reviewed evidence and activity as ordinary absence", async () => {
    reads.catalog.mockResolvedValue([problem("1"), problem("2")]);
    reads.changes.mockResolvedValue([]);
    reads.previews.mockResolvedValue([]);
    render(await HomePage());

    expect(screen.getByText("No Problem in this release has a reviewed Result yet.")).toBeVisible();
    expect(screen.getByText("No Problem in this release has a retained question to preview.")).toBeVisible();
    expect(screen.getByText("No recent source updates are available.")).toBeVisible();
  });
});
