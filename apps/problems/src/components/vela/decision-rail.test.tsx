import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { DecisionRail, type DecisionMark } from "@/components/vela/decision-rail";

/* Fixed instants, so a position assertion is arithmetic rather than a snapshot
   of whatever the projection held on the day the test was written. */
const snapshot = "2026-08-05T18:30:00.000Z";
const start = "2026-08-03T18:30:00.000Z";
const middle = "2026-08-04T18:30:00.000Z";

function mark(overrides: Partial<DecisionMark> & { proposalId: string }): DecisionMark {
  return {
    status: "accepted",
    at: start,
    actor: "agent:codex",
    reason: null,
    verification: "pass",
    verifiers: ["verifier:example-v1"],
    ...overrides,
  };
}

function positions(container: HTMLElement): string[] {
  return [...container.querySelectorAll("li")].map((item) => item.style.left);
}

/* The suite is not run with vitest globals, so the library's own teardown is
   never registered and a `screen` query would otherwise read every earlier
   render in the file. */
afterEach(cleanup);

describe("DecisionRail", () => {
  test("draws nothing when no Proposal carries a time", () => {
    const { container } = render(
      <DecisionRail slug="erdos" snapshotAt={snapshot} marks={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("drops a Proposal whose reviewed and created instants are both absent", () => {
    render(
      <DecisionRail
        slug="erdos"
        snapshotAt={snapshot}
        marks={[
          mark({ proposalId: "vpr_timed" }),
          mark({ proposalId: "vpr_untimed", at: null }),
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("link").getAttribute("href")).toContain("vpr_timed");
  });

  test("renders rows without a time axis below three Proposals", () => {
    const { container } = render(
      <DecisionRail
        slug="erdos"
        snapshotAt={snapshot}
        marks={[mark({ proposalId: "vpr_one" }), mark({ proposalId: "vpr_two", at: middle })]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(positions(container)).toEqual(["", ""]);
    expect(container.querySelectorAll("time")).toHaveLength(0);
    expect(screen.getByRole("figure").textContent).not.toContain("rank");
  });

  test("renders rows without a time axis when every Proposal shares the snapshot instant", () => {
    const { container } = render(
      <DecisionRail
        slug="erdos"
        snapshotAt={snapshot}
        marks={[
          mark({ proposalId: "vpr_one", at: snapshot }),
          mark({ proposalId: "vpr_two", at: snapshot }),
          mark({ proposalId: "vpr_three", at: snapshot }),
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(positions(container)).toEqual(["", "", ""]);
  });

  test("places each mark at its own instant between the first Proposal and the snapshot", () => {
    const { container } = render(
      <DecisionRail
        slug="erdos"
        snapshotAt={snapshot}
        marks={[
          mark({ proposalId: "vpr_first", at: start }),
          mark({ proposalId: "vpr_middle", at: middle }),
          mark({ proposalId: "vpr_last", at: snapshot }),
        ]}
      />,
    );
    /* Newest first, which is the order the ledger reads in. */
    expect(positions(container)).toEqual(["96%", "50%", "4%"]);
    const labels = [...container.querySelectorAll("time")].map((label) => label.getAttribute("dateTime"));
    expect(labels).toEqual([start, snapshot]);
  });

  test("carries the same ledger text in the same DOM as the marks", () => {
    render(
      <DecisionRail
        slug="erdos"
        snapshotAt={snapshot}
        marks={[
          mark({ proposalId: "vpr_first", at: start }),
          mark({ proposalId: "vpr_middle", at: middle, status: "withdrawn", verification: "not_attempted", verifiers: [] }),
          mark({ proposalId: "vpr_last", at: snapshot, status: "rejected" }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("1 of 3. Proposal rejected");
    expect(items[1]).toHaveTextContent("No Verification Record is retained.");
    expect(items[2]).toHaveTextContent("1 Verification Record retained, every recorded outcome pass.");
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  /* `error` and `inconclusive` are two of the protocol's four outcomes, and the
     rail once printed the first as the second. */
  test("names a check that errored rather than restating it as inconclusive", () => {
    render(
      <DecisionRail
        slug="erdos"
        snapshotAt={snapshot}
        marks={[mark({ proposalId: "vpr_errored", verification: "error" })]}
      />,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("a recorded outcome is error");
    expect(screen.getByRole("listitem")).not.toHaveTextContent("inconclusive");
  });

  /* The mark is the ledger's mark. A second glyph drawn here disagreed with it
     about withdrawn, and collapsed fail and inconclusive into one core. */
  test("draws the shared Proposal glyph, not a second vocabulary", () => {
    const { container } = render(
      <DecisionRail
        slug="erdos"
        snapshotAt={snapshot}
        marks={[
          mark({ proposalId: "vpr_first", at: start, status: "withdrawn", verification: "not_attempted" }),
          mark({ proposalId: "vpr_middle", at: middle, status: "rejected", verification: "fail" }),
          mark({ proposalId: "vpr_last", at: snapshot, verification: "error" }),
        ]}
      />,
    );
    const glyphs = [...container.querySelectorAll("[data-proposal]")];
    expect(glyphs.map((glyph) => glyph.getAttribute("data-proposal")))
      .toEqual(["accepted", "rejected", "withdrawn"]);
    expect(glyphs.map((glyph) => glyph.getAttribute("data-verification")))
      .toEqual(["error", "fail", "not_attempted"]);
  });

  test("keeps Proposal status off the Claim standing axis", () => {
    const { container } = render(
      <DecisionRail
        slug="erdos"
        snapshotAt={snapshot}
        marks={[
          mark({ proposalId: "vpr_first", at: start, status: "rejected" }),
          mark({ proposalId: "vpr_middle", at: middle, status: "withdrawn" }),
          mark({ proposalId: "vpr_last", at: snapshot, status: "pending_review" }),
        ]}
      />,
    );
    const text = container.textContent ?? "";
    for (const standing of ["retracted", "superseded", "corrected", "unassessed"]) {
      expect(text).not.toContain(standing);
    }
    expect(container.querySelector("[data-state]")).toBeNull();
  });

  test("states what the marks decode to, and that position is not rank", () => {
    render(
      <DecisionRail
        slug="erdos"
        snapshotAt={snapshot}
        marks={[
          mark({ proposalId: "vpr_first", at: start, verifiers: ["a", "b"] }),
          mark({ proposalId: "vpr_middle", at: middle }),
          mark({ proposalId: "vpr_last", at: snapshot }),
        ]}
      />,
    );
    const caption = screen.getByRole("figure").querySelector("figcaption");
    expect(caption).toHaveTextContent("4 Verification Records under 3 Proposals");
    expect(caption).toHaveTextContent("the core is the Verification outcome");
    expect(caption).toHaveTextContent("It is not rank and confers nothing.");
  });
});
