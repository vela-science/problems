import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { authConfiguration } from "@/lib/auth";

const configuredProxy = authkitProxy();

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!authConfiguration().enabled) return NextResponse.next();
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
    "/auth/callback",
    "/drafts/:id/export",
    "/codebases/:path*",
    "/import",
    "/p/:repository/:problem",
    "/problems/:namespace/:problem",
    "/sign-in",
  ],
};
