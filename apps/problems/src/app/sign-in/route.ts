import { NextResponse } from "next/server";
import { authConfiguration } from "@/lib/auth";

export async function GET() {
  if (!authConfiguration().enabled) {
    return NextResponse.json({ error: "Authentication is not configured in this environment." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const { getSignInUrl } = await import("@workos-inc/authkit-nextjs");
  return NextResponse.redirect(await getSignInUrl({ returnTo: "/account" }));
}
