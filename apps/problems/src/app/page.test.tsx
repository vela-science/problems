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
      formalized: true,
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

function preview(discovery: ProblemDiscovery, question: string, reviewedAt?: string) {
  const reviewed = Boolean(reviewedAt);
  const claimId = reviewed ? `vcl_${discovery.problem.padStart(64, "0")}` : null;
  const assertion = discovery.problem === "321"
    ? "Commit abc proves that the candidate has the retained asymptotic bound, matching the scoped target. This is a candidate answer, not a proof of the full Problem."
    : "The reviewed package establishes a sharp upper bound, which matches the scoped formal target. It does not establish the full Problem.";
  return {
    discovery,
    state: {
      repositorySlug: "math",
      repositoryName: "Vela Mathematics Program",
      problem: { declared_status: discovery.record.declared_status, label: `Erdős problem ${discovery.problem}`, statement: null, statement_kind: "label", tags: [], oeis: [], source_count: 1 },
      source: { title: `Erdős problem ${discovery.problem}` },
      currentClaimId: claimId,
      claims: reviewed ? [{
        id: claimId,
        assertion,
        assertion_type: "formalization_result",
        standing: "accepted",
        evidence_count: 2,
        created: "2026-08-14T20:00:00.000Z",
        source_bindings: [],
        conditions: [],
      }] : [],
      reviews: reviewed ? [{
        proposal_id: `vpr_${discovery.problem}`,
        status: "accepted",
        claim: assertion,
        reviewed_at: reviewedAt,
        reviewed_by: "agent:decision",
        decision_actor_class: "agent",
        producer_package: { producer_actor: "agent:research", submitted_at: "2026-08-15T15:00:00.000Z" },
        verification_records: [{ outcome: "pass", property: "scope_fidelity" }],
      }] : [],
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
          formal: { docstring: question, module: `FormalConjectures.ErdosProblems.${discovery.problem}`, proof_present: false, proof_sorry_free: false },
        }],
        statements: [],
      },
    },
  } as never;
}

function previews() {
  const catalog = catalogue();
  return [
    preview(catalog.find((item) => item.problem === "94")!, "Suppose n points determine a convex polygon.", "2026-08-14T16:04:07.000Z"),
    preview(catalog.find((item) => item.problem === "321")!, "What is the largest A with distinct subset sums?", "2026-08-16T16:04:07.000Z"),
    preview(catalog.find((item) => item.problem === "1")!, "How large must N be for distinct subset sums?"),
    preview(catalog.find((item) => item.problem === "2")!, "Can the lower bound be improved?"),
  ];
}

describe("Home", () => {
  it("makes discovery the dominant first task and states the two-collection truth once", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.previews.mockResolvedValue(previews());
    const { container } = render(await HomePage());

    expect(screen.getByRole("heading", { level: 1, name: "Open problems and the evidence around them" })).toBeVisible();
    expect(screen.getByText("Find a scientific question, read what is known, and add a result.")).toBeVisible();
    expect(screen.getByRole("link", { name: /browse problems/iu })).toHaveAttribute("href", "/problems");
    expect(screen.getByRole("link", { name: "Add contribution" })).toHaveAttribute("href", "/contribute");

    expect(screen.getAllByText("Erdős Problems")).toHaveLength(1);
    expect(screen.getAllByText("Formal Conjectures")).toHaveLength(1);
    expect(screen.getByText("14 published Problems")).toBeVisible();
    expect(screen.getByText("7 rights-reviewed formalizations")).toBeVisible();
    expect(screen.getByRole("link", { name: /Read the vision/iu })).toHaveAttribute("href", "/about/endless-frontiers");
    expect(container.querySelector(".vela-page-hero")).not.toHaveTextContent(/Repository|Standing|authority|roots|records/iu);
  });

  it("uses one prominent global Problem search", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.previews.mockResolvedValue(previews());
    render(await HomePage());

    const search = screen.getByRole("form", { name: "Find a problem" });
    expect(search).toHaveAttribute("action", "/search");
    expect(search).toHaveAttribute("method", "get");
    expect(within(search).getByRole("searchbox", { name: "Find a problem" })).toHaveAttribute("name", "q");
    expect(within(search).getByRole("button", { name: "Search" })).toHaveAttribute("type", "submit");
  });

  it("shows four useful Problems and the two durable reviewed Results", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.previews.mockResolvedValue(previews());
    const { container } = render(await HomePage());

    expect(screen.getByRole("heading", { name: "Problems to explore" })).toBeVisible();
    expect(container.querySelectorAll('a[href^="/problems/erdos-problems/"]')).toHaveLength(5);
    expect(container.querySelector('a[href^="/problems/formal-conjectures/"]')).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Reviewed Results" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Open reviewed Result for Erdős problem 94" })).toHaveAttribute("href", "/problems/erdos-problems/94?view=results");
    expect(screen.getByRole("link", { name: "Open reviewed Result for Erdős problem 321" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=results");
    expect(screen.getAllByText("Accepted by Vela Mathematics Program")).toHaveLength(2);
    expect(screen.getByText("It does not establish the full Problem.")).toBeVisible();
    expect(screen.getByText("This is a candidate answer, not a proof of the full Problem.")).toBeVisible();
    expect(screen.getAllByRole("link", { name: /^Open reviewed Result/u }).map((link) => link.getAttribute("aria-label"))).toEqual([
      "Open reviewed Result for Erdős problem 321",
      "Open reviewed Result for Erdős problem 94",
    ]);
    expect(screen.getByRole("link", { name: "All updates" })).toHaveAttribute("href", "/activity");
  });

  it("does not repeat collection analytics, raw updates, or contribution onboarding", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.previews.mockResolvedValue(previews());
    const { container } = render(await HomePage());

    expect(container).not.toHaveTextContent(/Recently updated|Collection coverage|Open per source|Import from GitHub|Have evidence to add|Available today/iu);
  });

  it("renders compact honest absences", async () => {
    reads.catalog.mockResolvedValue([problem("1"), problem("2")]);
    reads.previews.mockResolvedValue([]);
    render(await HomePage());

    expect(screen.getByText("No Problem in this release has a retained question to preview.")).toBeVisible();
    expect(screen.getByText("No reviewed Result is published in this release.")).toBeVisible();
  });
});
