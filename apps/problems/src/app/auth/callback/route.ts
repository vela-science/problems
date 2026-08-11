import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authEnabled } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "Authentication is not configured in this environment." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const { handleAuth } = await import("@workos-inc/authkit-nextjs");
  return handleAuth({ returnPathname: "/" })(request);
}
