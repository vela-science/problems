import { render, screen, within } from "@testing-library/react";
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
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(screen.queryByText(/reputation|authority badge|score/iu)).not.toBeInTheDocument();
  });

  /* The boundary is the most important thing this page says, and it was said
     eleven times across five files — a different disclaimer sentence under
     every heading, none of them describing what the two planes hold. It is one
     figure now: what this account holds, what a Repository holds, and the one
     crossing between them. This asserts both halves — that the figure is here,
     and that the prose it replaced has not crept back. */
  it("draws the authority boundary once instead of restating it", () => {
    render(<AccountProfile {...data()} />);

    const figure = screen.getByRole("region", { name: "Where your work lives" });
    expect(figure).toBeVisible();
    expect(within(figure).getByText("This account")).toBeVisible();
    expect(within(figure).getByText("A Vela Repository")).toBeVisible();
    expect(within(figure).getByText("Holds no signing key.")).toBeVisible();
    expect(within(figure).getByText(/holds the authority key/u)).toBeVisible();
    expect(within(figure).getByText(/signed locally with your own key/u)).toBeVisible();
    /* Standing, Decisions and Verification are named as things the Repository
       holds — never as something this account could produce. */
    for (const held of ["Claims", "Verification", "Decisions", "Standing"]) {
      expect(within(figure).getByText(held)).toBeVisible();
    }

    for (const disclaimer of [
      /does not confer authorship/iu,
      /never carries scientific authority/iu,
      /never grants scientific identity/iu,
      /do not establish authorship or truth/iu,
    ]) {
      expect(screen.queryByText(disclaimer)).not.toBeInTheDocument();
    }
  });

  /* The page used to preview the first four workspaces and the first four
     codebases, restating `/workspaces` — which is in the sidebar on every page —
     and `/account/connections`. It now carries one row each with the count,
     which is the part a reader came to check. */
  it("carries a count per destination rather than repeating its rows", () => {
    render(<AccountProfile {...data()} />);

    const work = screen.getByRole("link", { name: /Workspaces/u });
    expect(work).toHaveAttribute("href", "/workspaces");
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
    expect(screen.getByRole("link", { name: /Workspaces/u })).toHaveAttribute("href", "/workspaces");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
