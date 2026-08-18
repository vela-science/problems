import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ discovered: vi.fn(), redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect: (href: string) => { mocks.redirect(href); throw new Error("NEXT_REDIRECT"); } }));
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

  it("states the one-collection scope and links its directory", async () => {
    expect(metadata.alternates).toEqual({ canonical: "/problems" });
    render(await ProblemsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Problems" })).toBeInTheDocument();
    expect(screen.getByText(/current release contains one collection/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse Erdős Problems/u })).toHaveAttribute("href", "/problems/erdos-problems");
    expect(screen.getByRole("link", { name: "Erdős problem 321: Question for 321" }))
      .toHaveAttribute("href", "/problems/erdos-problems/321");
  });

  it("preserves old directory query links at the collection address", async () => {
    await expect(ProblemsPage({ searchParams: Promise.resolve({ q: "prime", status: "open" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/problems/erdos-problems?q=prime&status=open");
    expect(mocks.discovered).not.toHaveBeenCalled();
  });
});
