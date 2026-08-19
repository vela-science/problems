import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  account: null as null | { hosted: { displayName: string }; activity: { id: string } },
  profile: vi.fn(),
  redirect: vi.fn((href: string) => { throw new Error(`REDIRECT ${href}`); }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/hosted-account", () => ({
  currentActivityAccount: () => Promise.resolve(mocks.account),
  accountProfile: mocks.profile,
}));
vi.mock("@/components/vela/public-profile-settings", () => ({
  PublicProfileSettings: ({ profile, accountName }: { profile: null | { handle: string }; accountName: string }) => <div data-testid="settings">{profile?.handle ?? accountName}</div>,
}));

import AccountPublicProfilePage from "./page";

describe("Account public profile page", () => {
  beforeEach(() => {
    mocks.account = null;
    mocks.profile.mockReset().mockResolvedValue(null);
    mocks.redirect.mockClear();
  });

  it("returns a signed-out visitor to this exact private route", async () => {
    await expect(AccountPublicProfilePage()).rejects.toThrow("REDIRECT /sign-in?returnTo=/account/profile");
  });

  it("keeps editing in a dedicated private Account surface", async () => {
    mocks.account = { hosted: { displayName: "Ada Lovelace" }, activity: { id: "activity-1" } };
    render(await AccountPublicProfilePage());
    expect(screen.getByRole("heading", { level: 1, name: "Public profile" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
    expect(screen.getByTestId("settings")).toHaveTextContent("Ada Lovelace");
    expect(mocks.profile).toHaveBeenCalledWith("activity-1");
  });

  it("does not render a stale form when profile storage is unavailable", async () => {
    mocks.account = { hosted: { displayName: "Ada Lovelace" }, activity: { id: "activity-1" } };
    mocks.profile.mockRejectedValue(new Error("unavailable"));
    render(await AccountPublicProfilePage());
    expect(screen.getByText("Profile settings are unavailable")).toBeVisible();
    expect(screen.queryByTestId("settings")).toBeNull();
  });
});
