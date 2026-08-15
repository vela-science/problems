import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { ProblemState } from "./problem-state";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;

const state = {
  repositorySlug: "math",
  repositoryName: "Vela Mathematics",
  repository: {
    status: {
      actions: {
        work: {
          mode: "direct_submission",
          note: "Submit bounded evidence directly.",
          command: "vela submit --repo . --help",
        },
      },
    },
  },
  problem: { problem: "321", declared_status: "solved", formalized: true },
  currentClaimId: `vcl_${"1".repeat(64)}`,
  claims: [{
    id: `vcl_${"1".repeat(64)}`,
    root: root("1"),
    assertion: "The local assertion.",
    standing: "accepted",
    record: { relations: [{ kind: "corrects", target_claim_id: `vcl_${"0".repeat(64)}` }] },
    source_bindings: [{
      binding_id: "binding:problem-321:formal",
      binding_root: root("b"),
      row_root: root("b"),
      source_id: "source:formal-conjectures",
      observation_root: root("c"),
      native_id: "Erdos321.erdos_321",
      native_kind: "formal_conjecture",
      native_record_root: root("d"),
      content_root: root("e"),
      binding_kind: "snapshot",
      local_standing_effect: "none",
      relation_kind: "formal_statement_reference",
      translation_disposition: "unresolved",
      authority_effect: "none",
    }],
  }],
  reviews: [{
    proposal_id: "vpr_correction",
    status: "accepted",
    kind: "claim.revise",
    target: `vcl_${"0".repeat(64)}`,
    /* The same text as the Claim this Problem holds. It read
       "Accept the exact occurrence correction." — a different string — so the
       fixture was exercising the fallback that handed an unrelated accepted
       Proposal the current-Claim caption, and passing. */
    claim: "The local assertion.",
    decision_provenance: "signed_record",
    decision_actor_class: "agent",
    decision_authority_principal_id: "local:repository-authority",
    reviewed_by: "agent:codex-math-321-decision",
    decision_reason: "Accept the exact correction after scoped checks.",
    verification_records: [{
      verification_record_id: "vvr_occurrence",
      verification_root: root("f"),
      outcome: "pass",
      property: "subject_occurrence_mapping",
      verifier_actor: "agent:independent-reviewer",
      does_not_establish: ["Statement equivalence or Standing."],
    }],
  }],
  source: { source_id: "source:erdos-problems", native_id: "erdos:321", native_kind: "problem", row_root: root("2"), metadata_root: root("3"), observation_root: root("4"), content_root: root("5") },
  sources: {
    schema: "vela.problem-source-read.v1",
    release_root: root("7"),
    resolver_root: root("a"),
    resolution_namespace: "erdos-problems",
    canonical_record: { source_id: "source:erdos-problems", native_id: "erdos:321" },
    problem_number: 321,
    entity: null,
    occurrences: [],
    statements: [{ statement_id: "statement:vibemathed:321", source_id: "source:vibemathed", source_role: "attributed_activity_catalog", statement_form: "prose", occurrence_key: "source:vibemathed\u0000problem:erdos:321", text: "How quickly does the extremal quantity grow?", locator_url: "https://example.test/vibemathed/321", row_root: root("d") }],
    relations: [],
    identity_events: [],
    /* The coverage table renders from this. Statement selection no longer
       joins through it — the statement row carries its own form — but a
       realistic fixture keeps the coverage surface exercised. */
    coverage: [
      { source_id: "source:vibemathed", resolution_namespace: "erdos-problems", label: "VibeMathed", source_role: "attributed_activity_catalog", source_occurrences: 1, reviewed_occurrences: 1, statement_occurrences: 1 },
      { source_id: "source:formal-conjectures", resolution_namespace: "erdos-problems", label: "Formal Conjectures", source_role: "formal_statement_library", source_occurrences: 1, reviewed_occurrences: 1, statement_occurrences: 0 },
    ],
    candidate_limit: 250,
  },
  anchor: { repositoryRoot: root("6"), projectionReleaseRoot: root("7"), sourceCommit: "8".repeat(40) },
  locator: "https://example.test/problem-321",
  sourceAudits: [],
} as unknown as NonNullable<ScientificProblemState>;

describe("Problem State", () => {
  afterEach(cleanup);

  it("leads with Current State, attributed provenance, and source-owned next work while keeping exact records disclosed", async () => {
    const user = userEvent.setup();
    render(<ProblemState state={state} basePath="/problems/erdos-problems/321" />);

    const question = screen.getByRole("heading", { name: "Question" });
    const currentState = screen.getByRole("heading", { name: "Current State" });
    expect(question.compareDocumentPosition(currentState) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText("How quickly does the extremal quantity grow?")).toHaveLength(2);
    expect(screen.getByText(/readable source text, not a Vela Claim/u)).toBeInTheDocument();
    expect(screen.getByText(/Source status is publisher-declared/u)).toHaveTextContent("it does not mean this Problem is proved or resolved");
    expect(screen.getByText("The local assertion.")).toBeInTheDocument();
    expect(screen.getByText(/source:formal-conjectures/u)).toHaveTextContent("Erdos321.erdos_321");
    /* Source coverage and the retained statements paint in the flow. They were
       behind a closed Collapsible, which Base UI keeps out of the DOM. */
    expect(screen.getByRole("heading", { name: "Source coverage" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Evidence, sources, and reviews/u })).not.toBeInTheDocument();
    /* Producer, check and Decision are one block in protocol order, so a
       reader watches three different actors act rather than reading a
       disclaimer that a passing check is not an acceptance. */
    expect(screen.getByRole("heading", { name: "Latest contribution and reviews" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Produced by" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Checked by" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Decided by" })).toBeInTheDocument();
    expect(screen.getByText("subject_occurrence_mapping")).toBeInTheDocument();
    expect(screen.getByText(/Verification by agent:independent-reviewer/u)).toBeInTheDocument();
    expect(screen.getByText(/Agent Decision/u)).toBeInTheDocument();
    expect(screen.getByText(/Repository authority/u)).toHaveTextContent("local:repository-authority");
    expect(screen.getByText("Accept the exact correction after scoped checks.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Not established by these checks" })).toBeInTheDocument();
    expect(screen.getByText("Statement equivalence or Standing.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Correction history" })).toBeInTheDocument();
    expect(screen.getByText("Claim correction")).toBeInTheDocument();
    expect(screen.getByText("corrects")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Next contribution" })).toBeInTheDocument();
    expect(screen.getByText("Submit bounded evidence directly.")).toBeInTheDocument();
    expect(screen.getByText(/Open Workspace to assemble the packet in the browser/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Next: open the Workspace/u })).toHaveAttribute("href", "/problems/erdos-problems/321?mode=work");
    expect(screen.getByRole("button", { name: "Open Workspace" })).toHaveAttribute("href", "/problems/erdos-problems/321?mode=work");

    const exact = screen.getByRole("button", { name: /Exact provenance/u });
    expect(screen.queryByText("Problem row")).not.toBeInTheDocument();
    await user.click(exact);
    expect(screen.getByText("Problem row")).toBeInTheDocument();
    expect(screen.getByText("Exact Claim-to-Problem Bindings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Source JSON" })).toHaveAttribute("href", `/problems.json?root=${encodeURIComponent(root("7"))}&resolver=${encodeURIComponent(root("a"))}&source=source%3Aerdos-problems&native_id=erdos%3A321&kind=problem`);
  });

  /* Erdős 94 opened with
     `∃ C > 0, ∀ (P : Finset (EuclideanSpace ℝ (Fin 2))), …` under "Question",
     labelled "Source-authored statement". The prose catalogue declares
     `statement_retention: "locator_only"`, so no natural-language statement
     is retained for it and the page must say that rather than promote a Lean
     declaration into the opening. The formal text keeps its own place below. */
  it("does not present a formal declaration as the Problem's question", () => {
    render(<ProblemState basePath="/problems/erdos-problems/321" state={{
      ...state,
      sources: {
        ...state.sources,
        statements: [{
          statement_id: "statement:formal-conjectures:94",
          source_id: "source:formal-conjectures",
          source_role: "formal_statement_library" as const,
          statement_form: "formal" as const,
          occurrence_key: "source:formal-conjectures\u0000Erdos94.erdos_94",
          text: "\u2203 C > 0, \u2200 (P : Finset (EuclideanSpace \u211d (Fin 2))), EuclideanGeometry.ConvexIndep \u2191P",
          locator_url: "https://example.test/formal/94",
          row_root: root("d"),
          statement_identity: "not_established" as const,
          authority_effect: "none" as const,
        }],
      },
    }} />);

    expect(screen.getByText("No natural-language question is retained in this release.")).toBeVisible();
    expect(screen.getByText(/One formal statement is retained below/u)).toBeVisible();
    expect(screen.queryByText("Source-authored statement")).toBeNull();
    expect(screen.getByRole("link", { name: "Open the upstream source" })).toBeVisible();
  });

  /* An accepted Proposal for a different Claim must not take the heading
     "Latest contribution and reviews" or the caption "Supports the Claim this
     Problem currently holds", which would present its producer, verifiers,
     limits and Decision reason as this Claim's provenance. */
  it("does not attribute an unrelated accepted Proposal to the current Claim", () => {
    render(<ProblemState basePath="/problems/erdos-problems/321" state={{
      ...state,
      reviews: [{ ...state.reviews[0]!, claim: "A different accepted Claim entirely." }],
    }} />);

    expect(screen.queryByText("Supports the Claim this Problem currently holds")).toBeNull();
    expect(screen.getByText("No accepted contribution is retained for this Problem.")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Produced by" })).toBeNull();
    /* It is still listed, under its own status word. */
    expect(screen.getByRole("heading", { name: "One proposed change" })).toBeVisible();
  });

  it("keeps absent State projections readable without stacking empty cards", () => {
    render(<ProblemState basePath="/problems/erdos-problems/321" state={{
      ...state,
      problem: { ...state.problem },
      claims: [],
      reviews: [],
    }} />);

    const assertion = screen.getByText("No Claim in this release names this Problem as its subject.").parentElement;
    const decision = screen.getByText(/No accepted contribution is retained/iu);

    /* An absence says which fact is missing and offers the record that would
       carry it, rather than explaining the product. A zero count reads as
       failure, so a heading with nothing behind it carries no chip. */
    expect(screen.getByRole("link", { name: "Open the Claim ledger" })).toHaveAttribute("href", "/repositories/math/claims");
    expect(screen.queryByText("0 local assertions")).not.toBeInTheDocument();
    expect(screen.queryByText("0 recorded")).not.toBeInTheDocument();

    expect(assertion).not.toHaveClass("border-dashed", "bg-muted/25");
    expect(decision).not.toHaveClass("rounded-lg", "bg-muted/30");
    expect(screen.getByRole("heading", { name: "Next contribution" })).toBeVisible();
    expect(screen.getByText("Submit bounded evidence directly.")).toBeVisible();
  });

  it("renders source audit axes without promoting approval, merge, or build to Standing", () => {
    render(<ProblemState basePath="/problems/erdos-problems/321" state={{
      ...state,
      sourceAudits: [{
        fixture_id: "fidelity-erdos-887-1237",
        problem_ref: { namespace: "erdos-problems", problem_number: "887" },
        root: root("a"),
        pull_request: { number: 1237, url: "https://github.com/google-deepmind/formal-conjectures/pull/1237" },
        head: { commit_oid: "1".repeat(40), tree_oid: "2".repeat(40) },
        changed_paths: ["FormalConjectures/ErdosProblems/887.lean"],
        advisory_disposition: "needs_revision",
        observed_pull_request_state: { is_draft: false, merge_state_status: "UNKNOWN", review_count: 9, review_decision: "APPROVED", state: "MERGED", updated_at: "2026-01-13T20:56:02Z" },
        checks: [
          { id: "answer-slot-scope", kind: "semantic", property: "answer-slot-scope-fidelity", outcome: "fail", severity: "meaning", statement: "The answer slot is under the quantified binders.", witness: "le_refl closes each instance.", conditions: [], limitations: ["This does not decide Standing."], automatic_protocol_conversion: false },
          { id: "exact-head-build", kind: "mechanical", property: "lean-build", outcome: "pass", severity: "none", statement: "The exact head built.", witness: "", conditions: [], limitations: ["A build is not fidelity."], automatic_protocol_conversion: false },
        ],
        core_root: root("b"), observation_root: root("c"), authority_effect: "none", standing_effect: "none", automatic_verification: false,
      }],
    } as NonNullable<ScientificProblemState>} />);

    expect(screen.getByRole("heading", { name: "Source review" })).toBeVisible();
    expect(screen.getByText("PR merged")).toBeVisible();
    expect(screen.getByText("review approved")).toBeVisible();
    expect(screen.getByText("fail")).toBeVisible();
    expect(screen.getByText("pass")).toBeVisible();
    expect(screen.getByText(/None is a Vela Verification, Decision, or change to Math Standing/u)).toBeVisible();
    expect(screen.getByText(/Adapter conformance 9 \/ 9/u)).toBeVisible();
    expect(screen.getByText("Adapter profile")).toBeVisible();
    expect(screen.getByText("Adapter contract")).toBeVisible();
    expect(screen.getByRole("button", { name: "Open upstream PR" })).toHaveAttribute("href", "https://github.com/google-deepmind/formal-conjectures/pull/1237");
  });
});
