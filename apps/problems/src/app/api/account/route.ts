import { NextResponse } from "next/server";
import { authConfiguration, currentAccount } from "@/lib/auth";

const privateHeaders = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
  Vary: "Cookie",
};

export async function GET() {
  if (!authConfiguration().enabled) {
    return NextResponse.json({ status: "unavailable" }, { headers: privateHeaders });
  }

  const account = await currentAccount();
  if (!account) return NextResponse.json({ status: "signed_out" }, { headers: privateHeaders });
  return NextResponse.json({
    status: "signed_in",
    account: {
      displayName: account.displayName,
      email: account.email,
      initials: account.initials,
    },
  }, { headers: privateHeaders });
}
