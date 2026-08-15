import { describe, expect, it } from "vitest";
import { createGitHubInstallState, readGitHubInstallState } from "./github-install-state";

const environment = { WORKOS_COOKIE_PASSWORD: "x".repeat(32) };

describe("GitHub installation state", () => {
  it("binds account, identity, nonce, and expiry", () => {
    const state = createGitHubInstallState("account", "identity", 1_000, environment);
    expect(readGitHubInstallState(state, 2_000, environment)).toMatchObject({ accountId: "account", workosIdentityId: "identity" });
  });
  it("refuses tampering and expiration", () => {
    const state = createGitHubInstallState("account", "identity", 1_000, environment);
    expect(() => readGitHubInstallState(`${state}x`, 2_000, environment)).toThrow("invalid");
    expect(() => readGitHubInstallState(state, 1_000 + 10 * 60 * 1000 + 1, environment)).toThrow("expired");
  });
});
