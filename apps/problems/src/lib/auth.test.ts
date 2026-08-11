import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { authEnabled, hostedAccount } from "./auth";

describe("Problems hosted identity", () => {
  it("requires a strong cookie password and an exact callback", () => {
    const environment = {
      WORKOS_API_KEY: "sk_test",
      WORKOS_CLIENT_ID: "client_test",
      WORKOS_COOKIE_PASSWORD: "x".repeat(32),
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://problems.science/auth/callback",
    };
    expect(authEnabled(environment)).toBe(true);
    expect(authEnabled({ ...environment, WORKOS_COOKIE_PASSWORD: "weak" })).toBe(false);
    expect(authEnabled({ ...environment, NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://problems.science/auth/callback?next=/" })).toBe(false);
  });

  it("maps WorkOS only to a hosted account", () => {
    expect(hostedAccount({ id: "user_123", email: "ada@example.test", firstName: "Ada", lastName: "Lovelace" } as never)).toEqual({
      id: "user_123",
      displayName: "Ada Lovelace",
      email: "ada@example.test",
      initials: "AL",
    });
  });
});
