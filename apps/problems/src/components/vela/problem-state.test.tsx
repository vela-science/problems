import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { ProblemState } from "./problem-state";

const root = (digit: string): `sha256:${string}` => `sha256:${digit.repeat(64)}`;

const occurrence = {
  occurrence_key: "source:formal-conjectures\0formal_conjecture\0Erdos321.erdos_321",
  source_id: "source:formal-conjectures",
  source_label: "Formal Conjectures",
  source_role: "formal_statement_library" as const,
  native_id: "Erdos321.erdos_321",
  native_kind: "formal_conjecture",
  title: "Erdos321.erdos_321",
  summary: "∀ (N : ℕ), Erdos321.R N = sorry",
  locators: [{ locator_id: "native-1", kind: "artifact" as const, url: "https://example.test/blob/321.lean" }],
  row_root: root("d"),
  occurrence_status: "reviewed" as const,
  relation_kind: "formal_statement_reference",
  statement_identity: "not_established" as const,
  authority_effect: "none" as const,
  formal: {
    docstring: "Let R(N) be the largest set with distinct reciprocal subset sums.",
    module: "FormalConjectures.ErdosProblems.321",
    category_label: "Open",
    subject_names: ["Number theory"],
    proof_present: false,
    proof_kind: "sorry",
    proof_sorry_free: false,
    proof_locator: null,
    blob_root: root("e"),
    file_first_added: null,
    file_last_modified: null,
  },
};

const state = {
  repositorySlug: "math",
  repositoryName: "Vela Mathematics",
  problem: { problem: "321", label: "Erdős problem 321", declared_status: "solved", formalized: true },
  currentClaimId: `vcl_${"1".repeat(64)}`,
  claims: [{
    id: `vcl_${"1".repeat(64)}`,
    root: root("1"),
    assertion: "The current bounded result.",
    standing: "accepted",
    record: { relations: [{ kind: "corrects", target_claim_id: `vcl_${"0".repeat(64)}` }] },
    source_bindings: [{ binding_id: "binding:321", source_id: "source:formal-conjectures", native_id: "Erdos321.erdos_321", relation_kind: "formal_statement_reference" }],
  }],
  reviews: [{
    proposal_id: "vpr_correction",
    status: "accepted",
    kind: "claim.revise",
    target: `vcl_${"0".repeat(64)}`,
    claim: "The current bounded result.",
    created_at: "2026-08-17T22:20:00Z",
    reviewed_at: "2026-08-17T22:33:00Z",
    decision_provenance: "signed_record",
    decision_actor_class: "agent",
    reviewed_by: "agent:decision",
    decision_reason: "Accept after scoped checks.",
    producer_package: { producer_actor: "agent:producer", submitted_at: "2026-08-17T22:20:00Z", verification_requirements: [] },
    verification_records: [{ verification_record_id: "vvr_1", verification_root: root("f"), outcome: "pass", property: "claim_chain_fidelity", verifier_actor: "agent:reviewer", completed_at: "2026-08-17T22:30:00Z", does_not_establish: ["A full proof."] }],
  }],
  source: { source_id: "source:erdos-problems", native_id: "erdos:321", native_kind: "problem", title: "Erdős problem", content_root: root("5") },
  sources: {
    occurrences: [occurrence],
    statements: [
      { statement_id: "s-formal", occurrence_key: occurrence.occurrence_key, source_id: occurrence.source_id, statement_form: "formal", text: occurrence.summary, locator_url: "https://example.test/blob/321.lean" },
      { statement_id: "s1", occurrence_key: "source:erdos-problems\0problem\0erdos:321", source_id: "source:erdos-problems", statement_form: "prose", text: "How quickly does the extremal quantity grow?", locator_url: "https://example.test/problem-321" },
    ],
  },
  anchor: { repositoryRoot: root("6"), projectionReleaseRoot: root("7"), sourceCommit: "8".repeat(40) },
  locator: "https://example.test/problem-321",
  sourceAudits: [],
} as unknown as NonNullable<ScientificProblemState>;

describe("Problem tools", () => {
  afterEach(cleanup);

  it("lands on a familiar current-Contribution detail surface", () => {
    render(<ProblemState state={state} basePath="/problems/erdos-problems/321" />);
    expect(screen.getByRole("heading", { name: "Current contribution" })).toBeVisible();
    expect(screen.getByText("The current bounded result.")).toBeVisible();
    expect(screen.getByText("agent:producer")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Checks" })).toBeVisible();
    expect(screen.getByText("claim chain fidelity")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Linked sources" })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Contribution details" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Provenance" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Other contributions" })).toBeNull();
    expect(screen.queryByRole("heading", { name: /What can I do/u })).toBeNull();
    expect(screen.queryByText(/Repository-local Standing, scoped/u)).toBeNull();
  });

  it("keeps the retired map query on the familiar Contribution surface", () => {
    render(<ProblemState state={state} basePath="/problems/erdos-problems/321" researchView="map" />);
    expect(screen.getByRole("heading", { name: "Current contribution" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Open map" })).toHaveAttribute("href", expect.stringContaining("/graph?repository=math&lens=research&node="));
    expect(screen.getByText("Technical details")).toBeVisible();
    expect(screen.queryByText("exact relationships")).toBeNull();
    expect(screen.queryByText("Current here")).toBeNull();
    expect(screen.queryByText(/similar|possible duplicate/iu)).toBeNull();
  });

  /* The tree is built from the module paths inside the declarations, because
     the projection retains no directory listing. Directory segments are
     structure, not links: only a file that actually holds a declaration can be
     selected, and the selected file is named again over the preview so the
     reader can see what they are looking at without tracing the tree. */
  it("uses a file tree and one selected retained declaration", () => {
    render(<ProblemState state={state} basePath="/problems/erdos-problems/321" researchView="files" />);
    expect(screen.getByRole("heading", { name: "Files" })).toBeVisible();

    const tree = screen.getByRole("navigation", { name: "Public Problem files" });
    expect(within(tree).getByRole("link", { name: /321\.lean/u })).toHaveAttribute(
      "href",
      expect.stringContaining("view=files&file="),
    );
    expect(within(tree).getByRole("link", { name: /erdos_321/u }).getAttribute("href")).not.toContain("%00");
    expect(within(tree).getAllByText(/Retained excerpts/u).length).toBeGreaterThan(0);

    expect(screen.getByText("retained declaration")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open exact source" })).toHaveAttribute("href", "https://example.test/blob/321.lean");
    expect(screen.getByText("1 of 1")).toBeVisible();
  });

  it("fails closed to retained source text when no file bytes or declaration exist", () => {
    render(<ProblemState state={{ ...state, sources: { occurrences: [], statements: state.sources.statements } } as never} basePath="/problems/erdos-problems/321" researchView="files" />);
    expect(screen.getByText("retained source excerpt")).toBeVisible();
    expect(screen.getByText("How quickly does the extremal quantity grow?")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open exact source location" })).toHaveAttribute("href", "https://example.test/problem-321");
  });

  it("does not preview a declaration whose text was not retained", () => {
    render(<ProblemState state={{ ...state, sources: { occurrences: [occurrence], statements: [] } } as never} basePath="/problems/erdos-problems/321" researchView="files" />);
    expect(screen.getByText("Preview unavailable")).toBeVisible();
    expect(screen.getByText(/not retained for display/iu)).toBeVisible();
    expect(screen.queryByText(occurrence.summary)).toBeNull();
  });

  it("keeps chronology and correction identity in the Timeline", () => {
    render(<ProblemState state={state} basePath="/problems/erdos-problems/321" researchView="timeline" />);
    expect(screen.getByRole("heading", { name: "Contribution history" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Correction history" })).toBeVisible();
    expect(screen.getByText("corrects")).toBeVisible();
    expect(screen.getByText("Technical details")).toBeVisible();
  });

  /* The ordinary case: 1,215 of 1,217 Problems have no Claim at all. An empty
     panel was true and useless — the release still holds retained declarations
     for this exact Problem, and that is what a reader came for. What it must
     not do is dress source material up as a reviewed result. */
  it("answers an empty Contributions view with retained source material", () => {
    render(<ProblemState state={{ ...state, claims: [], reviews: [], currentClaimId: null } as never} basePath="/problems/erdos-problems/321" />);
    expect(screen.getByRole("heading", { name: "What is known" })).toBeVisible();
    expect(screen.getByText(/has not reviewed a Contribution/iu)).toBeVisible();
    expect(screen.getByText(/Nothing below is a Vela Verification or Decision/iu)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Retained declaration" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start a contribution" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=workspace");
    expect(screen.getByRole("link", { name: "Browse the source files" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=files");
    expect(screen.queryByRole("heading", { name: "Other contributions" })).toBeNull();
  });

  it("never promotes a retired Contribution when no current identity exists", () => {
    render(<ProblemState state={{ ...state, currentClaimId: null } as never} basePath="/problems/erdos-problems/321" />);
    expect(screen.getByRole("heading", { name: "No current contribution" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Other contributions" })).toBeVisible();
    expect(screen.queryByText("Current contribution")).toBeNull();
  });

  it("uses a failure presentation for a failed check", () => {
    const firstReview = state.reviews![0]!;
    const firstVerification = firstReview.verification_records![0]!;
    const reviews = [{ ...firstReview, verification_records: [{ ...firstVerification, outcome: "fail" }] }];
    const { container } = render(<ProblemState state={{ ...state, reviews } as never} basePath="/problems/erdos-problems/321" />);
    expect(container.querySelector('[data-check-outcome="fail"]')).toHaveClass("text-destructive");
    expect(screen.getByText("Failed")).toBeVisible();
  });

  it("does not label a superseded correction result as current", () => {
    render(<ProblemState state={{ ...state, currentClaimId: null } as never} basePath="/problems/erdos-problems/321" researchView="timeline" />);
    expect(screen.getByText("Later version")).toBeVisible();
    expect(screen.queryByText("Current")).toBeNull();
  });
});
