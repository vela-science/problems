import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  currentAccount: vi.fn(),
  ensureCurrentAccount: vi.fn(),
  followProblem: vi.fn(),
  listWorkspaces: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  scientificAnchorRoot: vi.fn(),
  scientificProblemState: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ currentAccount: mocks.currentAccount }));
vi.mock("@/lib/scientific-state", () => ({ scientificProblemState: mocks.scientificProblemState }));
vi.mock("@vela/activity-data", () => ({
  addDiscussionEntry: vi.fn(),
  appendWorkspaceCrdtUpdate: vi.fn(),
  attachArtifact: vi.fn(),
  createApproach: vi.fn(),
  createAttempt: vi.fn(),
  createWorkspace: mocks.createWorkspace,
  ensureCurrentAccount: mocks.ensureCurrentAccount,
  followProblem: mocks.followProblem,
  forkApproach: vi.fn(),
  getProblemActivity: vi.fn(),
  listWorkspaces: mocks.listWorkspaces,
  saveSubmissionDraft: vi.fn(),
  scientificAnchorRoot: mocks.scientificAnchorRoot,
  updateAttempt: vi.fn(),
}));

import { createWorkspaceAction } from "./activity";

const anchor = {
  projectionReleaseRoot: `sha256:${"1".repeat(64)}`,
  repositoryId: "math",
  repositoryRoot: `sha256:${"2".repeat(64)}`,
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
  problemId: "321",
  problemRecordRoot: `sha256:${"3".repeat(64)}`,
  sourceObservationRoot: null,
  claimId: null,
  claimRoot: null,
  claimStanding: null,
};

const account = {
  id: "11111111-1111-4111-8111-111111111111",
  workosUserId: "user_1",
  displayName: "William Blair",
  email: "william@example.com",
};

const workspace = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "erdos-321-coordination",
  name: "Erdős 321 coordination",
  role: "owner" as const,
  version: 1,
  createdAt: "2026-08-14T00:02:29.321Z",
  updatedAt: "2026-08-14T00:02:29.321Z",
};

function form() {
  const value = new FormData();
  value.set("repository", "math");
  value.set("problem", "321");
  value.set("slug", workspace.slug);
  value.set("name", workspace.name);
  value.set("idempotencyKey", "workspace-create-1");
  return value;
}

describe("Problem Workspace creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentAccount.mockResolvedValue({
      id: "user_1",
      displayName: "William Blair",
      email: "william@example.com",
    });
    mocks.ensureCurrentAccount.mockResolvedValue(account);
    mocks.scientificProblemState.mockResolvedValue({ anchor });
    mocks.scientificAnchorRoot.mockReturnValue(`sha256:${"4".repeat(64)}`);
    mocks.createWorkspace.mockResolvedValue(workspace);
    mocks.followProblem.mockResolvedValue({});
  });

  it("binds a newly created Workspace to the exact current Problem before redirecting", async () => {
    mocks.listWorkspaces.mockResolvedValue([]);

    await createWorkspaceAction(form());

    expect(mocks.createWorkspace).toHaveBeenCalledWith(account.id, {
      slug: workspace.slug,
      name: workspace.name,
    }, { idempotencyKey: "workspace-create-1" });
    expect(mocks.followProblem).toHaveBeenCalledWith(
      { accountId: account.id, workspaceId: workspace.id },
      { anchor, following: true },
      { idempotencyKey: `${workspace.id}:sha256:${"4".repeat(64)}` },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/problems/erdos-problems/321?view=work&workspace=${workspace.id}`,
    );
    expect(mocks.followProblem.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.redirect.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY);
  });

  it("recovers an exact orphaned Workspace retry without creating a duplicate", async () => {
    mocks.listWorkspaces.mockResolvedValue([workspace]);

    await createWorkspaceAction(form());

    expect(mocks.createWorkspace).not.toHaveBeenCalled();
    expect(mocks.followProblem).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/problems/erdos-problems/321?view=work&workspace=${workspace.id}`,
    );
  });

  it("does not repurpose a same-slug Workspace with a different name", async () => {
    mocks.listWorkspaces.mockResolvedValue([{ ...workspace, name: "Different research" }]);

    await expect(createWorkspaceAction(form())).rejects.toThrow(
      "A Workspace with that slug already exists",
    );
    expect(mocks.createWorkspace).not.toHaveBeenCalled();
    expect(mocks.followProblem).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
