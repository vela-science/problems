import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const activityMock = vi.hoisted(() => ({
  ActivityDataError: class ActivityDataError extends Error {
    constructor(public readonly code: string, message: string) { super(message); }
  },
}));
vi.mock("@vela/activity-data", () => activityMock);
const mocks = vi.hoisted(() => ({
  account: null as null | { activity: { id: string } },
  update: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/hosted-account", () => ({
  currentActivityAccount: () => Promise.resolve(mocks.account),
  updateAccountProfile: mocks.update,
}));

import { savePublicProfileAction, type ProfileActionState } from "./profile";

const initialProfileActionState: ProfileActionState = { status: "idle", message: "" };

function form(version = "0") {
  const value = new FormData();
  for (const [name, field] of Object.entries({
    version,
    handle: "ada-lovelace",
    displayName: "Ada Lovelace",
    bio: "Exact scientific computation.",
    affiliation: "Analytical Engine Institute",
    visibility: "private",
    github: "",
    orcid: "",
    website: "",
    lab: "",
  })) value.set(name, field);
  return value;
}

describe("public profile action", () => {
  beforeEach(() => {
    mocks.account = { activity: { id: "account-1" } };
    mocks.update.mockReset().mockResolvedValue({ handle: "ada-lovelace", version: 2 });
    mocks.revalidate.mockClear();
  });

  it("returns the saved version so a second edit does not submit stale state", async () => {
    await expect(savePublicProfileAction(initialProfileActionState, form("1"))).resolves.toMatchObject({
      status: "success",
      handle: "ada-lovelace",
      version: 2,
    });
    expect(mocks.update).toHaveBeenCalledWith("account-1", expect.objectContaining({ handle: "ada-lovelace" }), 1);
    expect(mocks.revalidate).toHaveBeenCalledWith("/account/profile");
  });

  it("fails closed when the private session expires", async () => {
    mocks.account = null;
    await expect(savePublicProfileAction(initialProfileActionState, form())).resolves.toMatchObject({ status: "error", message: expect.stringMatching(/session expired/iu) });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("turns a collision or stale version into a recoverable error", async () => {
    mocks.update.mockRejectedValue(new activityMock.ActivityDataError("conflict", "version conflict"));
    await expect(savePublicProfileAction(initialProfileActionState, form("1"))).resolves.toMatchObject({ status: "error", message: expect.stringMatching(/unavailable|another tab/iu) });
  });
});
