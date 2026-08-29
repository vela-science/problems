import "server-only";

import type { User } from "@workos-inc/node";

const requiredAuthVariables = [
  "WORKOS_API_KEY",
  "WORKOS_CLIENT_ID",
  "WORKOS_COOKIE_PASSWORD",
  "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
] as const;

const localHosts = new Set(["localhost", "127.0.0.1"]);

export type AccountIdentity = {
  id: string;
  displayName: string;
  email: string;
  initials: string;
};

export type AuthConfiguration =
  | { enabled: true }
  | { enabled: false; reason: "missing" | "invalid_cookie_password" | "invalid_redirect_uri" };

function validRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    const secure = url.protocol === "https:";
    const local = url.protocol === "http:" && localHosts.has(url.hostname);
    return (secure || local)
      && url.pathname === "/auth/callback"
      && !url.username
      && !url.password
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

/* The callback this request should use, which is not always the one the build
 * was given.
 *
 * `NEXT_PUBLIC_WORKOS_REDIRECT_URI` carries a `NEXT_PUBLIC_` prefix, so Next
 * inlines it into the server bundle at build time, and AuthKit reads it into a
 * module constant on first import. Both freeze it: a server started on another
 * port with the variable overridden still sent the built-in value, so changing
 * the development port meant a rebuild rather than a restart.
 *
 * A loopback request may therefore name its own origin. Nothing else may: a
 * request's Host is attacker-controllable, and letting it choose the callback
 * is how a sign-in gets pointed at somebody else's domain. Every non-loopback
 * origin falls back to the configured value, unchanged.
 *
 * This does not widen what can sign in. WorkOS validates the callback against
 * its own registered list and rejects an unregistered one — the port still has
 * to be registered, this only removes the rebuild. */
export function callbackUriFor(
  requestUrl: string | URL,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string | undefined {
  const configured = environment.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
  let origin: URL;
  try {
    origin = new URL(requestUrl);
  } catch {
    return configured;
  }
  /* `0.0.0.0` is the bind address, not a host a browser ever used. `next start`
     binds every interface, and Next builds `request.url` from that bind rather
     than from the Host header — so a development server on 3000 reported
     `http://0.0.0.0:3000/sign-in`. The port is the part that matters and the
     host normalizes to `localhost`, which is what a developer typed and what
     WorkOS has registered. Deliberately not the Host header: that is
     attacker-controllable, and Next not trusting it here is the reason this
     function can be safe at all. */
  const devBind = origin.hostname === "0.0.0.0" || localHosts.has(origin.hostname);
  if (!devBind || origin.protocol !== "http:") return configured;
  const candidate = new URL("/auth/callback", `http://localhost:${origin.port || "80"}`).toString();
  return validRedirectUri(candidate) ? candidate : configured;
}

export function authConfiguration(environment: Readonly<Record<string, string | undefined>> = process.env): AuthConfiguration {
  if (requiredAuthVariables.some((name) => !environment[name])) return { enabled: false, reason: "missing" };
  if ((environment.WORKOS_COOKIE_PASSWORD?.length ?? 0) < 32) {
    return { enabled: false, reason: "invalid_cookie_password" };
  }
  if (!validRedirectUri(environment.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? "")) {
    return { enabled: false, reason: "invalid_redirect_uri" };
  }
  return { enabled: true };
}

function displayName(user: User): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email.split("@")[0] || "Researcher";
}

function initialsFor(user: User): string {
  const parts = [user.firstName, user.lastName].filter((part): part is string => Boolean(part));
  const letters = parts.length
    ? parts.map((part) => part[0]).join("")
    : user.email.replace(/[^a-z0-9]/giu, "").slice(0, 2);
  return (letters || "R").slice(0, 2).toUpperCase();
}

export function accountIdentity(user: User): AccountIdentity {
  return {
    id: user.id,
    displayName: displayName(user),
    email: user.email,
    initials: initialsFor(user),
  };
}

export async function currentAccount(): Promise<AccountIdentity | null> {
  if (!authConfiguration().enabled) return null;
  const { withAuth } = await import("@workos-inc/authkit-nextjs");
  const { user } = await withAuth();
  return user ? accountIdentity(user) : null;
}

export function accountReturnTo(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string | null {
  if (!authConfiguration(environment).enabled) return null;
  return new URL("/problems", environment.NEXT_PUBLIC_WORKOS_REDIRECT_URI).toString();
}
