import { NextRequest, NextResponse } from "next/server";
import { ActivityDataError, pilotTelemetryRecord, recordPilotTelemetry } from "@vela/activity-data";

export const runtime = "nodejs";

/*
  Consented pilot-telemetry ingestion for Workbench installs that opted in.
  The wire contract is `vela.pilot-telemetry.v1`: a signal name from a closed
  vocabulary, a timestamp, a random install identifier generated at opt-in,
  and an optional stage duration. Validation is strict — any unexpected field
  refuses the whole record — and refusals name the failing path and code, not
  the received value.
*/

const MAX_BODY_BYTES = 4096;

/*
  `application/json` is required before the body is read, and the requirement
  is a security control rather than a courtesy. A cross-origin `fetch` with the
  default `text/plain` body is a CORS *simple* request: the browser sends it
  with no preflight and the write lands before any response header is read.
  Demanding the JSON content type forces a preflight this route never answers,
  so a third-party page cannot conscript its visitors into writing rows.
*/
function isJsonRequest(request: NextRequest): boolean {
  const header = request.headers.get("content-type");
  if (!header) return false;
  const mediaType = header.split(";", 1)[0]!.trim().toLowerCase();
  return mediaType === "application/json";
}

export async function POST(request: NextRequest) {
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "content-type must be application/json" }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "invalid payload size" }, { status: 413 });
  }
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "invalid payload size" }, { status: 413 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "payload is not valid JSON" }, { status: 400 });
  }
  const parsed = pilotTelemetryRecord.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({
      error: "payload does not match vela.pilot-telemetry.v1",
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })),
    }, { status: 400 });
  }
  try {
    const receipt = await recordPilotTelemetry(parsed.data);
    return NextResponse.json(receipt, { status: 202 });
  } catch (error) {
    if (error instanceof ActivityDataError && error.code === "invalid") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ActivityDataError && error.code === "conflict") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "pilot telemetry is unavailable" }, { status: 503 });
  }
}
