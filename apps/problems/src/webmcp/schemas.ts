/* Input schemas, and the descriptions that decide whether a model reaches for
 * the right tool.
 *
 * A description's job is to say WHEN to call the thing and what calling it
 * costs. "Updates claim" tells a model nothing it cannot guess and hides the
 * only fact that matters, which is whether the call is consequential. So each
 * mutating description states, in its own words, that the result is proposed
 * rather than established.
 *
 * The Problem in view is never an input. The page already knows which Problem
 * it is, an agent that had to name one could name the wrong one, and a
 * mutation aimed at a stale identity is exactly what the anchor root exists to
 * refuse. Claim ids ARE inputs, because a Problem holds several and the
 * ambiguity is real. */

export type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: false;
};

const EMPTY: JsonSchema = { type: "object", properties: {}, additionalProperties: false };

export const inspectProblemSchema = EMPTY;

export const inspectClaimSchema: JsonSchema = {
  type: "object",
  properties: {
    claim_id: {
      type: "string",
      description:
        "The Claim's exact id, as `vcl_` followed by 64 hex characters. Omit it "
        + "to read the Problem's current Result.",
      pattern: "^vcl_[0-9a-f]{64}$",
    },
  },
  additionalProperties: false,
};

export const inspectHistorySchema = EMPTY;

export const searchProblemsSchema: JsonSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Free text matched against Problem statements, labels and Claim assertions.",
      minLength: 1,
      maxLength: 200,
    },
    standing: {
      type: "string",
      description:
        "Restrict to Problems whose current Result holds this Standing. "
        + "`unassessed` means no authority has ruled, which is the common case.",
      enum: ["accepted", "unassessed", "corrected", "superseded", "retracted"],
    },
    limit: { type: "integer", minimum: 1, maximum: 25, default: 10 },
  },
  required: ["query"],
  additionalProperties: false,
};

export const openApproachSchema: JsonSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "A short name for the line of work, as a person would file it.",
      minLength: 1,
      maxLength: 200,
    },
    summary: {
      type: "string",
      description: "What this approach intends to establish, and how.",
      minLength: 1,
      maxLength: 4_000,
    },
    attempt_title: {
      type: "string",
      description: "The first concrete attempt within the approach.",
      minLength: 1,
      maxLength: 200,
    },
  },
  required: ["title", "summary", "attempt_title"],
  additionalProperties: false,
};

export const attachEvidenceSchema: JsonSchema = {
  type: "object",
  properties: {
    attempt_id: {
      type: "string",
      description: "The Attempt this artifact belongs to, from `open_approach`.",
      minLength: 1,
      maxLength: 64,
    },
    kind: {
      type: "string",
      description: "What the artifact is, e.g. `lean-declaration`, `transcript`, `dataset`.",
      minLength: 1,
      maxLength: 100,
    },
    path: {
      type: "string",
      description: "Path or name identifying the artifact within its source.",
      minLength: 1,
      maxLength: 2_000,
    },
    content_root: {
      type: "string",
      description:
        "The artifact's exact SHA-256 content root, as `sha256:` followed by 64 "
        + "hex characters. Bytes are not uploaded; the root and locator are what "
        + "is retained.",
      pattern: "^sha256:[0-9a-f]{64}$",
    },
    locator: {
      type: "string",
      description: "Where the bytes can be fetched, if anywhere. A URL or repository path.",
      maxLength: 2_000,
    },
    rationale: {
      type: "string",
      description:
        "Why this artifact bears on the Problem. Recorded as an attributed note "
        + "beside the artifact, so a later reader sees the reasoning, not just the root.",
      minLength: 1,
      maxLength: 4_000,
    },
  },
  required: ["attempt_id", "kind", "path", "content_root", "rationale"],
  additionalProperties: false,
};

export const prepareSubmissionSchema: JsonSchema = {
  type: "object",
  properties: {
    actor_id: {
      type: "string",
      description: "The producing agent's Vela identity, which must begin `agent:`.",
      pattern: "^agent:\\S+$",
      maxLength: 200,
    },
    public_key_hex: {
      type: "string",
      description:
        "The 64-hex-character Ed25519 public key the human will sign with locally. "
        + "The private key is never sent here and this application cannot sign.",
      pattern: "^[0-9a-f]{64}$",
    },
    requested_change: {
      type: "string",
      description:
        "What the Submission asks a Repository authority to do. `add_claim` "
        + "introduces a new Claim; the other three act on the Problem's current Claim.",
      enum: ["add_claim", "correct_claim", "supersede_claim", "retract_claim"],
    },
    assertion: {
      type: "string",
      description:
        "The scientific claim, stated exactly and with its scope. State what was "
        + "established, under which conditions, at which exact revision.",
      minLength: 1,
      maxLength: 16_000,
    },
    claim_type: {
      type: "string",
      enum: ["computational", "theoretical", "empirical", "negative", "contradiction"],
    },
    condition: {
      type: "string",
      description: "A condition the assertion holds under, if it is conditional.",
      maxLength: 4_000,
    },
    caveat: {
      type: "string",
      description:
        "What this Submission does not establish. Required, because a producer "
        + "that reports no limits has not looked for any.",
      minLength: 1,
      maxLength: 4_000,
    },
    replayability: {
      type: "string",
      description: "How exactly a reviewer can reproduce the producer's own result.",
      enum: ["exact", "bounded", "approximate", "unavailable", "unknown"],
    },
    check_method: {
      type: "string",
      description: "The check the producer ran, e.g. `lake build`, `exact-replay-v1`.",
      minLength: 1,
      maxLength: 200,
    },
    check_outcome: {
      type: "string",
      description: "What that check reported. Producer-reported, never authoritative.",
      enum: ["pass", "fail", "error", "skipped", "unknown"],
    },
    verification_requirement: {
      type: "string",
      description: "What an independent reviewer should check before any Decision.",
      minLength: 1,
      maxLength: 4_000,
    },
    evidence_artifact_id: {
      type: "string",
      description: "The attached artifact this Submission rests on, from `attach_evidence`.",
      minLength: 1,
      maxLength: 64,
    },
  },
  required: [
    "actor_id", "public_key_hex", "requested_change", "assertion", "claim_type",
    "caveat", "replayability", "check_method", "check_outcome",
    "verification_requirement", "evidence_artifact_id",
  ],
  additionalProperties: false,
};

export const inspectCandidateSchema: JsonSchema = {
  type: "object",
  properties: {
    draft_id: {
      type: "string",
      description: "A specific draft. Omit to list every candidate in this Workspace.",
      maxLength: 64,
    },
  },
  additionalProperties: false,
};

export const TOOL_DESCRIPTIONS = Object.freeze({
  inspect_problem:
    "Read the exact current scientific state of the Problem open in this page: "
    + "the question, its current Result and that Result's Standing, every Claim "
    + "recorded against it, the sources it was observed from, and the exact "
    + "projection roots those facts came from. Call this first — the other tools "
    + "operate on ids it returns. Read-only.",

  inspect_claim:
    "Read one Claim in full: its assertion and conditions, its Standing, and the "
    + "lineage behind that Standing — which Submission proposed it, what each "
    + "Verification checked and explicitly did not establish, and which "
    + "attributed Decision accepted it. Use this when you need to know whether a "
    + "Claim is actually established or merely recorded. Read-only.",

  inspect_history:
    "Read why the system currently believes what it believes about this Problem: "
    + "the ordered record of Proposals, Verifications and Decisions, plus every "
    + "correction and supersession relation between Claims. Use this to answer "
    + "questions about how a Standing came to be, rather than what it is. Read-only.",

  search_problems:
    "Find Problems across the collection by text, optionally restricted to a "
    + "Standing. Use it to locate related or comparable work before proposing "
    + "anything. Returns identities and addresses, not full records. Read-only.",

  open_approach:
    "Begin an attributed line of work on this Problem: creates one Approach and "
    + "one Attempt inside your Workspace, and returns their ids for the tools "
    + "that follow. This writes hosted Work, which is visible and attributed but "
    + "carries no scientific authority. It does not change any Standing. "
    + "Requires a signed-in account.",

  attach_evidence:
    "Attach an artifact to an Attempt by its exact content root, with a written "
    + "rationale recorded beside it. The bytes are not uploaded; the root, path "
    + "and locator are retained so a reviewer can fetch and verify them "
    + "independently. Attaching evidence records that you found something "
    + "relevant — it does not make a Claim true and does not change Standing. "
    + "Requires a signed-in account.",

  prepare_submission:
    "Draft a Vela Submission proposing a scientific state change, and leave it "
    + "UNSIGNED. This is the furthest an agent in a browser can go. The draft "
    + "enters the human's review surface; it is not a Decision, it does not move "
    + "any Claim's Standing, and this application holds no signing key and cannot "
    + "sign on anyone's behalf. A human takes the draft to a local tool, signs it "
    + "with a key only they hold, and submits it to the Repository, where "
    + "verification and an attributed Decision decide whether Standing moves. "
    + "State real caveats and real verification requirements: a Submission that "
    + "claims more than its checks establish is what review exists to catch. "
    + "Requires a signed-in account.",

  inspect_candidate:
    "Read the unsigned Submission drafts prepared in this Workspace: what each "
    + "one asks for, which Claim it targets, its exact payload root, and how far "
    + "through the signing handoff it has got. Use it to confirm what is pending "
    + "before a human reviews it. Read-only.",
});
