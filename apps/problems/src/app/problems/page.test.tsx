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
    /* The route names itself for a screen reader only. The visible band that
       used to say "Problems" restated the breadcrumb and the rail, and its
       "2 published collections" badge counted the section directly beneath it,
       which lists those two collections by name. */
    expect(view.container.querySelector("h1")).toHaveTextContent("Problems");
    expect(view.container.querySelector("h1")).toHaveClass("sr-only");
    expect(screen.queryByText("2 published collections")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Published collections" })).toBeVisible();
    expect(screen.getAllByText("Erdős Problems")[0]?.closest("a")).toHaveAttribute("href", "/problems/erdos-problems");
    expect(screen.getAllByText("Formal Conjectures")[0]?.closest("a")).toHaveAttribute("href", "/problems/formal-conjectures");
    expect([...view.container.querySelectorAll("a")].find((link) => link.getAttribute("href") === "/problems/erdos-problems/321"))
      .toBeTruthy();
  });

  it("opens on its own content, with no header band and no second search", async () => {
    render(await ProblemsPage({ searchParams: Promise.resolve({}) }));
    /* The band said "Problems" — which the breadcrumb and the rail both say —
       badged a count of the two collections listed directly beneath it, and
       explained what a directory is. The search went with it: the app header
       carries a global search on every route, and this one reached nothing the
       collections below do not. The page begins with its content. */
    expect(screen.queryByRole("textbox", { name: "Search all Problems" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Published collections" })).toBeVisible();
  });
});
