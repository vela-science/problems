import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { canonicalJson, sha256, type HashRoot } from "@vela/projection-data/canonical";
import submissionSchema from "../config/submission.schema.json" with { type: "json" };

export const VELA_SUBMISSION_SCHEMA = "vela.submission.v2" as const;
export const VELA_SUBMISSION_PAYLOAD_TYPE = "application/vnd.vela.submission.v2+json" as const;

export type VelaSubmissionV2 = {
  schema: typeof VELA_SUBMISSION_SCHEMA;
  identity: {
    schema: "vela.signer-identity.v1";
    actor_id: string;
    actor_class: "agent";
    public_key_hex: string;
    declared_at: string;
  };
  claim: {
    assertion: string;
    type: "computational" | "theoretical" | "empirical" | "negative" | "contradiction";
    conditions: string[];
  };
  artifacts: Array<{ kind: string; path: string; digest: HashRoot }>;
  caveats: string[];
  replayability: "exact" | "bounded" | "approximate" | "unavailable" | "unknown";
  producer_checks: Array<{
    method: string;
    outcome: "pass" | "fail" | "error" | "skipped" | "unknown";
    authority: "producer_reported";
  }>;
  verification_requirements: string[];
  requested_change:
    | { kind: "add_claim" }
    | {
      kind: "correct_claim" | "supersede_claim" | "retract_claim";
      target: { claim_id: string; claim_root: HashRoot };
    };
  provenance: {
    producer: string;
    source_system: string;
    source_run?: string;
    emitted_at: string;
  };
};

/* The public schema uses `not: { required: ["target"] }` inside a oneOf: a
   valid JSON Schema construct whose property is declared by the surrounding
   object. Ajv's optional strictRequired lint treats that composition as an
   authoring error, so disable only that lint while retaining every runtime
   constraint and the rest of strict mode. */
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const validateSchema = ajv.compile<VelaSubmissionV2>(submissionSchema);

export type SubmissionDraftValidation =
  | { valid: true; payload: VelaSubmissionV2 }
  | { valid: false; errors: string[] };

function formatSchemaError(error: ErrorObject): string {
  const at = error.instancePath || "/";
  return `${at}: ${error.message ?? error.keyword}`;
}

function isWholeSecondUtcTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf())
    && parsed.toISOString().replace(".000Z", "Z") === value;
}

export function validateSubmissionDraft(value: unknown): SubmissionDraftValidation {
  if (!validateSchema(value)) {
    return { valid: false, errors: (validateSchema.errors ?? []).map(formatSchemaError) };
  }
  const semanticErrors: string[] = [];
  if (value.identity.actor_class !== "agent") {
    semanticErrors.push("/identity/actor_class: Submission producers must use an agent-class identity");
  }
  if (value.identity.actor_id !== value.provenance.producer) {
    semanticErrors.push("/provenance/producer: must match identity.actor_id");
  }
  if (!/^(agent|ci):\S+$/u.test(value.identity.actor_id)) {
    semanticErrors.push("/identity/actor_id: must use the agent: or ci: producer namespace");
  }
  if (!isWholeSecondUtcTimestamp(value.identity.declared_at)) {
    semanticErrors.push("/identity/declared_at: must be whole-second UTC RFC3339 spelled with Z");
  }
  if (!isWholeSecondUtcTimestamp(value.provenance.emitted_at)) {
    semanticErrors.push("/provenance/emitted_at: must be whole-second UTC RFC3339 spelled with Z");
  }
  if (semanticErrors.length) return { valid: false, errors: semanticErrors };
  return { valid: true, payload: value };
}

export function assertSubmissionDraft(value: unknown): VelaSubmissionV2 {
  const result = validateSubmissionDraft(value);
  if (!result.valid) throw new Error(`invalid vela.submission.v2 draft:\n${result.errors.join("\n")}`);
  return result.payload;
}

export type SaveSubmissionDraftInput = {
  anchor: import("./contracts").ScientificAnchor;
  payload: VelaSubmissionV2;
  draftId?: string;
};

export type SubmissionDraftExport = {
  payload: VelaSubmissionV2;
  canonicalPayload: string;
  payloadRoot: HashRoot;
  mediaType: "application/json";
  fileName: "vela-submission-draft.json";
  signingHandoff: {
    state: "unsigned";
    serverHeldKey: false;
    payloadType: typeof VELA_SUBMISSION_PAYLOAD_TYPE;
    command: string;
    note: string;
  };
};

export function createSubmissionDraftExport(value: unknown): SubmissionDraftExport {
  const payload = assertSubmissionDraft(value);
  const canonicalPayload = canonicalJson(payload);
  return {
    payload,
    canonicalPayload,
    payloadRoot: sha256(canonicalPayload),
    mediaType: "application/json",
    fileName: "vela-submission-draft.json",
    signingHandoff: {
      state: "unsigned",
      serverHeldKey: false,
      payloadType: VELA_SUBMISSION_PAYLOAD_TYPE,
      command: "bun run --filter @vela/activity-data submission:sign-local -- vela-submission-draft.json --private-key <local-pkcs8-pem> --output submission.json",
      note: "Run locally. The helper reads the private key only from the named local file, verifies it matches identity.public_key_hex, signs a DSSE envelope, and never contacts the hosted workbench.",
    },
  };
}
