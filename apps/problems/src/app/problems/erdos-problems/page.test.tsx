import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  discovered: vi.fn(),
  recent: vi.fn(),
  coverage: vi.fn(),
  corpora: vi.fn(),
}));

vi.mock("@/lib/scientific-state", () => ({
  discoveredProblems: mocks.discovered,
  /* Directory rows lead with the written question, read once per release. */
  problemStatementIndex: async () => ({
    "erdos-problems:321": { text: "Are the subset sums of a finite set distinct?", source_id: "source:formal-conjectures" },
  }),
  problemStatementKey: (problem: { collection: { key: string } | null; problem: string }) =>
    problem.collection ? `${problem.collection.key}:${problem.problem}` : null,
  recentScientificChanges: mocks.recent,
  reviewedProblemSourceCoverage: mocks.coverage,
  observedSourceCorpusMap: mocks.corpora,
  problemSourceObservationCoverage: (corpus: { inventory: { sources: Array<{ source_id: string; coverage_status: string }> } }, catalog: Array<{ canonicalPath: string; record: { source_id: string } }>) => new Map(catalog.map((entry) => [
    entry.canonicalPath,
    corpus.inventory.sources.find(({ source_id }) => source_id === entry.record.source_id)?.coverage_status,
  ])),
  problemDiscoveryCollections: (catalog: Array<Record<string, unknown>>) => [{
    key: "erdos-problems",
    name: "Erdős Problems",
    repositories: ["math"],
    problemCount: catalog.length,
    localStanding: 0,
    fields: [],
    topics: [{ key: "number theory", name: "Number Theory", problemCount: 1, localStanding: 0 }],
  }],
  problemDiscoveryScopeQuery: (input: Record<string, string>) => Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "all")),
}));
vi.mock("@/components/vela/problem-facts", () => ({ ProblemDiscoveryFacts: () => <div>Problem facts</div> }));
vi.mock("@/components/vela/source-corpus-map", () => ({ SourceCorpusMap: () => <div>Source corpus</div> }));
vi.mock("@/components/vela/problem-source-coverage", () => ({ ProblemSourceCoverage: () => <div>Source coverage</div> }));
vi.mock("@/components/vela/scientific-change-feed", () => ({ ScientificChangeFeed: () => <div>State history</div> }));

import ErdosProblemsPage, { metadata } from "./page";

const problem = {
  releaseRoot: `sha256:${"1".repeat(64)}`,
  repository: "math",
  collection: { key: "erdos-problems", name: "Erdős Problems" },
  problem: "321",
  canonicalPath: "/problems/erdos-problems/321",
  publicEntityId: "problem:erdos:321",
  domain: { key: "mathematics", name: "Mathematics" },
  field: null,
  topics: [{ key: "number theory", name: "Number Theory" }],
  hubs: [{ key: "erdos-problems", name: "Erdős Problems" }],
  theme: "Number Theory",
  record: {
    problem: "321",
    node_id: "erdos:321",
    native_kind: "problem",
    claim_id: null,
    source_id: "source:erdos-problems",
    statement: "A source-native Problem statement",
    declared_status: "open",
    local_standing: null,
    tags: ["number theory"],
    source_ids: ["source:erdos-problems"],
    source_count: 1,
    formalized: false,
  },
};

describe("Erdős Problems directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.discovered.mockResolvedValue([problem]);
    mocks.corpora.mockResolvedValue({
      release_root: problem.releaseRoot,
      inventory: {
        sources: [{ source_id: "source:erdos-problems", coverage_status: "complete" }],
      },
    });
  });

  /* The directory used to lead with the collection's label, so 1,217 rows read
     "Erdős problem N" and a reader could not choose between any two of them.
     Where a source wrote the question down, the question leads; where none
     did, the label stands and the row says the text is at the source. */
  it("leads a row with the written question", async () => {
    render(await ErdosProblemsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Are the subset sums of a finite set distinct?")).toBeVisible();
  });

  it("makes the searchable directory the default and keeps exact controls advanced", async () => {
    expect(metadata.alternates).toEqual({ canonical: "/problems/erdos-problems" });
    render(await ErdosProblemsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: /Erdős Problems/u })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Filter Erdős Problems" })).toBeInTheDocument();
    expect(screen.getByText("More filters")).toBeInTheDocument();
    for (const name of ["Scientific area", "Source status", "Observed Source occurrence", "Current Repository", "Formalization", "Source observation coverage", "Contribution decision"]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("textbox", { name: "Exact Problem identifier" })).toHaveAttribute("maxlength", "256");
    expect(screen.getByRole("link", { name: "Inspect coverage" })).toHaveAttribute("href", "/problems/erdos-problems?view=overview");
    /* The row is named by what it asks, not by the collection's label. */
    expect(screen.getByRole("link", { name: "Are the subset sums of a finite set distinct?" })).toHaveAttribute("href", "/problems/erdos-problems/321");
    expect(mocks.recent).not.toHaveBeenCalled();
    expect(mocks.coverage).not.toHaveBeenCalled();
    expect(mocks.corpora).not.toHaveBeenCalled();
  });

  it("retains the source-oriented overview only behind an explicit view", async () => {
    mocks.recent.mockResolvedValue([]);
    mocks.coverage.mockResolvedValue(null);
    mocks.corpora.mockResolvedValue(null);
    render(await ErdosProblemsPage({ searchParams: Promise.resolve({ view: "overview" }) }));
    expect(screen.getByText("Topics and related sources")).toBeInTheDocument();
    expect(mocks.recent).toHaveBeenCalledOnce();
  });

  it("matches exact identifiers without treating partial text as identity", async () => {
    render(await ErdosProblemsPage({ searchParams: Promise.resolve({ exact_id: "problem:erdos:32" }) }));
    expect(screen.queryByRole("link", { name: /source-native Problem statement/u })).not.toBeInTheDocument();
    expect(screen.getByText("No Problems match this view.")).toBeInTheDocument();
  });

  it("filters by the primary Source observation without calling it Problem completeness", async () => {
    render(await ErdosProblemsPage({ searchParams: Promise.resolve({ coverage: "partial" }) }));
    expect(screen.queryByRole("link", { name: /source-native Problem statement/u })).not.toBeInTheDocument();
    expect(screen.getByText("No Problems match this view.")).toBeInTheDocument();
    expect(screen.getByText(/Coverage is source-observation coverage, not Problem completeness/u)).toBeInTheDocument();
  });
});
