import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { accountIdentity, accountReturnTo, authConfiguration, callbackUriFor } from "@/lib/auth";

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
    expect(authConfiguration({ ...completeEnvironment, NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://problems.science/auth/callback#fragment" })).toEqual({
      enabled: false,
      reason: "invalid_redirect_uri",
    });
    expect(authConfiguration({ ...completeEnvironment, NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://user:password@problems.science/auth/callback" })).toEqual({
      enabled: false,
      reason: "invalid_redirect_uri",
    });
    expect(authConfiguration({ ...completeEnvironment, NEXT_PUBLIC_WORKOS_REDIRECT_URI: "http://problems.science/auth/callback" })).toEqual({
      enabled: false,
      reason: "invalid_redirect_uri",
    });
  });

  it.each([
    "http://localhost:4322/auth/callback",
    "http://localhost:9876/auth/callback",
    "http://127.0.0.1:5173/auth/callback",
  ])("accepts a valid local callback without assigning a canonical port: %s", (redirectUri) => {
    expect(authConfiguration({
      ...completeEnvironment,
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: redirectUri,
    })).toEqual({ enabled: true });
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
    expect(accountReturnTo(completeEnvironment)).toBe("https://problems.science/problems");
    expect(accountReturnTo({
      ...completeEnvironment,
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: "http://127.0.0.1:5173/auth/callback",
    })).toBe("http://127.0.0.1:5173/problems");
    expect(accountReturnTo({
      ...completeEnvironment,
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://attacker.example/other",
    })).toBeNull();
  });
});

describe("the callback a request should use", () => {
  const env = { NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://problems.science/auth/callback" };

  /* The development port stopped needing a rebuild. `NEXT_PUBLIC_` makes Next
     inline the value into the server bundle, and AuthKit freezes it in a module
     constant, so overriding it at startup did nothing: a server on 3000 still
     sent the 4322 callback it was built with. */
  it("follows a loopback request onto whatever port it is serving", () => {
    expect(callbackUriFor("http://localhost:4322/sign-in", env)).toBe("http://localhost:4322/auth/callback");
    expect(callbackUriFor("http://localhost:3000/sign-in", env)).toBe("http://localhost:3000/auth/callback");
    expect(callbackUriFor("http://127.0.0.1:5173/sign-in", env)).toBe("http://localhost:5173/auth/callback");
    /* `next start` binds every interface, so Next reports the bind address
       rather than the host anyone typed. The port is what matters. */
    expect(callbackUriFor("http://0.0.0.0:3000/sign-in", env)).toBe("http://localhost:3000/auth/callback");
  });

  /* A request's Host is attacker-controllable. Letting it name the callback is
     how a sign-in is pointed at somebody else's domain, so only loopback may
     float and everything else keeps the configured value. */
  it("never lets a non-loopback request name its own callback", () => {
    for (const hostile of [
      "https://attacker.example/sign-in",
      "http://attacker.example/sign-in",
      "https://problems.science.attacker.example/sign-in",
      "http://localhost.attacker.example/sign-in",
    ]) {
      expect(callbackUriFor(hostile, env)).toBe(env.NEXT_PUBLIC_WORKOS_REDIRECT_URI);
    }
  });

  /* Production is unchanged: its own origin is not loopback, so it keeps the
     configured value whatever the request carries. */
  it("keeps the configured callback in production", () => {
    expect(callbackUriFor("https://problems.science/sign-in", env)).toBe(env.NEXT_PUBLIC_WORKOS_REDIRECT_URI);
  });

  it("falls back when the request url is unusable", () => {
    expect(callbackUriFor("not a url", env)).toBe(env.NEXT_PUBLIC_WORKOS_REDIRECT_URI);
  });
});
