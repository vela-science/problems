import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { accountIdentity, accountReturnTo, authConfiguration } from "@/lib/auth";

const completeEnvironment = {
  WORKOS_API_KEY: "sk_test_example",
  WORKOS_CLIENT_ID: "client_example",
  WORKOS_COOKIE_PASSWORD: "x".repeat(32),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://problems.science/auth/callback",
};

describe("Problems authentication boundary", () => {
  it("stays disabled until every provider value is present", () => {
    expect(authConfiguration({})).toEqual({ enabled: false, reason: "missing" });
    expect(authConfiguration(completeEnvironment)).toEqual({ enabled: true });
  });

  it("rejects weak cookie keys and unsafe callback URLs", () => {
    expect(authConfiguration({ ...completeEnvironment, WORKOS_COOKIE_PASSWORD: "short" })).toEqual({
      enabled: false,
      reason: "invalid_cookie_password",
    });
    expect(authConfiguration({ ...completeEnvironment, NEXT_PUBLIC_WORKOS_REDIRECT_URI: "javascript:alert(1)" })).toEqual({
      enabled: false,
      reason: "invalid_redirect_uri",
    });
    expect(authConfiguration({ ...completeEnvironment, NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://problems.science/wrong" })).toEqual({
      enabled: false,
      reason: "invalid_redirect_uri",
    });
    expect(authConfiguration({ ...completeEnvironment, NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://problems.science/auth/callback?next=elsewhere" })).toEqual({
      enabled: false,
      reason: "invalid_redirect_uri",
    });
  });

  it("projects only the account fields used by the product", () => {
    expect(accountIdentity({
      id: "user_01",
      email: "ada@example.org",
      firstName: "Ada",
      lastName: "Lovelace",
    } as never)).toEqual({
      id: "user_01",
      displayName: "Ada Lovelace",
      email: "ada@example.org",
      initials: "AL",
    });
  });

  it("derives the sign-out return from the validated callback origin", () => {
    expect(accountReturnTo(completeEnvironment)).toBe("https://problems.science/repositories");
    expect(accountReturnTo({
      ...completeEnvironment,
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://attacker.example/other",
    })).toBeNull();
  });
});
