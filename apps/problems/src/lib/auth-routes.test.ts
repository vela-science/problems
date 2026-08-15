import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const auth = vi.hoisted(() => ({
  configured: false,
  account: null as null | { id: string; displayName: string; email: string; initials: string },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  authConfiguration: () => auth.configured
    ? { enabled: true as const }
    : { enabled: false as const, reason: "missing" as const },
  currentAccount: () => Promise.resolve(auth.account),
}));

import { GET as accountRoute } from "@/app/api/account/route";
import { GET as callbackRoute, isRecoverableCallbackError } from "@/app/auth/callback/route";
import { GET as signInRoute } from "@/app/sign-in/route";

const proxySource = readFileSync("src/proxy.ts", "utf8");

afterEach(() => {
  auth.configured = false;
  auth.account = null;
});

describe("account routes", () => {
  it("runs the account proxy on Problem pages that read an optional session", () => {
    expect(proxySource).toContain('"/p/:repository/:problem"');
    expect(proxySource).toContain('"/problems/:namespace/:problem"');
    for (const broad of ['"/p/:path*"', '"/auth/:path*"', '"/drafts/:path*"']) {
      expect(proxySource).not.toContain(broad);
    }
    for (const exact of [
      '"/account/:path*"',
      '"/api/account"',
      '"/api/github/:path*"',
      '"/auth/callback"',
      '"/drafts/:id/export"',
      '"/codebases/:path*"',
      '"/import"',
      '"/sign-in"',
    ]) {
      expect(proxySource).toContain(exact);
    }
  });

  it("keeps account state private and provider identifiers off the wire", async () => {
    auth.configured = true;
    auth.account = {
      id: "user_provider_secret",
      displayName: "Ada Lovelace",
      email: "ada@example.org",
      initials: "AL",
    };

    const response = await accountRoute();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(await response.json()).toEqual({
      status: "signed_in",
      account: { displayName: "Ada Lovelace", email: "ada@example.org", initials: "AL" },
    });
  });

  it("fails closed without provider configuration", async () => {
    const account = await accountRoute();
    expect(await account.json()).toEqual({ status: "unavailable" });

    const signIn = await signInRoute(new Request("https://problems.science/sign-in") as never);
    expect(signIn.status).toBe(503);
    expect(signIn.headers.get("Cache-Control")).toBe("no-store");

    const callback = await callbackRoute(new Request("https://problems.science/auth/callback") as never);
    expect(callback.status).toBe(503);
    expect(callback.headers.get("Cache-Control")).toBe("no-store");
  });

  it("restarts only callbacks whose short-lived browser state is missing or stale", () => {
    expect(isRecoverableCallbackError({ code: "missing_pkce_cookie" })).toBe(true);
    expect(isRecoverableCallbackError({ code: "missing_auth_params" })).toBe(true);
    expect(isRecoverableCallbackError({ code: "oauth_state_mismatch" })).toBe(true);
    expect(isRecoverableCallbackError({ code: "missing_tokens" })).toBe(false);
    expect(isRecoverableCallbackError(new Error("provider failure"))).toBe(false);
  });
});
