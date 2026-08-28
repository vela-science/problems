import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ account: vi.fn(), workspaces: vi.fn(), catalog: vi.fn() }));
vi.mock("@/lib/hosted-account", () => ({ currentActivityAccount: mocks.account }));
vi.mock("@vela/activity-data", () => ({ listWorkspaces: mocks.workspaces }));
vi.mock("@/lib/scientific-state", () => ({ discoveredProblems: mocks.catalog }));
vi.mock("@/components/vela/actor", () => ({ Performer: ({ name }: { name: string }) => <span>{name}</span> }));

import WorkspacesPage from "./page";

const root = (character: string) => `sha256:${character.repeat(64)}` as const;
const context = {
  projectionReleaseRoot: root("1"),
  repositoryId: "3d012325-3768-4b95-a385-c94e9f2a57a6",
  problemId: "erdos:321",
  anchorRoot: root("2"),
  capturedAt: "2026-08-19T00:00:00.000Z",
};
const anchored = {
  id: "workspace-anchored", slug: "problem-321", name: "Problem 321 work", role: "owner" as const,
  problemContexts: [context], version: 1, createdAt: "2026-08-18T00:00:00.000Z", updatedAt: "2026-08-19T00:00:00.000Z",
};
const unanchored = {
  id: "workspace-legacy", slug: "legacy", name: "Earlier workspace", role: "owner" as const,
  problemContexts: [], version: 1, createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-08-18T00:00:00.000Z",
};

describe("Workspaces", () => {
  beforeEach(() => {
    mocks.account.mockResolvedValue({
      activity: { id: "account-1" },
      hosted: { displayName: "Ada", email: "ada@example.org" },
    });
    mocks.workspaces.mockResolvedValue([anchored, unanchored]);
    mocks.catalog.mockResolvedValue([{
      releaseRoot: context.projectionReleaseRoot,
      repository: "math",
      problem: "321",
      canonicalPath: "/problems/erdos-problems/321",
      collection: { key: "erdos-problems", name: "Erdős Problems" },
      record: { node_id: "erdos:321", label: "Erdős problem 321" },
    }]);
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  /* The route was `/my-work`, titled "My work", above a section headed "Your
     workspaces" describing the same thing the page subtitle already described.
     One name, stated once, is the whole point of the rename. */
  it("names itself once", async () => {
    render(await WorkspacesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Workspaces");
    expect(screen.queryByRole("heading", { name: /^Your workspaces$/u })).not.toBeInTheDocument();
    expect(screen.queryByText(/My work/iu)).not.toBeInTheDocument();
  });

  it("makes every workspace row openable", async () => {
    render(await WorkspacesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: /Problem 321 work/iu })).toHaveAttribute("href", "/workspaces?workspace=workspace-anchored");
    expect(screen.getByRole("link", { name: /Earlier workspace/iu })).toHaveAttribute("href", "/workspaces?workspace=workspace-legacy");
  });

  it("opens exact Problem Work from a retained scientific anchor", async () => {
    render(await WorkspacesPage({ searchParams: Promise.resolve({ workspace: anchored.id }) }));
    expect(screen.getByRole("link", { name: /Erdős Problems · Erdős problem 321/iu })).toHaveAttribute(
      "href",
      "/problems/erdos-problems/321/work?workspace=workspace-anchored",
    );
  });

  it("does not guess a Problem from an unanchored legacy workspace", async () => {
    render(await WorkspacesPage({ searchParams: Promise.resolve({ workspace: unanchored.id }) }));
    expect(screen.getByText("No Problem context retained")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Find a Problem" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Find a Problem" })[1]).toHaveAttribute("href", "/problems");
    expect(screen.queryByText(/Erdős problem 321/iu)).not.toBeInTheDocument();
  });

  it("distinguishes a temporarily unavailable catalogue from an identity mismatch", async () => {
    mocks.catalog.mockRejectedValueOnce(new Error("projection unavailable"));
    render(await WorkspacesPage({ searchParams: Promise.resolve({ workspace: anchored.id }) }));
    expect(screen.getByText("Problem catalogue temporarily unavailable")).toBeVisible();
    expect(screen.getByText(/context is retained/iu)).toBeVisible();
    expect(screen.queryByText(/does not resolve in the current public catalogue/iu)).not.toBeInTheDocument();
  });
});
