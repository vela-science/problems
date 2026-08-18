import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScientificProblemState } from "@/lib/scientific-state";

vi.mock("server-only", () => ({}));

import { EmptyHostedWorkspace, ProblemWorkspace, workspaceObjects } from "./problem-workspace";

const state = {
  repositorySlug: "math",
  repositoryName: "Math",
  problem: { problem: "321" },
  anchor: {},
} as unknown as NonNullable<ScientificProblemState>;
const anchorRoot = `sha256:${"1".repeat(64)}` as const;
const workspace = { id: "workspace-1", name: "Problem 321", version: 1 } as unknown as Parameters<typeof workspaceObjects>[0]["workspace"];
const scope = { repository: "math", problem: "321", workspaceId: "workspace-1", expectedAnchorRoot: anchorRoot };

describe("Problem Workspace", () => {
  afterEach(cleanup);

  it("keeps signed-out coordination separate from scientific State", async () => {
    render(await ProblemWorkspace({ basePath: "/problems/erdos-problems/321", state, hostedAccount: null }));
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeVisible();
    expect(screen.getByLabelText("Public workspace context")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open research map" })).toHaveAttribute(
      "href",
      "/graph?repository=math&lens=research",
    );
    expect(screen.getByRole("link", { name: "Sign in to contribute" })).toBeVisible();
    expect(screen.getByText("Research Blocks")).toBeVisible();
    expect(screen.getByText("Notes")).toBeVisible();
  });

  it("offers no dead sign-in when accounts are unavailable", async () => {
    render(await ProblemWorkspace({ basePath: "/problems/erdos-problems/321", state, hostedAccount: null, accountsEnabled: false }));
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Sign in to contribute" })).not.toBeInTheDocument();
    expect(screen.getByText("sign-in unavailable")).toBeVisible();
    expect(screen.getByLabelText("Public workspace context")).toBeVisible();
  });

  it("starts one Problem-scoped Workspace", () => {
    render(<EmptyHostedWorkspace state={state} accountId="account-1" />);
    expect(screen.getByRole("heading", { name: "Start a workspace" })).toBeVisible();
    expect(screen.getByLabelText("Problem files")).toBeVisible();
    expect(screen.getByLabelText("Workspace tools")).toBeVisible();
    expect(screen.queryByText("account-1")).toBeNull();
  });

  it("builds current Problem-scoped activity and exact contribution handoffs", () => {
    const activity = {
      approaches: [{
        id: "approach-1", title: "Finite reduction", summary: "Reduce the obstruction.", state: "open",
        anchorRoot, version: 1, authorityEffect: "none", parentApproachId: null,
      }],
      attempts: [{
        id: "attempt-1", approachId: "approach-1", title: "Repair attempt",
        state: "completed", anchorRoot, version: 1,
      }],
      artifacts: [{
        id: "artifact-1", attemptId: "attempt-1", path: "artifacts/result.json", kind: "repair-result",
        contentRoot: `sha256:${"6".repeat(64)}`, anchorRoot,
      }],
      drafts: [],
    } as unknown as Parameters<typeof workspaceObjects>[0]["activity"];
    const objects = workspaceObjects({ state, activity, workspace, scope, currentAnchorRoot: anchorRoot });
    expect(objects.map(({ id }) => id)).toContain("codebase:math");
    expect(objects.map(({ id }) => id)).toContain("approach:approach-1");

    const overview = objects.find(({ id }) => id === "workspace")!;
    render(<>{overview.content}</>);
    fireEvent.click(screen.getByRole("button", { name: /Attach evidence/iu }));
    expect(screen.getByRole("combobox", { name: "Producing Attempt" })).toBeRequired();
    expect(screen.getByRole("combobox", { name: "Evidence type" })).toBeRequired();
    fireEvent.click(screen.getByRole("button", { name: /Prepare local handoff/iu }));
    expect(screen.getByRole("combobox", { name: "Research Block" })).toBeRequired();
  });

  it("keeps an earlier Problem anchor readable but not writable", () => {
    const staleRoot = `sha256:${"3".repeat(64)}` as const;
    const activity = {
      approaches: [{
        id: "stale", title: "Earlier direction", summary: "Retained context.", state: "open",
        anchorRoot: staleRoot, version: 1, authorityEffect: "none", parentApproachId: null,
      }],
      attempts: [], artifacts: [], drafts: [],
    } as unknown as Parameters<typeof workspaceObjects>[0]["activity"];
    const object = workspaceObjects({ state, activity, workspace, scope, currentAnchorRoot: anchorRoot })
      .find(({ id }) => id === "approach:stale")!;
    render(<>{object.content}</>);
    expect(screen.getByText("Earlier activity anchor")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Start Attempt/iu })).not.toBeInTheDocument();
  });
});
