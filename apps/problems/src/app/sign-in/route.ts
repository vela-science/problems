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
  return NextResponse.redirect(await getSignInUrl({ returnTo: allowedReturns.has(requested) ? requested : "/account" }));
}
