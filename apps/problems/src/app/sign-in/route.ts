import { NextRequest, NextResponse } from "next/server";
import { authConfiguration } from "@/lib/auth";

const allowedReturns = new Set(["/account", "/account/connections", "/import"]);

export async function GET(request: NextRequest) {
  if (!authConfiguration().enabled) {
    return NextResponse.json({ error: "Authentication is not configured in this environment." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const { getSignInUrl } = await import("@workos-inc/authkit-nextjs");
  const requested = request.nextUrl.searchParams.get("returnTo") ?? "/account";
  const response = NextResponse.redirect(await getSignInUrl({ returnTo: allowedReturns.has(requested) ? requested : "/account" }));
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
