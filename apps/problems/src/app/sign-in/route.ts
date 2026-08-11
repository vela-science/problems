import { NextResponse } from "next/server";
import { authEnabled } from "@/lib/auth";

export async function GET() {
  if (!authEnabled()) {
    return NextResponse.json({ error: "Authentication is not configured in this environment." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const { getSignInUrl } = await import("@workos-inc/authkit-nextjs");
  return NextResponse.redirect(await getSignInUrl({ returnTo: "/" }));
}
