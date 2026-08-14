import { z } from "zod";
import { canonicalJson, sha256, type HashRoot } from "./canonical";

const root = z.string().regex(/^sha256:[0-9a-f]{64}$/u);
const commit = z.string().regex(/^[0-9a-f]{40}$/u);

const previewBaseSchema = z.object({
  git_commit: commit,
  revision_root: root,
  repository_root: root,
}).strict();

const previewInputsSchema = z.object({
  repository_root: root,
  proposal_root: root,
  claim_root: root,
  submission_root: root,
  verification_set_root: root,
}).strict();

const previewAuthoritySchema = z.object({
  policy_bundle_root: root,
  authority_keyset_root: root,
  authority_record_root: root,
  authority_event_log_root: root,
}).strict();

const previewPredictionsSchema = z.object({
  before_repository_root: root,
  if_accept_repository_root: root,
  if_reject_repository_root: root,
}).strict();

const previewTerminalSchema = z.object({
  proposal_status: z.enum(["accepted", "rejected", "withdrawn"]),
  git_commit: commit,
  revision_root: root,
  repository_root: root,
  applied_exactly_as_reviewed: z.boolean().nullable(),
}).strict();

const previewBlockerSchema = z.object({
  code: z.string().min(1),
  detail: z.string().min(1),
}).strict();

export const proposedStatePreviewSchema = z.object({
  schema: z.literal("vela.projection-proposed-state-preview.v1"),
  authority_effect: z.literal("none"),
  state: z.enum([
    "current",
    "stale_recomputable",
    "invalidated",
    "terminal_historical",
    "unavailable",
  ]),
  proposal_id: z.string().min(1),
  entry_root: root.nullable(),
  projection_root: root.nullable(),
  base: previewBaseSchema,
  inputs: previewInputsSchema.nullable(),
  authority_heads: previewAuthoritySchema.nullable(),
  predictions: previewPredictionsSchema.nullable(),
  terminal: previewTerminalSchema.nullable(),
  blocker: previewBlockerSchema.nullable(),
  nonclaims: z.array(z.string().min(1)).min(3),
  preview_root: root,
}).strict().superRefine((value, context) => {
  const hasPacket = value.entry_root !== null
    && value.projection_root !== null
    && value.inputs !== null
    && value.authority_heads !== null
    && value.predictions !== null;
  if (value.state === "unavailable" && (hasPacket || !value.blocker)) {
    context.addIssue({ code: "custom", message: "unavailable preview must carry one blocker and no packet" });
  }
  if (value.state !== "unavailable" && (!hasPacket || value.blocker)) {
    context.addIssue({ code: "custom", message: "available preview must carry exact packet bindings and no blocker" });
  }
  if ((value.state === "terminal_historical" || value.state === "unavailable") !== (value.terminal !== null)) {
    context.addIssue({ code: "custom", message: "terminal preview state and terminal binding disagree" });
  }
});

export type ProposedStatePreview = z.infer<typeof proposedStatePreviewSchema>;

type ExactRevision = {
  git_commit: string;
  repository_root: string | null;
  row_root: string;
};

type Entry = Record<string, any>;

const nonclaims = [
  "A proposed-state preview does not make a Decision or change Standing.",
  "A satisfied protocol gate is permission for a human ruling, not acceptance.",
  "The preview root is not a Repository root, Git commit, or projection release root.",
];

function rootedPreview(value: Omit<ProposedStatePreview, "preview_root">): ProposedStatePreview {
  return proposedStatePreviewSchema.parse({
    ...value,
    preview_root: sha256(canonicalJson(value)),
  });
}

function exactEntry(entry: Entry) {
  const parsed = z.object({
    proposal_id: z.string().min(1),
    entry_root: root,
    inputs: previewInputsSchema,
    authority_heads: previewAuthoritySchema,
    standing_delta: z.object({
      before: z.object({ repository_root: root }).passthrough(),
      if_accept: z.object({ repository_root: root }).passthrough(),
      if_reject: z.object({ repository_root: root }).passthrough(),
    }).passthrough(),
    staleness: z.object({ state: z.literal("current") }).passthrough(),
  }).passthrough().parse(entry);
  return {
    proposal_id: parsed.proposal_id,
    entry_root: parsed.entry_root,
    inputs: parsed.inputs,
    authority_heads: parsed.authority_heads,
    predictions: {
      before_repository_root: parsed.standing_delta.before.repository_root,
      if_accept_repository_root: parsed.standing_delta.if_accept.repository_root,
      if_reject_repository_root: parsed.standing_delta.if_reject.repository_root,
    },
  };
}

export function currentProposedStatePreview({
  entry,
  projectionRoot,
  revision,
}: {
  entry: Entry;
  projectionRoot: string;
  revision: ExactRevision;
}): ProposedStatePreview {
  const packet = exactEntry(entry);
  if (!revision.repository_root || packet.inputs.repository_root !== revision.repository_root) {
    throw new Error(`${packet.proposal_id}: proposed-state preview base Repository root drift`);
  }
  if (packet.predictions.before_repository_root !== revision.repository_root) {
    throw new Error(`${packet.proposal_id}: proposed-state preview before root drift`);
  }
  return rootedPreview({
    schema: "vela.projection-proposed-state-preview.v1",
    authority_effect: "none",
    state: "current",
    proposal_id: packet.proposal_id,
    entry_root: packet.entry_root,
    projection_root: root.parse(projectionRoot),
    base: {
      git_commit: commit.parse(revision.git_commit),
      revision_root: root.parse(revision.row_root),
      repository_root: root.parse(revision.repository_root),
    },
    inputs: packet.inputs,
    authority_heads: packet.authority_heads,
    predictions: packet.predictions,
    terminal: null,
    blocker: null,
    nonclaims,
  });
}

export function unavailableTerminalProposedStatePreview({
  proposalId,
  proposalStatus,
  base,
  terminal,
  blocker,
}: {
  proposalId: string;
  proposalStatus: "accepted" | "rejected" | "withdrawn";
  base: ExactRevision;
  terminal: ExactRevision;
  blocker: { code: string; detail: string };
}): ProposedStatePreview {
  if (!base.repository_root || !terminal.repository_root) {
    throw new Error(`${proposalId}: terminal preview requires two strict-replayed revisions`);
  }
  return rootedPreview({
    schema: "vela.projection-proposed-state-preview.v1",
    authority_effect: "none",
    state: "unavailable",
    proposal_id: proposalId,
    entry_root: null,
    projection_root: null,
    base: {
      git_commit: commit.parse(base.git_commit),
      revision_root: root.parse(base.row_root),
      repository_root: root.parse(base.repository_root),
    },
    inputs: null,
    authority_heads: null,
    predictions: null,
    terminal: {
      proposal_status: proposalStatus,
      git_commit: commit.parse(terminal.git_commit),
      revision_root: root.parse(terminal.row_root),
      repository_root: root.parse(terminal.repository_root),
      applied_exactly_as_reviewed: null,
    },
    blocker,
    nonclaims,
  });
}

export function terminalProposedStatePreview({
  entry,
  projectionRoot,
  proposalStatus,
  base,
  terminal,
}: {
  entry: Entry;
  projectionRoot: string;
  proposalStatus: "accepted" | "rejected";
  base: ExactRevision;
  terminal: ExactRevision;
}): ProposedStatePreview {
  const packet = exactEntry(entry);
  if (!base.repository_root || !terminal.repository_root) {
    throw new Error(`${packet.proposal_id}: terminal preview requires two strict-replayed revisions`);
  }
  if (packet.inputs.repository_root !== base.repository_root) {
    throw new Error(`${packet.proposal_id}: terminal preview base drift`);
  }
  const predicted = proposalStatus === "accepted"
    ? packet.predictions.if_accept_repository_root
    : packet.predictions.if_reject_repository_root;
  if (predicted !== terminal.repository_root) {
    throw new Error(`${packet.proposal_id}: terminal Repository root differs from reviewed preview`);
  }
  return rootedPreview({
    schema: "vela.projection-proposed-state-preview.v1",
    authority_effect: "none",
    state: "terminal_historical",
    proposal_id: packet.proposal_id,
    entry_root: packet.entry_root,
    projection_root: root.parse(projectionRoot),
    base: {
      git_commit: commit.parse(base.git_commit),
      revision_root: root.parse(base.row_root),
      repository_root: root.parse(base.repository_root),
    },
    inputs: packet.inputs,
    authority_heads: packet.authority_heads,
    predictions: packet.predictions,
    terminal: {
      proposal_status: proposalStatus,
      git_commit: commit.parse(terminal.git_commit),
      revision_root: root.parse(terminal.row_root),
      repository_root: root.parse(terminal.repository_root),
      applied_exactly_as_reviewed: true,
    },
    blocker: null,
    nonclaims,
  });
}

/** Classify a retained non-terminal preview against the latest exact packet.
 * The builder currently emits `current` plus terminal/unavailable records. This
 * pure boundary pins how a retained packet must be reclassified once a later
 * release carries it forward. */
export function classifyRetainedProposedStatePreview({
  retained,
  currentEntryRoot,
  currentProposalRoot,
}: {
  retained: ProposedStatePreview;
  currentEntryRoot: HashRoot | null;
  currentProposalRoot: HashRoot | null;
}): "current" | "stale_recomputable" | "invalidated" {
  const preview = proposedStatePreviewSchema.parse(retained);
  if (!preview.entry_root || !preview.inputs || preview.terminal) return "invalidated";
  if (currentEntryRoot === preview.entry_root) return "current";
  return currentProposalRoot === preview.inputs.proposal_root
    ? "stale_recomputable"
    : "invalidated";
}

export function verifyProposedStatePreview(value: unknown): ProposedStatePreview {
  const preview = proposedStatePreviewSchema.parse(value);
  const { preview_root: _root, ...body } = preview;
  if (sha256(canonicalJson(body)) !== preview.preview_root) {
    throw new Error("proposed-state preview root drift");
  }
  return preview;
}
