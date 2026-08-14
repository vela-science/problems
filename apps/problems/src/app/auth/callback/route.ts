import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authConfiguration } from "@/lib/auth";

const recoverableCallbackCodes = new Set([
  "missing_auth_params",
  "missing_pkce_cookie",
  "oauth_state_mismatch",
]);

export function isRecoverableCallbackError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return typeof error.code === "string" && recoverableCallbackCodes.has(error.code);
}

export async function GET(request: NextRequest) {
  if (!authConfiguration().enabled) {
    return NextResponse.json({ error: "Authentication is not configured in this environment." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const { handleAuth } = await import("@workos-inc/authkit-nextjs");
  return handleAuth({
    returnPathname: "/account",
    onError: ({ error, request: callbackRequest }) => {
      if (isRecoverableCallbackError(error)) {
        return NextResponse.redirect(new URL("/sign-in", callbackRequest.url));
      }
      return NextResponse.json({
        error: {
          message: "Sign-in could not be completed.",
          description: "Start a new sign-in attempt or contact the site administrator.",
        },
      }, { status: 500 });
    },
  })(request);
}
