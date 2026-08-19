import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ discovered: vi.fn() }));
vi.mock("@/lib/scientific-state", () => ({
  discoveredProblems: mocks.discovered,
  problemDiscoveryCollections: (catalog: Array<Record<string, unknown>>) => [{
    key: "erdos-problems", name: "Erdős Problems", problemCount: catalog.length,
  }],
  /* Starting points lead with the question, which is a per-Problem read. */
  problemStatePreviews: async (discoveries: Array<{ problem: string; canonicalPath: string; repository: string }>) =>
    discoveries.map((discovery) => ({
      discovery,
      state: {
        repositoryName: "Vela Mathematics Program",
        problem: { declared_status: "open", label: `Erdős problem ${discovery.problem}`, statement: null, statement_kind: "label" },
        source: { title: `Erdős problem ${discovery.problem}` },
        claims: [],
        locator: null,
        sources: {
          occurrences: [{
            occurrence_key: `formal:${discovery.problem}`,
            source_id: "source:formal-conjectures",
            source_label: "Formal Conjectures",
            source_role: "formal_statement_library",
            native_id: `Erdos${discovery.problem}.erdos_${discovery.problem}`,
            native_kind: "formal_conjecture",
            occurrence_status: "candidate_number_link",
            locators: [],
            summary: "True",
            formal: { docstring: `Question for ${discovery.problem}`, module: "M", proof_present: false, proof_sorry_free: false },
          }],
          statements: [],
        },
      },
    })),
}));

import ProblemsPage, { metadata } from "./page";

const problem = (number: string, standing: string | null = null) => ({
  repository: "math",
  problem: number,
  canonicalPath: `/problems/erdos-problems/${number}`,
  record: {
    statement_kind: "prose",
    statement: `Question ${number}`,
    label: `Erdős problem ${number}`,
    declared_status: "open",
    local_standing: standing,
  },
});

describe("global Problems entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.discovered.mockResolvedValue([problem("321", "accepted"), problem("94")]);
  });

  it("publishes two honest collections and collection-qualified starting points", async () => {
    expect(metadata.alternates).toEqual({ canonical: "/problems" });
    const view = render(await ProblemsPage({ searchParams: Promise.resolve({}) }));
    expect(view.container.querySelector("h1")).toHaveTextContent("Problems");
    expect(screen.getByText("2 published collections")).toBeInTheDocument();
    expect(screen.getAllByText("Erdős Problems")[0]?.closest("a")).toHaveAttribute("href", "/problems/erdos-problems");
    expect(screen.getAllByText("Formal Conjectures")[0]?.closest("a")).toHaveAttribute("href", "/problems/formal-conjectures");
    expect([...view.container.querySelectorAll("a")].find((link) => link.getAttribute("href") === "/problems/erdos-problems/321"))
      .toBeTruthy();
  });

  it("keeps global search on the global collection entry", async () => {
    render(await ProblemsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("textbox", { name: "Search all Problems" })).toHaveAttribute("name", "q");
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });
});
