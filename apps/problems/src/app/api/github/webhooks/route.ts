import { NextRequest, NextResponse } from "next/server";
import { sha256 } from "@vela/projection-data/canonical";
import { recordGitHubWebhook } from "@vela/activity-data";
import { githubApp } from "@/lib/github-app";

export const runtime = "nodejs";

type Json = Record<string, unknown>;
function object(value: unknown): Json { return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {}; }
function repository(value: unknown) {
  const row = object(value);
  return { id: row.id, node_id: row.node_id, full_name: row.full_name, visibility: row.visibility, default_branch: row.default_branch };
}

export async function POST(request: NextRequest) {
  const deliveryId = request.headers.get("x-github-delivery") ?? "";
  const eventName = request.headers.get("x-github-event") ?? "";
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "invalid payload size" }, { status: 413 });
  }
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "invalid payload size" }, { status: 413 });
  }
  if (!await githubApp().webhooks.verify(body, signature)) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  if (!(["installation", "installation_repositories", "push"] as string[]).includes(eventName)) {
    return NextResponse.json({ ignored: true, authority_effect: "none" });
  }
  const payload = object(JSON.parse(body));
  const installation = object(payload.installation);
  const account = object(installation.account);
  const sender = object(payload.sender);
  const sanitized: Json = {
    action: typeof payload.action === "string" ? payload.action : "push",
    installation_id: installation.id,
    sender_id: sender.id,
    account_id: account.id,
    account_node_id: account.node_id,
    account_login: account.login,
    account_type: account.type,
    repository_selection: installation.repository_selection,
    permissions: installation.permissions,
  };
  if (eventName === "installation_repositories") {
    const values = sanitized.action === "added" ? payload.repositories_added : payload.repositories_removed;
    sanitized.repositories = Array.isArray(values) ? values.map(repository) : [];
  } else if (eventName === "push") {
    const repo = object(payload.repository);
    Object.assign(sanitized, { repository_id: repo.id, ref: payload.ref, after: payload.after });
  }
  const result = await recordGitHubWebhook({ deliveryId, eventName, payloadRoot: sha256(body), payload: sanitized });
  return NextResponse.json(result);
}
