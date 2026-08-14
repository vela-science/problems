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
    claim: "Accept the exact occurrence correction.",
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
    statements: [{ statement_id: "statement:vibemathed:321", source_id: "source:vibemathed", occurrence_key: "source:vibemathed\u0000problem:erdos:321", text: "How quickly does the extremal quantity grow?", locator_url: "https://example.test/vibemathed/321", row_root: root("d") }],
    relations: [],
    identity_events: [],
    coverage: [],
    candidate_limit: 250,
  },
  anchor: { repositoryRoot: root("6"), projectionReleaseRoot: root("7"), sourceCommit: "8".repeat(40) },
  locator: "https://example.test/problem-321",
  sourceAudits: [],
} as unknown as NonNullable<ScientificProblemState>;

describe("Problem State", () => {
  afterEach(cleanup);

  it("leads with Current State, Decisions, and source-owned next work while keeping exact records disclosed", async () => {
    const user = userEvent.setup();
    render(<ProblemState state={state} />);

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
    expect(screen.getByRole("heading", { name: "Decisions" })).toBeInTheDocument();
    expect(screen.getByText(/Agent Decision · signed record/u)).toBeInTheDocument();
    expect(screen.getByText(/Repository authority/u)).toHaveTextContent("local:repository-authority");
    expect(screen.getByRole("heading", { name: "Checks" })).toBeInTheDocument();
    expect(screen.getByText("subject_occurrence_mapping")).toBeInTheDocument();
    expect(screen.getByText(/Attributed to agent:independent-reviewer/u)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Correction history" })).toBeInTheDocument();
    expect(screen.getByText("Claim correction")).toBeInTheDocument();
    expect(screen.getByText("corrects")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Next contribution" })).toBeInTheDocument();
    expect(screen.getByText("Submit bounded evidence directly.")).toBeInTheDocument();
    expect(screen.getByText(/Open Workspace to assemble the packet in the browser/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Next: open the Workspace/u })).toHaveAttribute("href", "/p/math/321?mode=work");
    expect(screen.getByRole("button", { name: "Open Workspace" })).toHaveAttribute("href", "/p/math/321?mode=work");

    const exact = screen.getByRole("button", { name: /Exact provenance/u });
    expect(screen.queryByText("Problem row")).not.toBeInTheDocument();
    await user.click(exact);
    expect(screen.getByText("Problem row")).toBeInTheDocument();
    expect(screen.getByText("Exact Claim-to-Problem Bindings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Source JSON" })).toHaveAttribute("href", `/problems.json?root=${encodeURIComponent(root("7"))}&resolver=${encodeURIComponent(root("a"))}&source=source%3Aerdos-problems&native_id=erdos%3A321&kind=problem`);
  });

  it("keeps absent State projections readable without stacking empty cards", () => {
    render(<ProblemState state={{
      ...state,
      problem: { ...state.problem },
      claims: [],
      reviews: [],
    }} />);

    const assertion = screen.getByText("No Claim in this release names this Problem as its subject.").parentElement;
    const decision = screen.getByText(/No Decision is retained/iu);

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
    render(<ProblemState state={{
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
