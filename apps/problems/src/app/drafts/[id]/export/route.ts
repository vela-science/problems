import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureCurrentAccount, exportSubmissionDraft } from "@vela/activity-data";
import { currentHostedAccount } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: RouteContext<"/drafts/[id]/export">) {
  const hosted = await currentHostedAccount();
  if (!hosted) return NextResponse.redirect(new URL("/sign-in", request.url));
  const workspaceId = request.nextUrl.searchParams.get("workspace");
  if (!workspaceId) return NextResponse.json({ error: "workspace is required" }, { status: 400 });
  const { id: draftId } = await params;
  const account = await ensureCurrentAccount({ workosUserId: hosted.id, displayName: hosted.displayName, email: hosted.email });
  const draft = await exportSubmissionDraft({ accountId: account.id, workspaceId }, draftId);
  return new NextResponse(`${draft.canonicalPayload}\n`, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${draft.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Vela-Payload-Root": draft.payloadRoot,
      "X-Vela-Payload-Type": draft.signingHandoff.payloadType,
      "X-Vela-Signing-State": draft.signingHandoff.state,
    },
  });
}
