import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { ProblemAnswerStrip } from "./problem-summary";
import { ProvenanceSummary } from "./provenance-summary";

const base = {
  repositoryName: "Vela Mathematics",
  problem: { problem: "321", declared_status: "open" },
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
    { verification_record_id: "vvr_1", verifier_actor: "agent:a", does_not_establish: ["The cubic conjecture itself."] },
    { verification_record_id: "vvr_2", verifier_actor: "agent:b", does_not_establish: [] },
  ],
};

describe("Problem answer strip", () => {
  afterEach(cleanup);

  it("summarizes a checked Problem without record-tier identifiers", () => {
    render(<ProblemAnswerStrip state={{ ...base, currentClaimId: claim.id, claims: [claim], reviews: [review] } as never} />);
    expect(screen.getByText(/2 scoped verification passes, decided/u)).toBeInTheDocument();
    expect(screen.getByText("The cubic conjecture itself.")).toBeInTheDocument();
    /* Summaries never carry record ids or roots — those are record-tier. */
    expect(screen.queryByText(/vvr_/u)).toBeNull();
    expect(screen.queryByText(/sha256:/u)).toBeNull();
  });

  /* Three different absences, three different sentences: an unchecked
     Problem, a Claim whose record is not retained, and a source-declared
     open status are different facts and must not collapse. */
  it("keeps the honest empties distinct", () => {
    render(<ProblemAnswerStrip state={base} />);
    expect(screen.getByText("Not checked by this Repository")).toBeInTheDocument();
    expect(screen.getByText("Open per the source's own declaration")).toBeInTheDocument();
    cleanup();

    render(<ProblemAnswerStrip state={{ ...base, currentClaimId: claim.id, claims: [claim] } as never} />);
    expect(screen.getByText("No Verification Record is retained for the current Claim")).toBeInTheDocument();
    cleanup();

    /* A closed status with no retained remainder states a fact about the
       record rather than claiming nothing is uncertain. */
    render(<ProblemAnswerStrip state={{ ...base, problem: { ...base.problem, declared_status: "proved" } } as never} />);
    expect(screen.getByText("No retained record names one")).toBeInTheDocument();
  });
});

describe("Provenance summary", () => {
  afterEach(cleanup);

  it("compresses the record to one line with the full record one link away", () => {
    render(<ProvenanceSummary basePath="/problems/erdos-problems/321" state={{ ...base, currentClaimId: claim.id, claims: [claim], reviews: [review] } as never} />);
    expect(screen.getByRole("heading", { name: "What was checked" })).toBeInTheDocument();
    expect(screen.getByText(/agent:producer/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Full verification record" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=record");
    expect(screen.queryByText(/vvr_/u)).toBeNull();
  });

  it("points at the source's own audit as a source-published fact", () => {
    render(<ProvenanceSummary basePath="/problems/erdos-problems/321" state={{ ...base, sourceAudits: [{ fixture_id: "f" }] } as never} />);
    expect(screen.getByText("No contribution to this Problem has been checked by this Repository.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "its own audit" })).toHaveAttribute("href", "/problems/erdos-problems/321?view=sources");
  });
});
