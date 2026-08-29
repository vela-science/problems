import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authkit, authkitProxy } from "@workos-inc/authkit-nextjs";
import { authConfiguration } from "@/lib/auth";
import { signInPath } from "@/app/sign-in/route";

const configuredProxy = authkitProxy();

/* The account surfaces are gated here rather than in their pages.
 *
 * Each page already ends in `redirect("/sign-in?returnTo=…")` for a signed-out
 * reader, and every other gated route answers 307 that way. These three
 * answered 200: `app/account/loading.tsx` opens a Suspense boundary, so the
 * shell streams before the page's auth check runs and the redirect can only
 * ship inside the RSC payload as a client-side bounce. `/account` was the only
 * auth-gated segment with a `loading.tsx` and the only one that behaved this
 * way.
 *
 * Deleting the skeleton would have fixed the status code and lost a good
 * loading state. The proxy is the one place guaranteed to run before any
 * rendering, it already matches `/account/:path*`, and it knows the pathname —
 * so the redirect becomes a real 307 and the skeleton still serves the
 * signed-in reader it was written for. */
const GATED_ACCOUNT_PATHS = new Set(["/account", "/account/connections", "/account/profile"]);

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!authConfiguration().enabled) return NextResponse.next();
  if (GATED_ACCOUNT_PATHS.has(request.nextUrl.pathname)) {
    const { session } = await authkit(request);
    if (!session.user) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/sign-in";
      destination.search = new URL(signInPath(request.nextUrl.pathname), request.nextUrl.origin).search;
      return NextResponse.redirect(destination);
    }
  }
  return configuredProxy(request, event);
}

export const config = {
  /* Exact runtime-auth surfaces only. A broad `/p/:path*`, `/auth/:path*` or
     `/drafts/:path*` matcher made nonexistent descendants pay WorkOS proxy
     cost and obscured which routes are actually allowed to call `withAuth`.
     Canonical and legacy Problem pages remain covered because Workspace mode
     is selected by query string and Next matchers cannot branch on its value. */
  matcher: [
    "/account/:path*",
    "/api/github/:path*",
    "/api/account",
    /* `/api/work` reads a session and was never listed, so a signed-out caller
       got a 500 out of `withAuth` where the route's own first branch answers
       401. It is the agent surface's work read, so the caller most likely to
       meet it is the one least able to interpret it. */
    "/api/work",
    "/auth/callback",
    "/drafts/:id/export",
    "/codebases/:path*",
    "/import",
    "/watching",
    "/workspaces",
    "/people/:path*",
    "/problems/:namespace/:problem",
    /* A Problem's sections are path segments, and Workspace mode is reachable
       from any of them, so each has to be covered too — an uncovered section
       renders the page and then throws out of `withAuth`. */
    "/problems/:namespace/:problem/:view",
    "/sign-in",
  ],
};
