import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  configured: true,
  account: null as null | { hosted: { id: string; displayName: string; email: string; initials: string }; activity: { id: string } },
  redirect: vi.fn(),
  workspaces: vi.fn(),
  connections: vi.fn(),
  identity: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: (href: string) => { mocks.redirect(href); throw new Error("NEXT_REDIRECT"); } }));
vi.mock("@/lib/auth", () => ({ authConfiguration: () => mocks.configured ? { enabled: true } : { enabled: false, reason: "missing" } }));
vi.mock("@/lib/hosted-account", () => ({
  currentActivityAccount: () => Promise.resolve(mocks.account),
  accountWorkspaces: mocks.workspaces,
  accountGitHubConnections: mocks.connections,
}));
vi.mock("@/lib/github-app", () => ({ githubAppConfiguration: () => ({ enabled: true }) }));
vi.mock("@/lib/workos-identities", () => ({ githubIdentityForUser: mocks.identity }));
vi.mock("@/app/actions/auth", () => ({ signOutAccount: vi.fn() }));

import AccountPage from "./page";

beforeEach(() => {
  mocks.configured = true;
  mocks.account = null;
  mocks.redirect.mockClear();
  mocks.workspaces.mockResolvedValue([]);
  mocks.connections.mockResolvedValue({ installations: [], repositories: [], codebases: [] });
  mocks.identity.mockResolvedValue(null);
});

describe("Account page", () => {
  it("returns a signed-out visitor to the account after authentication", async () => {
    await expect(AccountPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in?returnTo=/account");
  });

  it("keeps an unconfigured environment on the public Problems product", async () => {
    mocks.configured = false;
    await expect(AccountPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/problems");
  });

  it("renders the private hub for a signed-in account", async () => {
    mocks.account = { hosted: { id: "user_01", displayName: "Ada Lovelace", email: "ada@example.org", initials: "AL" }, activity: { id: "activity_01" } };
    render(await AccountPage());

    expect(screen.getByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Continue your work" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Connected codebases" })).toBeVisible();
    expect(mocks.workspaces).toHaveBeenCalledWith("activity_01");
    expect(mocks.connections).toHaveBeenCalledWith("activity_01");
    expect(mocks.identity).toHaveBeenCalledWith("user_01");
  });
});
