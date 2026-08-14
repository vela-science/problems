import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ReviewedProblemSourceCoverage } from "@/lib/scientific-state";
import { ProblemSourceCoverage } from "./problem-source-coverage";

const root = (digit: string): `sha256:${string}` => `sha256:${digit.repeat(64)}`;

const sources = [
  { source_id: "source:erdos-problems", resolution_namespace: "erdos-problems", label: "Erdős Problems", source_role: "problem_catalog" },
  { source_id: "source:formal-conjectures", resolution_namespace: "erdos-problems", label: "Formal Conjectures", source_role: "formal_statement_library" },
  { source_id: "source:vibemathed", resolution_namespace: "erdos-problems", label: "VibeMathed", source_role: "attributed_activity_catalog" },
  { source_id: "source:williamjblair-lean-proofs", resolution_namespace: "erdos-problems", label: "William Blair Lean proofs", source_role: "proof_manifest" },
  { source_id: "source:gpt-erdos", resolution_namespace: "erdos-problems", label: "GPT-Erdős", source_role: "attributed_classification_catalog" },
] as const;

function coverageRow(sourceId: typeof sources[number]["source_id"], current: number, reviewed: number, statements = 0) {
  const source = sources.find(({ source_id }) => source_id === sourceId)!;
  return {
    ...source,
    source_occurrences: current,
    reviewed_occurrences: reviewed,
    statement_occurrences: statements,
  };
}

const coverage = {
  schema: "vela.problem-source-coverage-read.v1",
  release_root: root("1"),
  resolver_root: root("2"),
  semantics: {
    authority_effect: "none",
    entity_effect: "navigation_group_only",
    candidate_effect: "shared_namespace_and_source_number_only",
    statement_identity: "not_established",
    equivalence: "not_established",
  },
  coverage_complete: true,
  sources: [...sources],
  problems: [
    {
      entity_id: "problem:erdos:321",
      entity_label: "Erdős 321",
      resolution_namespace: "erdos-problems",
      problem_number: 321,
      canonical_occurrence: { source_id: "source:erdos-problems", native_id: "erdos:321", native_kind: "problem", content_root: root("3") },
      occurrence_count: 8,
      reviewed_occurrence_count: 8,
      candidate_occurrence_count: 0,
      statement_occurrence_count: 7,
      candidate_limit: 250,
      route: "/p/math/321",
      coverage: [
        coverageRow("source:erdos-problems", 1, 1),
        coverageRow("source:formal-conjectures", 6, 6, 6),
        coverageRow("source:vibemathed", 1, 1, 1),
        coverageRow("source:williamjblair-lean-proofs", 0, 0),
        coverageRow("source:gpt-erdos", 0, 0),
      ],
    },
    {
      entity_id: "problem:erdos:730",
      entity_label: "Erdős 730",
      resolution_namespace: "erdos-problems",
      problem_number: 730,
      canonical_occurrence: { source_id: "source:erdos-problems", native_id: "erdos:730", native_kind: "problem", content_root: root("4") },
      occurrence_count: 69,
      reviewed_occurrence_count: 6,
      candidate_occurrence_count: 63,
      statement_occurrence_count: 3,
      candidate_limit: 250,
      route: "/p/math/730",
      coverage: [
        coverageRow("source:erdos-problems", 1, 1),
        coverageRow("source:formal-conjectures", 3, 3, 3),
        coverageRow("source:vibemathed", 0, 0),
        coverageRow("source:williamjblair-lean-proofs", 64, 1),
        coverageRow("source:gpt-erdos", 0, 0),
      ],
    },
  ],
} satisfies ReviewedProblemSourceCoverage;

afterEach(cleanup);

describe("ProblemSourceCoverage", () => {
  it("renders one exact semantic table that recomposes without duplicating the matrix", () => {
    const { container } = render(<ProblemSourceCoverage coverage={coverage} />);
    expect(screen.getByRole("heading", { name: "2 reviewed Problems across 5 exact Sources" })).toBeVisible();
    expect(screen.getByText(/reviewed occurrences with every exact same-number record/u)).toBeVisible();
    expect(screen.getByText(/do not establish statement identity, equivalence, Verification, Decision, or Standing/u)).toBeVisible();

    const table = screen.getByRole("table", { name: "Reviewed Problem source occurrence coverage" });
    expect(table).toHaveClass("@4xl/source-coverage:table");
    expect(container.querySelectorAll("[data-coverage-table]")).toHaveLength(1);
    expect(within(table).getAllByRole("link", { name: /Erdős 321/u }).some((link) => link.getAttribute("href") === "/p/math/321")).toBe(true);
    expect(within(table).getByRole("link", { name: "Formal Conjectures" })).toHaveAttribute("href", "/sources/source%3Aformal-conjectures");
    expect(within(table).getByLabelText("1 reviewed of 64 exact occurrences")).toHaveTextContent("1/64");
    expect(within(table).getByText("63 number candidates")).toBeVisible();
    expect(within(table).getByRole("link", { name: "VibeMathed" })).toBeInTheDocument();
    expect(within(table).getByText("No exact records among these reviewed Problems.")).toBeInTheDocument();
    expect(within(table).getAllByLabelText("1 reviewed of 64 exact occurrences")).toHaveLength(1);
    expect(container.querySelector("[data-slot='card']")).toBeNull();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("visibly disambiguates equal Problem numbers in different resolver namespaces", () => {
    const equalNumbers = structuredClone(coverage);
    equalNumbers.problems[1]!.problem_number = 321;
    equalNumbers.problems[1]!.entity_label = "Biology question 321";
    equalNumbers.problems[1]!.resolution_namespace = "biology-questions";
    equalNumbers.problems[1]!.route = "/p/biology/321";
    render(<ProblemSourceCoverage coverage={equalNumbers} />);

    const table = screen.getByRole("table", { name: "Reviewed Problem source occurrence coverage" });
    const headers = [...table.querySelectorAll("thead th")];
    const mathHeader = headers.find((header) => /Erdős 321.*erdos-problems/u.test(header.textContent ?? ""));
    const biologyHeader = headers.find((header) => /Biology question 321.*biology-questions/u.test(header.textContent ?? ""));
    expect(mathHeader).toBeDefined();
    expect(biologyHeader).toBeDefined();
    expect(mathHeader?.querySelector("a")).toHaveAttribute("href", "/p/math/321");
    expect(biologyHeader?.querySelector("a")).toHaveAttribute("href", "/p/biology/321");
  });

  it("carries exact read roots and never styles source roles as authority", () => {
    const { container } = render(<ProblemSourceCoverage coverage={coverage} />);
    expect(screen.getByText(root("1"))).toBeVisible();
    expect(screen.getByText(root("2"))).toBeVisible();
    expect(screen.getByText(/reader refuses rather than clips/u)).toBeVisible();
    expect(screen.getByText(/status, activity, and classification labels remain source facts, not scientific authority/u)).toBeVisible();
    expect(container.querySelector("[data-tone]")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders nothing when no exact reviewed entity exists", () => {
    const { container } = render(<ProblemSourceCoverage coverage={{ ...coverage, problems: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
