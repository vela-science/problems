import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const boundary = vi.hoisted(() => ({
  record: vi.fn(),
  ActivityDataError: undefined as unknown as new (
    code: "unauthorized" | "conflict" | "invalid" | "not_found" | "database",
    message: string,
  ) => Error,
}));

vi.mock("server-only", () => ({}));
vi.mock("@vela/activity-data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  boundary.ActivityDataError = actual.ActivityDataError as typeof boundary.ActivityDataError;
  return { ...actual, recordPilotTelemetry: boundary.record };
});

import { POST } from "./route";

const INSTALL_ID = "a".repeat(32);
const RECORD_ID = "b".repeat(32);

function payload(overrides: Record<string, unknown> = {}) {
  return {
    schema: "vela.pilot-telemetry.v1",
    install_id: INSTALL_ID,
    record_id: RECORD_ID,
    signal: "continuation_started",
    occurred_at: "2026-08-19T12:00:00Z",
    stage_ms: 4200,
    ...overrides,
  };
}

function request(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("https://problems.science/api/telemetry", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(body)),
      ...headers,
    },
  });
}

beforeEach(() => {
  boundary.record.mockReset().mockResolvedValue({ stored: true, duplicate: false, authorityEffect: "none" });
});

describe("pilot telemetry ingestion boundary", () => {
  it("accepts one exact content-free record and returns its receipt", async () => {
    const response = await POST(request(JSON.stringify(payload())));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ stored: true, duplicate: false, authorityEffect: "none" });
    expect(boundary.record).toHaveBeenCalledWith(payload());
  });

  it("accepts a record without a stage duration", async () => {
    const record = payload();
    delete (record as Record<string, unknown>).stage_ms;
    const response = await POST(request(JSON.stringify(record)));
    expect(response.status).toBe(202);
    expect(boundary.record).toHaveBeenCalledWith(record);
  });

  it("refuses any field the schema has not been taught, without persistence", async () => {
    for (const extra of [
      { prompt: "prove it" },
      { repository: "vela-science/math" },
      { account_email: "someone@example.test" },
      { note: "free text" },
    ]) {
      const response = await POST(request(JSON.stringify(payload(extra))));
      expect(response.status).toBe(400);
      const refusal = await response.json();
      expect(refusal.error).toContain("vela.pilot-telemetry.v1");
    }
    expect(boundary.record).not.toHaveBeenCalled();
  });

  it("refuses a signal outside the closed vocabulary", async () => {
    const response = await POST(request(JSON.stringify(payload({ signal: "transcript_uploaded" }))));
    expect(response.status).toBe(400);
    expect(boundary.record).not.toHaveBeenCalled();
  });

  it("names the failing path and code but never echoes the received value", async () => {
    const response = await POST(request(JSON.stringify(payload({ install_id: "SECRET-TOKEN-VALUE" }))));
    expect(response.status).toBe(400);
    const text = JSON.stringify(await response.json());
    expect(text).toContain("install_id");
    expect(text).not.toContain("SECRET-TOKEN-VALUE");
  });

  it("refuses oversized bytes before parsing or persistence", async () => {
    const response = await POST(request("{}", { "content-length": String(4097) }));
    expect(response.status).toBe(413);
    expect(boundary.record).not.toHaveBeenCalled();
  });

  it("refuses bytes that are not JSON", async () => {
    const response = await POST(request("signal=continuation_started"));
    expect(response.status).toBe(400);
    expect(boundary.record).not.toHaveBeenCalled();
  });

  it("maps a database refusal to a closed 400 and outage to 503", async () => {
    const { ActivityDataError } = boundary;
    boundary.record.mockRejectedValue(new ActivityDataError("invalid", "pilot telemetry timestamp is outside the accepted window"));
    expect((await POST(request(JSON.stringify(payload())))).status).toBe(400);
    boundary.record.mockRejectedValue(new ActivityDataError("conflict", "pilot telemetry record identifier was reused with different content"));
    expect((await POST(request(JSON.stringify(payload())))).status).toBe(409);
    boundary.record.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const outage = await POST(request(JSON.stringify(payload())));
    expect(outage.status).toBe(503);
    expect(JSON.stringify(await outage.json())).not.toContain("ECONNREFUSED");
  });
});
