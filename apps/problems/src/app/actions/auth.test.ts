import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  returnTo: null as string | null,
  signOut: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ accountReturnTo: () => state.returnTo }));
vi.mock("@workos-inc/authkit-nextjs", () => ({ signOut: state.signOut }));

import { signOutAccount } from "@/app/actions/auth";

afterEach(() => {
  state.returnTo = null;
  state.signOut.mockReset();
});

describe("signOutAccount", () => {
  it("fails closed when product identity is not configured", async () => {
    await signOutAccount();
    expect(state.signOut).not.toHaveBeenCalled();
  });

  it("delegates session termination to AuthKit with the validated return", async () => {
    state.returnTo = "https://problems.science/problems";
    await signOutAccount();
    expect(state.signOut).toHaveBeenCalledOnce();
    expect(state.signOut).toHaveBeenCalledWith({ returnTo: "https://problems.science/problems" });
  });
});
