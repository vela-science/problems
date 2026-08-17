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
