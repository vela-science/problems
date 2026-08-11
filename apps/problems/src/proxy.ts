import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { authEnabled } from "@/lib/auth";

const configured = authkitProxy();

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!authEnabled()) return NextResponse.next();
  return configured(request, event);
}

export const config = { matcher: ["/auth/:path*", "/sign-in", "/sign-out", "/workspaces/:path*"] };
