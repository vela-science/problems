import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { ProblemState } from "./problem-state";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;

const state = {
  repositorySlug: "math",
  repositoryName: "Vela Mathematics",
  problem: { problem: "321", declared_status: "solved", formalized: true, offer_count: 1 },
  claims: [{ id: `vcl_${"1".repeat(64)}`, assertion: "The local assertion.", standing: "accepted" }],
  offers: [{
    rank: 1,
    target_id: "erdos:321:bridge",
    title: "Prove the bridge",
    lane: "proof",
    objective: "Establish the exact implication without changing the statement.",
  }],
  source: { row_root: root("2"), metadata_root: root("3"), observation_root: root("4"), content_root: root("5") },
  anchor: { repositoryRoot: root("6"), projectionReleaseRoot: root("7"), sourceCommit: "8".repeat(40) },
  locator: "https://example.test/problem-321",
} as unknown as NonNullable<ScientificProblemState>;

describe("Problem State", () => {
  it("leads with Standing and real obligations, with exact records disclosed", async () => {
    const user = userEvent.setup();
    render(<ProblemState state={state} dossier="erdos-321" />);

    expect(screen.queryByRole("heading", { name: "Question" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current Standing" })).toBeInTheDocument();
    expect(screen.getByText("The local assertion.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Open obligations" })).toBeInTheDocument();
    expect(screen.getByText("Prove the bridge")).toBeInTheDocument();

    const exact = screen.getByRole("button", { name: /Exact basis/u });
    expect(screen.queryByText("Problem row")).not.toBeInTheDocument();
    await user.click(exact);
    expect(screen.getByText("Problem row")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read Dossier" })).toBeInTheDocument();
  });
});
