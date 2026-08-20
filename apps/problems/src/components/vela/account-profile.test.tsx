import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountProfile, type AccountProfileData } from "./account-profile";

vi.mock("@/app/actions/auth", () => ({ signOutAccount: vi.fn() }));
vi.mock("@/app/actions/profile", () => ({
  initialProfileActionState: { status: "idle", message: "" },
  savePublicProfileAction: vi.fn(),
}));

const account = {
  id: "user_01",
  displayName: "Ada Lovelace",
  email: "ada@example.org",
  initials: "AL",
};

function data(overrides: Partial<AccountProfileData> = {}): AccountProfileData {
  return {
    account,
    publicProfile: { status: "ready", value: null },
    workspaces: {
      status: "ready",
      value: [{ id: "workspace_01", slug: "prime-gaps", name: "Prime gaps", role: "owner", updatedAt: "2026-08-17T12:00:00Z" }],
    },
    connections: {
      status: "ready",
      value: {
        githubIdentityConnected: true,
        githubAppEnabled: true,
        data: {
          installations: [{ installationId: 42, suspended: false }],
          repositories: [{ installationId: 42 }],
          codebases: [{ id: "codebase_01", fullName: "ada/proofs", visibility: "private", inspectionStatus: "structurally_inspected", syncState: "pinned" }],
        },
      },
    },
    ...overrides,
  };
}

describe("AccountProfile", () => {
  it("states the account's own facts and defers the rest to their pages", () => {
    render(<AccountProfile {...data()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeVisible();
    expect(screen.getByText("ada@example.org")).toBeVisible();
    expect(screen.getByText("Visible only to you")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Public contributor profile" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Create profile" })).toHaveAttribute("href", "/account/profile");
    expect(screen.queryByRole("radio")).toBeNull();
    /* The account holds no scientific authority, and says so. */
    expect(screen.getByText(/does not confer authorship, review independence, or Repository authority/iu)).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(screen.queryByText(/reputation|authority badge|score/iu)).not.toBeInTheDocument();
  });

  /* The page used to preview the first four workspaces and the first four
     codebases, restating `/my-work` — which is in the sidebar on every page —
     and `/account/connections`. It now carries one row each with the count,
     which is the part a reader came to check. */
  it("carries a count per destination rather than repeating its rows", () => {
    render(<AccountProfile {...data()} />);

    const work = screen.getByRole("link", { name: /My work/u });
    expect(work).toHaveAttribute("href", "/my-work");
    expect(work).toHaveTextContent("1 workspace");
    expect(work).toHaveTextContent("Prime gaps");

    const connections = screen.getByRole("link", { name: /Connections/u });
    expect(connections).toHaveAttribute("href", "/account/connections");
    expect(connections).toHaveTextContent("1 selected repository");
    expect(connections).toHaveTextContent("1 retained codebase");

    /* No second copy of the rows those pages own. */
    expect(screen.queryByRole("link", { name: /ada\/proofs/iu })).toBeNull();
  });

  it("says plainly when nothing is there, without inventing activity", () => {
    render(<AccountProfile {...data({
      workspaces: { status: "ready", value: [] },
      connections: { status: "ready", value: { githubIdentityConnected: false, githubAppEnabled: false, data: { installations: [], repositories: [], codebases: [] } } },
    })} />);

    expect(screen.getByText(/No workspace yet/iu)).toBeVisible();
    expect(screen.getByText("GitHub not linked")).toBeVisible();
    expect(screen.getByText(/Repository access is not configured in this environment/iu)).toBeVisible();
    expect(screen.getByText(/No public profile has been created/iu)).toBeVisible();
  });

  it("keeps the account usable when personal activity sources are unavailable", () => {
    render(<AccountProfile {...data({ workspaces: { status: "unavailable" }, connections: { status: "unavailable" } })} />);

    expect(screen.getAllByText("Unavailable").length).toBe(2);
    expect(screen.getByText(/saved work could not be read just now/iu)).toBeVisible();
    /* Both destinations stay reachable — a read failure is not a dead end. */
    expect(screen.getByRole("link", { name: /My work/u })).toHaveAttribute("href", "/my-work");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
