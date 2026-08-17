import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountProfile, type AccountProfileData } from "./account-profile";

vi.mock("@/app/actions/auth", () => ({ signOutAccount: vi.fn() }));

const account = {
  id: "user_01",
  displayName: "Ada Lovelace",
  email: "ada@example.org",
  initials: "AL",
};

function data(overrides: Partial<AccountProfileData> = {}): AccountProfileData {
  return {
    account,
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
  it("presents a private profile hub backed by actual work and connections", () => {
    render(<AccountProfile {...data()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeVisible();
    expect(screen.getByText("ada@example.org")).toBeVisible();
    expect(screen.getByText("Visible only to you")).toBeVisible();
    expect(screen.getByText(/Scientific attribution stays with each Contribution/iu)).toBeVisible();
    expect(screen.getByRole("link", { name: "My work" })).toHaveAttribute("href", "/my-work");
    expect(screen.getByRole("link", { name: "Manage connections" })).toHaveAttribute("href", "/account/connections");
    expect(screen.getByText("Prime gaps")).toBeVisible();
    expect(screen.getByRole("link", { name: /ada\/proofs/iu })).toHaveAttribute("href", "/codebases/codebase_01");
    expect(screen.getByText("1 selected repository")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(screen.queryByText(/reputation|authority badge|score/iu)).not.toBeInTheDocument();
  });

  it("uses useful empty states without inventing activity", () => {
    render(<AccountProfile {...data({
      workspaces: { status: "ready", value: [] },
      connections: { status: "ready", value: { githubIdentityConnected: false, githubAppEnabled: false, data: { installations: [], repositories: [], codebases: [] } } },
    })} />);

    expect(screen.getByRole("heading", { name: "Start from a Problem" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse Problems" })).toHaveAttribute("href", "/problems");
    expect(screen.getByRole("heading", { name: "Bring in an exact Git revision" })).toBeVisible();
    expect(screen.getByText("Not linked")).toBeVisible();
    expect(screen.getByText("Not configured in this environment")).toBeVisible();
  });

  it("keeps the account usable when personal activity sources are unavailable", () => {
    render(<AccountProfile {...data({ workspaces: { status: "unavailable" }, connections: { status: "unavailable" } })} />);

    expect(screen.getByText("Your work could not be loaded")).toBeVisible();
    expect(screen.getByText("Codebase connections are unavailable")).toBeVisible();
    expect(screen.getByText("Connections unavailable")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
