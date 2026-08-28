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
    coverage: [
      { source_id: "source:erdos-problems", resolution_namespace: "erdos", label: "Erdős Problems", source_role: "problem_catalog", statement_retention: "locator_only", source_occurrences: 1, reviewed_occurrences: 1, statement_occurrences: 1 },
      { source_id: "source:formal-conjectures", resolution_namespace: "erdos", label: "Formal Conjectures", source_role: "formal_statement_library", statement_retention: "summary", source_occurrences: 1, reviewed_occurrences: 1, statement_occurrences: 1 },
      { source_id: "source:plby-lean-proofs", resolution_namespace: "erdos", label: "PLBY Lean proofs", source_role: "proof_manifest", statement_retention: "none", source_occurrences: 0, reviewed_occurrences: 0, statement_occurrences: 0 },
    ],
    occurrences: [occurrence],
    statements: [
      { statement_id: "s-formal", occurrence_key: occurrence.occurrence_key, source_id: occurrence.source_id, statement_form: "formal", text: occurrence.summary, locator_url: "https://example.test/blob/321.lean", row_root: root("a") },
      { statement_id: "s1", occurrence_key: "source:erdos-problems\0problem\0erdos:321", source_id: "source:erdos-problems", statement_form: "prose", text: "How quickly does the extremal quantity grow?", locator_url: "https://example.test/problem-321", row_root: root("b") },
    ],
  },
  anchor: { repositoryRoot: root("6"), projectionReleaseRoot: root("7"), sourceCommit: "8".repeat(40) },
  locator: "https://example.test/problem-321",
  sourceAudits: [],
} as unknown as NonNullable<ScientificProblemState>;

describe("Problem tools", () => {
  afterEach(cleanup);

  it("lands on a familiar current-Result detail surface", () => {
    render(<ProblemState state={state} basePath="/problems/erdos-problems/321" />);
    expect(screen.getByRole("heading", { name: "Current result" })).toBeVisible();
    expect(screen.getByText("The current bounded result.")).toBeVisible();
    expect(screen.getByText("agent:producer")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Checks" })).toBeVisible();
    expect(screen.getByText("claim chain fidelity")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Linked sources" })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Result details" })).toBeVisible();
    expect(screen.getByText("Decision here")).toBeVisible();
    expect(screen.getByText("Source code")).toBeVisible();
    expect(screen.getByText("Links to formal statements")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Provenance" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Other results" })).toBeNull();
    expect(screen.queryByRole("heading", { name: /What can I do/u })).toBeNull();
    expect(screen.queryByText(/Repository-local Standing, scoped/u)).toBeNull();
  });

  it("keeps Standing, Git custody, scoped Verification, and source acceptance separate", () => {
    const claim = {
      ...state.claims![0]!,
      assertion: `At lean-proofs commit ${"a".repeat(40)}, the bounded identity is proved.`,
      source_bindings: [{
        ...state.claims![0]!.source_bindings![0]!,
        translation_disposition: "unresolved",
        authority_effect: "none",
      }],
    };
    const check = {
      ...state.reviews![0]!.verification_records![0]!,
      independent_of: ["agent:producer"],
      shared_dependencies: ["Same source bytes and provider"],
    };
    const reviews = [{
      ...state.reviews![0]!,
      claim: claim.assertion,
      verification_records: [check],
    }];
    render(<ProblemState state={{ ...state, claims: [claim], reviews } as never} basePath="/problems/erdos-problems/94" />);
    expect(screen.getByText("Not recorded in a checkable form")).toBeVisible();
    expect(screen.getByText(/does not check that they exist, or that they were merged/iu)).toBeVisible();
    expect(screen.getByText(/Declared independent of agent:producer/iu)).toBeVisible();
    expect(screen.getByText("Same source bytes and provider")).toBeVisible();
    expect(screen.getByText(/unresolved · no authority effect/iu)).toBeVisible();
    /* Both denials have to survive the plainer wording: a link proves neither
       that the source project accepted the result, nor that this repository
       did. Dropping either half would overstate what a link means. */
    expect(screen.getByText("A link does not mean the source project accepted the result, nor that it was accepted here.")).toBeVisible();
  });

  it("keeps the retired map query on the familiar Result surface", () => {
    render(<ProblemState state={state} basePath="/problems/erdos-problems/321" researchView="map" />);
    expect(screen.getByRole("heading", { name: "Current result" })).toBeVisible();
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
    expect(screen.getByRole("heading", { name: "Sources" })).toBeVisible();

    const tree = screen.getByRole("navigation", { name: "Problem source paths" });
    expect(within(tree).getByRole("link", { name: /321\.lean/u })).toHaveAttribute(
      "href",
      expect.stringContaining("/sources?file="),
    );
    expect(within(tree).getByRole("link", { name: /erdos_321/u }).getAttribute("href")).not.toContain("%00");
    expect(within(tree).getByRole("heading", { name: "Source providers" })).toBeVisible();
    expect(within(tree).getByRole("heading", { name: "Referenced paths" })).toBeVisible();

    expect(screen.getByText(/retained formal statement/iu)).toBeVisible();
    expect(screen.getByRole("link", { name: "Open selected source" })).toHaveAttribute("href", "https://example.test/blob/321.lean");
    expect(screen.getByText("1 of 1")).toBeVisible();
  });

  /* Retention is the Source's declared policy, not a count of what it happened
     to retain here — otherwise a consulted Source that came back empty is
     indistinguishable from one that never retains anything. */
  it("names what each Source may retain, including one that observed nothing", () => {
    render(<ProblemState state={state} basePath="/problems/erdos-problems/321" researchView="files" />);
    const tree = screen.getByRole("navigation", { name: "Problem source paths" });
    expect(within(tree).getByText("statement retained")).toBeVisible();
    expect(within(tree).getByText("locator only")).toBeVisible();
    expect(within(tree).getByText("PLBY Lean proofs")).toBeVisible();
    expect(within(tree).getByText("not observed here")).toBeVisible();
  });

  /* The middle pane shows someone else's file. The right pane is where this
     site says what it does and does not conclude from it, and the two fields
     that carry that are the record's own. */
  it("states the record's own boundary beside the file it is showing", () => {
    render(<ProblemState state={state} basePath="/problems/erdos-problems/321" researchView="files" />);
    const inspector = screen.getByRole("complementary", { name: "Selected source record" });
    /* The sentence leads; the record's own field names stay underneath it. A
       reader should not have to know the protocol before the page will tell
       them what it concludes. */
    expect(within(inspector).getByText("What this site concludes")).toBeVisible();
    expect(within(inspector).getByText(/Only a Repository Decision establishes state here/u)).toBeVisible();
    expect(within(inspector).getByText("statement_identity")).toBeVisible();
    expect(within(inspector).getByText("not_established")).toBeVisible();
    expect(within(inspector).getByText("authority_effect")).toBeVisible();
    /* Category and proof are two facts, so the pane prints two. "Open" is what
       the library files the declaration under; whether a proof is attached is a
       separate field, and the fixture has none. */
    expect(within(inspector).getByText("Open")).toBeVisible();
    expect(within(inspector).getByText("None attached")).toBeVisible();
  });

  /* A proof can be attached and still carry a `sorry`. That is the state most
     easily misread as "solved", so it gets its own words. */
  it("separates an attached proof with a hole from one without", () => {
    const holed = { ...occurrence, formal: { ...occurrence.formal, proof_present: true, proof_sorry_free: false } };
    render(<ProblemState state={{ ...state, sources: { ...state.sources, occurrences: [holed] } } as never} basePath="/problems/erdos-problems/321" researchView="files" />);
    const inspector = screen.getByRole("complementary", { name: "Selected source record" });
    expect(within(inspector).getByText("Attached, has a hole")).toBeVisible();
  });

  it("fails closed to retained source text when no file bytes or declaration exist", () => {
    render(<ProblemState state={{ ...state, sources: { coverage: state.sources.coverage, occurrences: [], statements: state.sources.statements } } as never} basePath="/problems/erdos-problems/321" researchView="files" />);
    expect(screen.getByText(/retained source excerpt/iu)).toBeVisible();
    expect(screen.getByText("How quickly does the extremal quantity grow?")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open exact source location" })).toHaveAttribute("href", "https://example.test/problem-321");
  });

  it("does not preview a declaration whose text was not retained", () => {
    render(<ProblemState state={{ ...state, sources: { coverage: state.sources.coverage, occurrences: [occurrence], statements: [] } } as never} basePath="/problems/erdos-problems/321" researchView="files" />);
    expect(screen.getByText(/formal occurrence/iu)).toBeVisible();
    expect(screen.getByText("Preview unavailable")).toBeVisible();
    expect(screen.getByText(/its text is not retained/iu)).toBeVisible();
    expect(screen.queryByText(occurrence.summary)).toBeNull();
  });

  it("does not send a selected occurrence to the collection fallback", () => {
    const occurrenceWithoutLocator = { ...occurrence, locators: [] };
    render(<ProblemState state={{ ...state, sources: { coverage: state.sources.coverage, occurrences: [occurrenceWithoutLocator], statements: [] } } as never} basePath="/problems/erdos-problems/321" researchView="files" />);
    expect(screen.getByText(/formal occurrence/iu)).toBeVisible();
    expect(screen.queryByRole("link", { name: "Open selected source" })).toBeNull();
  });

  it("keeps chronology and correction identity in the Timeline", () => {
    render(<ProblemState state={state} basePath="/problems/erdos-problems/321" researchView="timeline" />);
    expect(screen.getByRole("heading", { name: "Result history" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Correction history" })).toBeVisible();
    expect(screen.getByText("corrects")).toBeVisible();
    expect(screen.getByText("Technical details")).toBeVisible();
  });

  /* The ordinary case: 1,215 of 1,217 Problems have no Claim at all. An empty
     panel was true and useless — the release still holds retained declarations
     for this exact Problem, and that is what a reader came for. What it must
     not do is dress source material up as a reviewed result. */
  it("answers an empty Results view with retained source material", () => {
    render(<ProblemState state={{ ...state, claims: [], reviews: [], currentClaimId: null } as never} basePath="/problems/erdos-problems/321" />);
    expect(screen.getByRole("heading", { name: "No current result" })).toBeVisible();
    expect(screen.getByText(/No reviewed Result is current/iu)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Retained declaration" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start a contribution" })).toHaveAttribute("href", "/problems/erdos-problems/321/work");
    expect(screen.getByRole("link", { name: "Browse the source files" })).toHaveAttribute("href", "/problems/erdos-problems/321/sources");
    expect(screen.queryByRole("heading", { name: "Other results" })).toBeNull();
  });

  it("never promotes a retired Contribution when no current identity exists", () => {
    render(<ProblemState state={{ ...state, currentClaimId: null } as never} basePath="/problems/erdos-problems/321" />);
    expect(screen.getByRole("heading", { name: "No current result" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Other results" })).toBeVisible();
    expect(screen.queryByText("Current result")).toBeNull();
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
    expect(screen.getByText("produced a later version")).toBeVisible();
    expect(screen.queryByText("Current")).toBeNull();
  });

  it("does not substitute the Decision performer for a missing Result performer", () => {
    const reviews = [{ ...state.reviews![0]!, producer_package: null }];
    render(<ProblemState state={{ ...state, reviews } as never} basePath="/problems/erdos-problems/321" researchView="timeline" />);
    expect(screen.getByText("Submitter not recorded")).toBeVisible();
    expect(screen.getAllByText("agent:decision")).toHaveLength(1);
  });
});
