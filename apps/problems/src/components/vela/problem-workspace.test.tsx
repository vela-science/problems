import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScientificProblemState } from "@/lib/scientific-state";

vi.mock("server-only", () => ({}));

import { EmptyHostedWorkspace, ProblemWorkspace, workspaceObjects } from "./problem-workspace";

const state = {
  repositorySlug: "math",
  repositoryName: "Math",
  problem: { problem: "321" },
  source: {
    native_revision: "a".repeat(40),
    locators: [{ url: `https://github.com/teorth/erdosproblems/blob/${"a".repeat(40)}/data/problems.yaml` }],
  },
  anchor: { sourceCommit: "a".repeat(40) },
} as unknown as NonNullable<ScientificProblemState>;
const anchorRoot = `sha256:${"1".repeat(64)}` as const;
const workspace = { id: "workspace-1", name: "Problem 321", version: 1 } as unknown as Parameters<typeof workspaceObjects>[0]["workspace"];
const scope = { repository: "math", problem: "321", workspaceId: "workspace-1", expectedAnchorRoot: anchorRoot };

describe("Problem Workspace", () => {
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

  it("keeps signed-out coordination separate from scientific State", async () => {
    vi.stubEnv("NEXT_PUBLIC_WORKOS_REDIRECT_URI", "http://127.0.0.1:4322/auth/callback");
    render(await ProblemWorkspace({ basePath: "/problems/erdos-problems/321", state, hostedAccount: null }));
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeVisible();
    expect(screen.getByLabelText("Public workspace context")).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in to contribute" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Continue locally" })).toHaveAttribute("href", expect.stringMatching(/^vela-workbench:\/\/continue\?/u));
    expect(screen.getByText(/does not clone, switch, upload, or execute/iu)).toBeVisible();
    /* Coordination features are still named, so a signed-out reader knows
       they exist and what an account is for — but they no longer occupy the
       panel. What is scientific and public (which statements the source still
       marks open) is shown; what is coordination stays behind the account. */
    expect(screen.getByRole("complementary", { name: "Open work" })).toBeVisible();
    expect(screen.getByText(/need an account/u)).toBeVisible();
    expect(screen.queryByText("Sign in to view")).not.toBeInTheDocument();
  });

  it("offers no dead sign-in when accounts are unavailable", async () => {
    render(await ProblemWorkspace({ basePath: "/problems/erdos-problems/321", state, hostedAccount: null, accountsEnabled: false }));
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Sign in to contribute" })).not.toBeInTheDocument();
    expect(screen.getByText("sign-in unavailable")).toBeVisible();
    expect(screen.getByLabelText("Public workspace context")).toBeVisible();
  });

  it("starts one Problem-scoped Workspace", () => {
    render(<EmptyHostedWorkspace state={state} accountId="account-1" workbenchHandoff={`vela-workbench://continue?v=1&ref=${"a".repeat(40)}`} />);
    expect(screen.getByRole("heading", { name: "Start a workspace" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Continue locally" })).toBeVisible();
    expect(screen.getByText(/does not clone, switch, upload, or execute/iu)).toBeVisible();
    /* No Files rail and no "Workspace tools" list. The hosted workspace
       coordinates — notes, approaches, a contribution draft — and the file and
       tool work belongs to Workbench, which is what "Continue locally" above
       hands off to. Drawing an instrument the browser does not own advertised
       a product that is not this one. */
    expect(screen.queryByLabelText("Problem files")).toBeNull();
    expect(screen.queryByLabelText("Workspace tools")).toBeNull();
    expect(screen.getByText(/Source files and local tools stay in Workbench/iu)).toBeVisible();
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
    const objects = workspaceObjects({ state, activity, workspace, scope, currentAnchorRoot: anchorRoot, basePath: "/problems/erdos-problems/321" });
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
    const object = workspaceObjects({ state, activity, workspace, scope, currentAnchorRoot: anchorRoot, basePath: "/problems/erdos-problems/321" })
      .find(({ id }) => id === "approach:stale")!;
    render(<>{object.content}</>);
    expect(screen.getByText("Earlier activity anchor")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Start Attempt/iu })).not.toBeInTheDocument();
  });

  it("turns an unsigned draft into a truthful local-to-public handoff", () => {
    const activity = {
      approaches: [], attempts: [], artifacts: [],
      drafts: [{
        id: "draft-1", payloadRoot: `sha256:${"8".repeat(64)}`,
        anchorRoot, version: 1,
      }],
    } as unknown as Parameters<typeof workspaceObjects>[0]["activity"];
    const object = workspaceObjects({ state, activity, workspace, scope, currentAnchorRoot: anchorRoot, basePath: "/problems/erdos-problems/321" })
      .find(({ id }) => id === "draft:draft-1")!;
    render(<>{object.content}</>);
    expect(screen.getByRole("link", { name: "Download unsigned draft" })).toHaveAttribute("href", "/drafts/draft-1/export?workspace=workspace-1");
    expect(screen.getByLabelText("Result handoff")).toBeVisible();
    expect(screen.getByRole("link", { name: "Repository instructions" })).toHaveAttribute("href", "/repositories/math/contribute");
    expect(screen.getByRole("link", { name: "Results" })).toHaveAttribute("href", "/problems/erdos-problems/321/results");
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/problems/erdos-problems/321/history");
    expect(screen.queryByText(/submission:sign-local/iu)).not.toBeInTheDocument();
  });
});
