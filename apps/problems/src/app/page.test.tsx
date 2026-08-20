import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProblemDiscovery } from "@/lib/scientific-state";

vi.mock("server-only", () => ({}));
vi.mock("@vela/ui/vela/scientific-text", () => ({
  ScientificText: ({ text }: { text: string }) => text,
}));

const reads = vi.hoisted(() => ({ catalog: vi.fn(), previews: vi.fn() }));
/* Only the two reads are stubbed. `problemDiscoveryCollections` stays real so
   the Topic entries and their counts are actually derived from the catalogue
   under test — a stubbed facet builder would let Home advertise a count no
   collection could honour, which is the one thing these entries must not do. */
vi.mock("@/lib/scientific-state", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/scientific-state")>()),
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

/* Home now previews only the assessed Problems, because the accepted Results
   are what it renders. */
function previews() {
  const catalog = catalogue();
  return [
    preview(catalog.find((item) => item.problem === "94")!, "Suppose n points determine a convex polygon.", "2026-08-14T16:04:07.000Z"),
    preview(catalog.find((item) => item.problem === "321")!, "What is the largest A with distinct subset sums?", "2026-08-16T16:04:07.000Z"),
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

    /* The honest state of the place, stated once and computed from the
       catalogue rather than written down. */
    expect(screen.getByText("14 published Problems")).toBeVisible();
    expect(screen.getByText("7 rights-reviewed formalizations")).toBeVisible();

    /* Home used to restate `/problems`' own "Problems to explore" heading and
       `/updates`' recent-updates list, both one click away in the sidebar, so
       a newcomer met the same rows twice. Its sections are now its own: the
       Repository whose state the panel shows, and the collections. */
    expect(screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent)).toEqual([
      "Vela Mathematics Program",
      "Published collections",
    ]);
    expect(screen.queryByRole("link", { name: /Read the vision/iu })).not.toBeInTheDocument();
    expect(container.querySelector("img[src*='endless-folio-opening']")).not.toBeInTheDocument();
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

  it("leads with what has been accepted, which the catalogue never shows", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.previews.mockResolvedValue(previews());
    render(await HomePage());

    /* `/problems` owns browsing and never renders a Result. This is the half
       of the product a catalogue cannot carry, so it is Home's dominant
       object — most recently reviewed first. */
    const accepted = screen.getAllByRole("link", { name: /^Erdős problem/u });
    expect(accepted.map((link) => link.getAttribute("href"))).toEqual([
      "/problems/erdos-problems/321/results",
      "/problems/erdos-problems/94/results",
    ]);

    /* The panel is the Repository's own state, carrying the exact root those
       Results were read at rather than a decorative window chrome. */
    expect(screen.getByRole("heading", { level: 2, name: "Vela Mathematics Program" })).toBeVisible();
    expect(screen.getByText("aaaaaaaaaaaa")).toBeVisible();

    /* Each Result states what it does not settle, beside the claim itself, and
       the lane ends on the real remainder rather than trailing off. */
    expect(screen.getByText("It does not establish the full Problem.")).toBeVisible();
    expect(screen.getByText("This is a candidate answer, not a proof of the full Problem.")).toBeVisible();
    expect(screen.getByRole("link", { name: "12 questions still open" })).toHaveAttribute("href", "/problems");
  });

  it("offers topic entries that really filter the collection", async () => {
    reads.catalog.mockResolvedValue(catalogue());
    reads.previews.mockResolvedValue(previews());
    render(await HomePage());

    /* The Topics come from the projection's own source-native vocabulary, and
       `/problems/erdos-problems` filters on this key — Home invents no
       taxonomy and advertises no count it cannot honour. */
    const entry = screen.getByRole("link", { name: "Number Theory, 14 Problems" });
    expect(entry).toHaveAttribute("href", "/problems/erdos-problems?topic=number-theory");
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

    /* With nothing admitted, the instrument is replaced rather than drawn
       empty — an empty lane would imply a Repository that had ruled and found
       nothing. */
    expect(screen.getByText("No Result has been accepted here yet")).toBeVisible();
    /* An absence states its cause and offers the next thing to do; a bare
       sentence cannot carry the action (DESIGN.md, "concise cause plus one
       next action"). */
    expect(screen.getByRole("link", { name: "Browse every Problem" })).toHaveAttribute("href", "/problems");
    /* The collections stay named and reachable: an empty state must not read
       as a missing catalogue. */
    expect(screen.getByRole("heading", { level: 2, name: "Published collections" })).toBeVisible();
    expect(screen.getByText("2 published Problems")).toBeVisible();
  });
});
