import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { ProblemAnswerStrip, problemPublicState } from "./problem-summary";
import { ProvenanceSummary } from "./provenance-summary";

const base = {
  repositoryName: "Vela Mathematics",
  problem: { problem: "321", declared_status: "open", local_assessed_at: null },
  currentClaimId: null,
  claims: [],
  reviews: [],
  sourceAudits: [],
} as unknown as NonNullable<ScientificProblemState>;

const claim = {
  id: "vcl_current",
  assertion: "The local assertion.",
  standing: "accepted",
  source_bindings: [{ binding_id: "b1", source_id: "source:formal-conjectures", native_id: "Erdos321.erdos_321", relation_kind: "formal_statement_reference" }],
};

const review = {
  proposal_id: "vpr_1",
  status: "accepted",
  claim: "The local assertion.",
  reviewed_at: "2026-08-15T20:06:00Z",
  created_at: "2026-08-15T20:00:00Z",
  producer_package: { producer_actor: "agent:producer" },
  verification_records: [
    { verification_record_id: "vvr_1", verifier_actor: "agent:a", outcome: "pass", does_not_establish: ["The cubic conjecture itself."] },
    { verification_record_id: "vvr_2", verifier_actor: "agent:b", outcome: "pass", does_not_establish: [] },
  ],
};

/* The Problem's own public axis, derived from declared source status and the
 * Contributions this Repository accepted — never from Standing alone, which
 * governs exact Contributions and renders on them. */
describe("problemPublicState", () => {
  it("derives the four words with their bases", () => {
    expect(problemPublicState(base).word).toBe("Open");
    expect(problemPublicState({ ...base, currentClaimId: claim.id, claims: [claim] } as never).word).toBe("Partial");
    expect(problemPublicState({ ...base, problem: { ...base.problem, declared_status: "solved" } } as never).word).toBe("Resolved");
    expect(problemPublicState({
      ...base,
      claims: [claim, { ...claim, id: "vcl_2" }],
    } as never).word).toBe("Contested");
  });
});

describe("Problem answer strip", () => {
  afterEach(cleanup);

  it("keeps only Problem and source state in the header", () => {
    render(<ProblemAnswerStrip basePath="/problems/erdos-problems/321" state={{ ...base, currentClaimId: claim.id, claims: [claim], reviews: [review] } as never} />);
    expect(screen.getByText("Source:")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.queryByText("Partial")).toBeNull();
    expect(screen.queryByText("accepted")).toBeNull();
    expect(screen.queryByText("2 pass")).toBeNull();
    /* Summaries never carry record ids, roots, or Standing words dressed as
       the Problem's status. */
    expect(screen.queryByText(/vvr_/u)).toBeNull();
    expect(screen.queryByText(/sha256:/u)).toBeNull();
    expect(screen.queryByText(/Local Standing/u)).toBeNull();
  });

  it("keeps empty axes explicit without explanatory prose", () => {
    render(<ProblemAnswerStrip basePath="/problems/erdos-problems/321" state={base} />);
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.queryByText("None")).toBeNull();
  });
});

describe("Provenance summary", () => {
  afterEach(cleanup);

  it("compresses the record to one line with the full record one link away", () => {
    render(<ProvenanceSummary basePath="/problems/erdos-problems/321" state={{ ...base, currentClaimId: claim.id, claims: [claim], reviews: [review] } as never} />);
    expect(screen.getByRole("heading", { name: "What was checked" })).toBeInTheDocument();
    expect(screen.getByText(/agent:producer/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Full verification record" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=timeline");
    expect(screen.queryByText(/vvr_/u)).toBeNull();
  });

  it("points at the source's own audit as a source-published fact", () => {
    render(<ProvenanceSummary basePath="/problems/erdos-problems/321" state={{ ...base, sourceAudits: [{ fixture_id: "f" }] } as never} />);
    expect(screen.getByText("No contribution to this Problem has been checked by this Repository.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "its own audit" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=contributions");
  });
});
