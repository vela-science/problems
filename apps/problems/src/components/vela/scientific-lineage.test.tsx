import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScientificLineage } from "./scientific-lineage";

const state = {
  repositorySlug: "math",
  problem: { declared_status: "open" },
  source: { source_id: "source:erdos-problems" },
  currentClaimId: "vcl_current",
  claims: [{ id: "vcl_current", assertion: "A bounded computational result", standing: "accepted" }],
  reviews: [{
    proposal_id: "vpr_current",
    status: "accepted",
    claim: "A bounded computational result",
    decision_provenance: "signed_record",
    verification_records: [
      { verification_record_id: "vvr_1", outcome: "pass" },
      { verification_record_id: "vvr_2", outcome: "inconclusive" },
    ],
  }],
};

describe("ScientificLineage", () => {
  it("keeps source, Contribution, checks, and Decision legibly distinct", () => {
    render(<ScientificLineage state={state as never} />);
    expect(screen.getByText("1 · Source question")).toBeInTheDocument();
    expect(screen.getByText("2 · Contribution")).toBeInTheDocument();
    expect(screen.getByText("3 · Scoped checks")).toBeInTheDocument();
    expect(screen.getByText("4 · Current local state")).toBeInTheDocument();
    expect(screen.getByText(/A check observes a Contribution/u)).toBeInTheDocument();
    expect(screen.getByText("Decision retained")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open the exact proposed change/u })).toHaveAttribute("href", "/repositories/math/proposals/vpr_current");
  });

  it("fails closed when no retained Contribution exists", () => {
    render(<ScientificLineage state={{ ...state, currentClaimId: null, claims: [], reviews: [] } as never} />);
    expect(screen.getByText("No Contribution is retained here yet.")).toBeInTheDocument();
    expect(screen.getByText("No Decision retained")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open the exact proposed change/u })).not.toBeInTheDocument();
  });
});
