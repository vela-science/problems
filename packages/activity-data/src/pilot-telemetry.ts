import { z } from "zod";

/*
  Consented, content-free pilot telemetry.

  The wire contract carries exactly four facts: a signal name from the closed
  vocabulary, the moment it happened, a random install identifier generated at
  opt-in, and an optional stage duration. It never carries scientific
  contents, repository files, credentials, signatures, prompts, account
  identity, or free text, and the schema rejects any field it has not been
  taught.
*/

export const PILOT_TELEMETRY_SCHEMA = "vela.pilot-telemetry.v1" as const;

export const PILOT_TELEMETRY_SIGNALS = [
  "installer_succeeded",
  "problem_opened",
  "handoff_opened",
  "continuation_started",
  "submission_completed",
  "submission_failed",
  "check_completed",
  "check_failed",
  "readback_completed",
] as const;

const RANDOM_HEX_ID = /^[0-9a-f]{32}$/u;
export const PILOT_TELEMETRY_MAX_STAGE_MS = 86_400_000;

export const pilotTelemetryRecord = z.object({
  schema: z.literal(PILOT_TELEMETRY_SCHEMA),
  install_id: z.string().regex(RANDOM_HEX_ID, "install_id must be 32 lowercase hex characters"),
  record_id: z.string().regex(RANDOM_HEX_ID, "record_id must be 32 lowercase hex characters"),
  signal: z.enum(PILOT_TELEMETRY_SIGNALS),
  occurred_at: z.iso.datetime(),
  stage_ms: z.number().int().min(0).max(PILOT_TELEMETRY_MAX_STAGE_MS).optional(),
}).strict();

export type PilotTelemetryRecord = z.infer<typeof pilotTelemetryRecord>;

export type PilotTelemetryReceipt = {
  stored: boolean;
  duplicate: boolean;
  authorityEffect: "none";
};
