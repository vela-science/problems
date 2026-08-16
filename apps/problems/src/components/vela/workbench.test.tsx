import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScientificProblemState } from "@/lib/scientific-state";

vi.mock("server-only", () => ({}));

import { EmptyHostedWorkbench, Workbench, workspaceObjects } from "./workbench";

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
    render(await Workbench({ basePath: "/problems/erdos-problems/321", state, hostedAccount: null }));
    expect(screen.getByRole("heading", { name: "Sign in to join this Workspace" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Shared coordination" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open codebase record" })).toBeVisible();
  });

  it("offers no dead sign-in when accounts are unavailable", async () => {
    render(await Workbench({ basePath: "/problems/erdos-problems/321", state, hostedAccount: null, accountsEnabled: false }));
    expect(screen.getByRole("heading", { name: "Hosted coordination is not enabled here" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.getByText(/Current State remains fully readable/u)).toBeVisible();
  });

  it("starts one Problem-scoped Workspace", () => {
    render(<EmptyHostedWorkbench state={state} accountId="account-1" />);
    expect(screen.getByRole("heading", { name: "Start a workspace for this Problem" })).toBeVisible();
    expect(screen.getByText("Hosted identity")).toBeVisible();
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
    fireEvent.click(screen.getByRole("button", { name: /Reference an exact contribution/iu }));
    expect(screen.getByRole("combobox", { name: "Producing Attempt" })).toBeRequired();
    fireEvent.click(screen.getByRole("button", { name: /Advanced: prepare exact handoff/iu }));
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
