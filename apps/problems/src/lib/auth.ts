import "server-only";

import type { User } from "@workos-inc/node";

const required = [
  "WORKOS_API_KEY",
  "WORKOS_CLIENT_ID",
  "WORKOS_COOKIE_PASSWORD",
  "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
] as const;

export type HostedAccount = {
  id: string;
  displayName: string;
  email: string;
  initials: string;
};

export function authEnabled(environment: Readonly<Record<string, string | undefined>> = process.env): boolean {
  if (required.some((name) => !environment[name])) return false;
  if ((environment.WORKOS_COOKIE_PASSWORD?.length ?? 0) < 32) return false;
  try {
    const url = new URL(environment.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? "");
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return (url.protocol === "https:" || local)
      && url.pathname === "/auth/callback"
      && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function hostedAccount(user: User): HostedAccount {
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
    || user.email.split("@")[0]
    || "Researcher";
  const initials = ([user.firstName, user.lastName].filter(Boolean).map((part) => part?.[0]).join("")
    || user.email.replace(/[^a-z0-9]/giu, "").slice(0, 2)
    || "R").slice(0, 2).toUpperCase();
  return { id: user.id, displayName, email: user.email, initials };
}

export async function currentHostedAccount(): Promise<HostedAccount | null> {
  if (!authEnabled()) return null;
  const { withAuth } = await import("@workos-inc/authkit-nextjs");
  const { user } = await withAuth();
  return user ? hostedAccount(user) : null;
}

export function signOutReturnTo(environment: Readonly<Record<string, string | undefined>> = process.env): string | null {
  if (!authEnabled(environment)) return null;
  return new URL("/", environment.NEXT_PUBLIC_WORKOS_REDIRECT_URI).toString();
}
