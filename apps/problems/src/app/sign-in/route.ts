import { NextRequest, NextResponse } from "next/server";
import { authConfiguration } from "@/lib/auth";

const allowedReturns = new Set(["/account", "/account/connections", "/import"]);

/* A Problem or repository address may also round-trip, so signing in from a
 * Workspace returns to that Workspace instead of stranding the reader on
 * /account. The value is parsed and rebuilt, never echoed: the path must
 * match the canonical route shapes exactly, and only the two query
 * parameters those routes read survive, with their own closed grammars.
 * Anything else — absolute URLs, protocol-relative `//`, backslashes,
 * traversal that normalizes away, unknown params — collapses to /account. */
const PROBLEM_RETURN_PATH = /^\/(?:problems\/[a-z0-9]+(?:-[a-z0-9]+)*\/[1-9][0-9]*|repositories\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/problems\/[1-9][0-9]*)?)$/u;

export function safeReturnTo(requested: string | null): string {
  if (!requested) return "/account";
  if (allowedReturns.has(requested)) return requested;
  if (!requested.startsWith("/") || requested.startsWith("//") || requested.includes("\\")) return "/account";
  let url: URL;
  try {
    url = new URL(requested, "https://relative.invalid");
  } catch {
    return "/account";
  }
  if (url.origin !== "https://relative.invalid" || !PROBLEM_RETURN_PATH.test(url.pathname)) return "/account";
  const params = new URLSearchParams();
  const view = url.searchParams.get("view");
  if (view === "sources" || view === "record" || view === "workspace") params.set("view", view);
  const workspace = url.searchParams.get("workspace");
  if (workspace && /^[A-Za-z0-9_-]{1,64}$/u.test(workspace)) params.set("workspace", workspace);
  const query = params.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

export async function GET(request: NextRequest) {
  if (!authConfiguration().enabled) {
    return NextResponse.json({ error: "Authentication is not configured in this environment." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const { getSignInUrl } = await import("@workos-inc/authkit-nextjs");
  const response = NextResponse.redirect(await getSignInUrl({ returnTo: safeReturnTo(request.nextUrl.searchParams.get("returnTo")) }));
  /* The 503 branch above said `no-store` and this one said nothing, so the
     framework default applied: `public, max-age=0, must-revalidate`. Every
     response here is unique to one attempt — it sets a PKCE verifier cookie and
     carries a fresh `code_challenge` in the Location — and `public` is the
     explicit permission a shared cache needs before it may store a response
     that carries `Set-Cookie`. Revalidation limited the exposure; it should
     never have been storable by an intermediary at all. */
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
