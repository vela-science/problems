import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DecisionPacketSummary } from "@vela/projection-data";
import { DecisionBoundary } from "./decision-boundary";

/* A fixture, and this is the reason to say so out loud: the projection nulls
   `decision_packet` on every terminal Proposal and the release's 18 Proposals
   are all accepted, so nothing on the live site renders this component. These
   tests are the only thing exercising it until a Proposal is open. */
const packet = (over: Partial<DecisionPacketSummary> = {}): DecisionPacketSummary => ({
  entry_root: `sha256:${"a".repeat(64)}`,
  conditions: [],
  readiness: {
    protocol_gate: "satisfied",
    attributed_decision_required: true,
    rejection_available: true,
    blockers: [],
  },
  standing_delta: {
    transition: "claim.add",
    scope: { kind: "claim", target_claim_id: "vcl_1234567890abcdef", affected_claim_ids: ["vcl_1234567890abcdef"] },
    before: { repository_root: `sha256:${"b".repeat(64)}`, accepted: [] },
    if_accept: { repository_root: `sha256:${"c".repeat(64)}`, accepted: [] },
    if_reject: { repository_root: `sha256:${"d".repeat(64)}`, accepted: [] },
    counts: {
      unchanged_accepted_claims: 2782,
      global_accepted_claims: { before: 2844, if_accept: 2845, if_reject: 2844 },
    },
  },
  limits: ["Verification is scoped evidence only."],
  next_obligation: { now: "Await a Decision.", if_accept: "Replay the accepted change.", if_reject: "Revise the Submission." },
  ...over,
});

describe("DecisionBoundary", () => {
  /* The arithmetic is the point. A reader comparing accept against reject needs
     the number the repository is currently at, or both outcomes read as
     arbitrary — so all three are rendered and the two outcomes carry their
     delta from the current one. */
  it("shows what each ruling would do to the accepted set", () => {
    const view = render(<DecisionBoundary packet={packet()} />);

    /* 2,844 twice on purpose — the current count and the reject outcome are the
       same number, and showing both is what makes "reject changes nothing"
       legible rather than something a reader has to infer. */
    expect(screen.getAllByText("2,844")).toHaveLength(2);
    expect(screen.getByText("2,845")).toBeVisible();
    expect(screen.getByText("+1")).toBeVisible();
    expect(screen.getAllByText("unchanged")).toHaveLength(2);    view.unmount();
  });

  /* A satisfied gate is the case most likely to be misread as an approval, so
     it must say in words that it is not one. */
  it("says the gate opening is not the Decision", () => {
    const view = render(<DecisionBoundary packet={packet()} />);

    expect(screen.getByText("Protocol gate satisfied")).toBeVisible();
    expect(screen.getByText(/Whether it happens is an attributed ruling/u)).toBeVisible();
    expect(screen.getByText(/Only an attributed Decision by repository authority/u)).toBeVisible();    view.unmount();
  });

  it("names every blocker holding a blocked gate", () => {
    const view = render(<DecisionBoundary packet={packet({
      readiness: {
        protocol_gate: "blocked",
        attributed_decision_required: true,
        rejection_available: false,
        blockers: [
          { code: "target_index_stale", subject: "vcl_deadbeefdeadbeef", detail: "The target index is behind the commit." },
        ],
      },
    })} />);

    expect(screen.getByText(/Protocol gate blocked/u)).toBeVisible();
    expect(screen.getByText("target_index_stale")).toBeVisible();
    expect(screen.getByText("The target index is behind the commit.")).toBeVisible();
    expect(screen.getByText(/rejection unavailable/u)).toBeVisible();
    expect(screen.getByText(/Refused until every blocker below is cleared/u)).toBeVisible();    view.unmount();
  });

  it("carries the obligation each ruling would leave", () => {
    const view = render(<DecisionBoundary packet={packet()} />);

    expect(screen.getByText("Await a Decision.")).toBeVisible();
    expect(screen.getByText("Replay the accepted change.")).toBeVisible();
    expect(screen.getByText("Revise the Submission.")).toBeVisible();
    expect(screen.getByText("Verification is scoped evidence only.")).toBeVisible();    view.unmount();
  });
});
