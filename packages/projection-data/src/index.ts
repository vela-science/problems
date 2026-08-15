import { z } from "zod";
import { canonicalJson, sha256 } from "./canonical";
import { neon } from "./neon-client";
import { velaGeneratorBinaryRoots, velaReadableVersions } from "./release";
import { assertReadableRelease, currentProjectionManifestSchemaId, graphRead } from "./read-contracts";
import { ProjectionReadError, projectionRefusal } from "./refusal";
import { currentProjectionContract } from "./projection-contract";
import {
  proposedStatePreviewSchema,
  verifyProposedStatePreview,
} from "./proposed-state-preview";
import {
  repositoryCheckoutCommand,
  repositoryIdSchema,
  repositoryKey,
  repositoryRegistry,
  slugForRepositoryId,
} from "./registry";
import {
  resolveObjectContextGraphId,
  type ObjectContextIdentityMapping,
  type SiteObjectContext,
} from "./object-context";
import {
  bindMathSourceObservationToDeclaration,
  repositorySourceBindingSchema,
  mathSourceObservationSchema,
  mathSourceRegistryReleaseSchema,
  mathSourceDeclarationSchema,
  nativeSourceRecordSchema,
  type RepositorySourceBinding,
  type MathSourceDeclaration,
  type MathSourceObservation,
  type MathSourceRegistryRelease,
  type NativeSourceRecord,
} from "./math-sources";
import {
  candidateProblemIdentity,
  problemResolutionConfig,
  problemResolutionConfigRoot,
  problemResolutionSourcesForNamespace,
  reviewedProblemBindingOccurrences,
  resolveProblemSources,
  type ReviewedProblemBindingOccurrence,
  type ProblemSourceResolution,
  type ProblemRelationKind,
  type ProblemResolutionCandidateSource,
} from "./problem-resolution";
import { assertProblemSourceCoverageBounds, summarizeReviewedProblemSourceCoverage, type ProblemSourceCoverageSummary } from "./problem-source-coverage";
import {
  assertSourceCorpusProfileBounds,
  MAX_SOURCE_CORPUS_RECORDS_PER_PROFILE,
  sourceCorpusProfilesConfig,
  summarizeSourceCorpusMap,
  type SourceCorpusMapRead,
} from "./source-corpus-map";
export * from "./search";
export * from "./release";
export * from "./refusal";
export * from "./read-contracts";
export * from "./object-context";
export * from "./math-sources";
export * from "./problem-discovery";
export * from "./problem-resolution";
export * from "./problem-public-routes";
export * from "./problem-source-coverage";
export * from "./source-corpus-map";
export * from "./formal-conjectures-audit";
export * from "./proposed-state-preview";
export * from "./registry";

export type { HashRoot } from "./canonical";
import type { HashRoot } from "./canonical";
/* Re-exported so an application can build the one link a content-addressed
   record most needs: the exact file at the exact commit. The parser existed
   only for the builder's origin assertion, reached by relative path, while the
   Problems shipped no permalink to any record at all. */
export { canonicalGitHubRepository } from "./git-remote";

/* A root is `sha256:` and 64 hex digits, and that shape is the type: the
   template literal compiles to exactly `^sha256:[0-9a-f]{64}$` and infers
   `sha256:${string}`, which is `HashRoot`. Every schema below therefore hands
   its caller a root already typed as one, and the collapse from interface to
   `z.infer` loses nothing. */
const hashRootSchema = z.templateLiteral(["sha256:", z.string().regex(/^[0-9a-f]{64}$/u)]);

const repositoryIdentitySchema = z.object({
  id: repositoryIdSchema,
  name: z.string().min(1),
  profile_root: hashRootSchema,
});

/* The read surface's compatibility rule, written where it is enforced.
 *
 * `vela.status.v4` is a derived view: nothing under it is hashed and nothing
 * under it is signed, so a field this schema does not name is the same document
 * with more in it. Every field below is required, and that is what catches a
 * dropped or renamed one. Rejecting *extra* fields catches nothing further, and
 * it cost three fail-closed breaks of the projection refresh in six days —
 * `counts.withdrawn_review` arriving, `git.role` arriving, and
 * `actions.work.mode` becoming a two-member union — every one of them additive.
 * So no object here is strict. Zod strips what it does not name, which is the
 * consumer obligation this document carries: hold every field you were promised
 * to its declared type, and ignore the rest.
 *
 * The opposite rule governs a signed preimage, and the protocol is right to
 * enforce it there: `rooted()` hashes canonical JSON including keys, so an
 * added field is a different object with a different root and
 * `deny_unknown_fields` is the enforcement. Do not carry this relaxation across
 * that line. See the Vela repository's `docs/INTEROPERABILITY.md` for both rules stated together. */
const currentCompactStatusSchema = z.object({
  schema: z.literal("vela.status.v4"),
  ok: z.literal(true),
  command: z.literal("status"),
  repository: repositoryIdentitySchema,
  git: z.object({
    role: z.literal("repository_head"),
    commit: z.string().regex(/^[0-9a-f]{40}$/u),
    tree: z.string().regex(/^[0-9a-f]{40}$/u),
  }),
  /* Literals, not words: this schema is the only way a status enters the site,
     so a Repository that did not replay or did not pass strict never becomes a
     `CompactStatus` at all. */
  integrity: z.object({
    replay: z.literal("verified"),
    strict: z.literal("pass"),
    blocker_count: z.literal(0),
    blockers_by_code: z.record(z.string(), z.number().int().nonnegative()),
  }),
  roots: z.object({
    origin: hashRootSchema,
    repository: hashRootSchema,
    authority_keyset: hashRootSchema,
    authority_policy: hashRootSchema,
  }),
  counts: z.object({
    claims: z.number().int().nonnegative(),
    accepted_claims: z.number().int().nonnegative(),
    pending_claims: z.number().int().nonnegative(),
    pending_review: z.number().int().nonnegative(),
    accepted_review: z.number().int().nonnegative(),
    rejected_review: z.number().int().nonnegative(),
    withdrawn_review: z.number().int().nonnegative(),
    submissions: z.number().int().nonnegative(),
    verifications: z.number().int().nonnegative(),
    artifacts: z.number().int().nonnegative(),
  }),
  decision_inbox: z.object({
    pending_count: z.number().int().nonnegative(),
    protocol_ready_count: z.number().int().nonnegative(),
    protocol_blocked_count: z.number().int().nonnegative(),
    projection_root: hashRootSchema,
    first_entry_root: hashRootSchema.nullable(),
  }),
  actions: z.object({
    review: z.object({
      pending_count: z.number().int().positive(),
      command: z.string().min(1),
    }).nullable(),
    work: z.discriminatedUnion("mode", [
      z.object({
        mode: z.literal("direct_submission"),
        command: z.string().min(1),
        note: z.string().min(1),
      }),
      /* A Repository whose repository authority never finished initializing still
         answers `vela status`, and answers it with this same document — the CLI
         used to hand that phase a schema literal of its own. It cannot reach
         the site: `integrity` above pins `verified`/`pass`, and this phase is
         neither. The member is here so the union describes every status the CLI
         emits, rather than parsing a real one as malformed. */
      z.object({
        mode: z.literal("authority_uninitialized"),
        command: z.string().min(1),
        note: z.string().min(1),
      }),
    ]),
  }),
}).superRefine((status, context) => {
  /* The one thing above that no field type can say: the two Claim standings
     have to add up to the total the same document reports. */
  if (status.counts.claims !== status.counts.accepted_claims + status.counts.pending_claims) {
    context.addIssue({ code: "custom", path: ["counts", "claims"], message: "Claim standing counts do not partition the repository" });
  }
});

export const compactStatusSchema = currentCompactStatusSchema;

export type CompactStatus = z.infer<typeof compactStatusSchema>;

export function statusClaimCount(status: CompactStatus): number {
  return status.counts.claims;
}

export function statusStateRoot(status: CompactStatus): { label: string; value: HashRoot } {
  return statusStateRoots(status)[0];
}

export function statusStateRoots(status: CompactStatus): Array<{ label: string; value: HashRoot }> {
  if (status.roots.repository && status.roots.origin) {
    return [
      { label: "Repository root", value: status.roots.repository },
      { label: "Origin root", value: status.roots.origin },
    ];
  }
  throw new Error("current compact Vela status has no repository origin");
}

/* One projection timestamp, as a value that sorts.
 *
 * The driver returns `timestamptz` as a `Date`, and `String(date)` yields
 * "Wed Aug 05 2026 01:49:01 GMT-0400 (Eastern Daylight Time)". Four ledgers
 * then ordered themselves with `localeCompare` over exactly that string, which
 * compares the weekday name first: across the 54 retained Proposals the
 * rendered order left the SQL order at row 24, because "Sun" sorts above
 * "Mon". The same string also renders in whichever timezone the server happens
 * to hold and is not reliably parseable, so `<time dateTime>` carried a value
 * no machine could read.
 *
 * ISO 8601 in UTC fixes all three at once: it is what `dateTime` is specified
 * to hold, and its lexical order is its chronological order, so a string sort
 * anywhere downstream is correct by construction rather than by luck.
 *
 * Columns already declared `text` (`source_observations.observed_at`) hold a
 * producer's own declared instant and are not re-derived here. */
export function instant(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const repositoryGraphProjectionSchema = z.object({
  schema: z.literal("site.repository-graph-projection.v2"),
  source_path: z.string(),
  source_sha256: hashRootSchema,
  source_repository_root: hashRootSchema,
  layout_root: hashRootSchema,
  node_count: z.number().int().nonnegative(),
  edge_count: z.number().int().nonnegative(),
  problem_count: z.number().int().nonnegative(),
  claim_count: z.number().int().nonnegative(),
});

export type RepositoryGraphProjection = z.infer<typeof repositoryGraphProjectionSchema>;

/* The protocol's four outcomes, from `verification-record-v1.schema.json`, plus
   the one case a projection can be in that no Verification Record can: none was
   retained. Declared here rather than imported so the data layer does not
   depend on the UI package; it is the same union `@vela/ui` declares and stays
   structurally assignable to it. */
const verificationOutcomeSchema = z.enum([
  "pass",
  "fail",
  "error",
  "inconclusive",
  "not_attempted",
]);

export type VerificationOutcome = z.infer<typeof verificationOutcomeSchema>;

/* A Proposal carries several checks, and the glyph, the badge and the rail's
   sentence each show one outcome. It is the worst thing any check reported,
   because a single failing check is the fact a reader must not lose behind an
   average. This was derived in three places in three vocabularies, and one of
   them reported a retained `error` as `inconclusive`.

   An outcome word the protocol does not name is inconclusive rather than
   `not_attempted`: the record exists, and saying none was attempted is the same
   class of misstatement. */
export function verificationCore(
  review: { verification_records?: ReadonlyArray<{ outcome: string }> | null },
): VerificationOutcome {
  const outcomes = (review.verification_records ?? []).map((record) => record.outcome);
  if (!outcomes.length) return "not_attempted";
  for (const outcome of ["fail", "error", "inconclusive"] as const) {
    if (outcomes.includes(outcome)) return outcome;
  }
  return outcomes.every((outcome) => outcome === "pass") ? "pass" : "inconclusive";
}

const decisionPacketSchema = z.object({
  entry_root: hashRootSchema,
  assertion: z.string().optional(),
  conditions: z.array(z.string()),
  verification_records: z.array(z.object({
    verification_record_id: z.string(),
    verification_record_root: hashRootSchema,
    outcome: z.string(),
    property: z.string(),
    verifier: z.string(),
    independent_of_producer: z.boolean(),
    satisfies_requirements: z.array(z.string()),
    protocol_evidence_role: z.string(),
    does_not_establish: z.array(z.string()),
  })).optional(),
  readiness: z.union([
    z.object({
      protocol_gate: z.enum(["satisfied", "blocked"]),
      attributed_decision_required: z.literal(true),
      rejection_available: z.boolean(),
      blockers: z.array(z.object({ code: z.string(), subject: z.string(), detail: z.string() })),
    }),
    /* The activated predecessor release was built from Decision Inbox v2.
       It expressed the same mandatory-attribution gate with a human-only
       field name. Read that immutable release, but normalize the application
       shape to the v3 attributed-performer contract. */
    z.object({
      protocol_gate: z.enum(["satisfied", "blocked"]),
      human_decision_required: z.literal(true),
      rejection_available: z.boolean(),
      blockers: z.array(z.object({ code: z.string(), subject: z.string(), detail: z.string() })),
    }),
  ]).transform((value) => ({
    protocol_gate: value.protocol_gate,
    attributed_decision_required: true as const,
    rejection_available: value.rejection_available,
    blockers: value.blockers,
  })),
  standing_delta: z.object({
    transition: z.string(),
    /* The emitter derives `target_claim_id` from the Proposal's action and has
       no branch that omits it: an add and a withdraw name their own Claim, a
       revise names the one it corrects, and any other action fails the packet
       before it is built. Accepting null here invited a surface to write a
       null-handling path for a value the wire cannot carry. */
    scope: z.object({
      kind: z.string(),
      target_claim_id: z.string(),
      affected_claim_ids: z.array(z.string()),
    }).optional(),
    before: z.object({ repository_root: hashRootSchema, accepted: z.array(z.object({ claim_id: z.string(), claim_root: hashRootSchema })) }),
    if_accept: z.object({ repository_root: hashRootSchema, accepted: z.array(z.object({ claim_id: z.string(), claim_root: hashRootSchema })) }),
    if_reject: z.object({ repository_root: hashRootSchema, accepted: z.array(z.object({ claim_id: z.string(), claim_root: hashRootSchema })) }),
    counts: z.object({
      unchanged_accepted_claims: z.number().int().nonnegative(),
      global_accepted_claims: z.object({
        before: z.number().int().nonnegative(),
        if_accept: z.number().int().nonnegative(),
        if_reject: z.number().int().nonnegative(),
      }),
    }),
  }),
  limits: z.array(z.string()),
  next_obligation: z.object({ now: z.string(), if_accept: z.string(), if_reject: z.string() }),
});

export type DecisionPacketSummary = z.infer<typeof decisionPacketSchema>;

const reviewSchema = z.object({
  proposal_id: z.string(),
  status: z.string(),
  kind: z.string(),
  target: z.string(),
  claim: z.string(),
  content_root: hashRootSchema.nullable(),
  receipt_root: hashRootSchema.nullable(),
  created_at: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  reviewed_by: z.string().nullable(),
  /* Releases activated before performer provenance was projected omit these
     fields rather than serialising null. Normalize that predecessor shape at
     the reader boundary; newly built rows always carry all three fields. */
  decision_actor_class: z.enum(["human", "agent"]).nullish().transform((value) => value ?? null),
  decision_session_ref: z.string().nullish().transform((value) => value ?? null),
  decision_authority_principal_id: z.string().nullish().transform((value) => value ?? null),
  decision_event_id: z.string().nullable(),
  decision_plan_root: hashRootSchema.nullable(),
  decision_provenance: z.enum(["pending", "producer_withdrawal", "signed_record", "signed_event", "legacy_materialized"]),
  applied_event_id: z.string().nullable(),
  decision_reason: z.string().nullable(),
  producer_package_kind: z.enum(["submission_v1", "receipt_v1", "unrecorded"]).optional(),
  producer_package_id: z.string().nullable().optional(),
  producer_package_root: hashRootSchema.nullable().optional(),
  /* What the producer declared when it submitted, read out of the retained
     Submission rather than summarised. The three fields above identify the
     package; this is what is inside it. */
  producer_package: z.object({
    producer_actor: z.string().nullable(),
    submitted_at: z.string().nullable(),
    verification_requirements: z.array(z.string()),
    artifacts: z.array(z.object({ kind: z.string(), digest: hashRootSchema })),
    caveats: z.array(z.string()),
    replayability: z.string().nullable(),
    requested_change_kind: z.string().nullable(),
  }).nullable().optional(),
  /* `verificationCore` over the records below, retained so a caller holding
     only the summary reads the same outcome the ledger draws. */
  /* The Claim's axis beside the Proposal's. `status` above stays `accepted`
     when a later correction retires the Claim this Proposal admitted; this says
     that it did, and which Claim did it. Optional so a summary built before the
     column existed still satisfies the schema. */
  claim_retirement: z.enum(["corrected", "superseded"]).nullable().optional(),
  retired_by_claim_id: z.string().nullable().optional(),
  verification_status: verificationOutcomeSchema.optional(),
  verification_record_count: z.number().int().nonnegative().optional(),
  verification_records: z.array(z.object({
    verification_record_id: z.string(),
    verification_root: hashRootSchema,
    outcome: z.string(),
    verifier_actor: z.string(),
    completed_at: z.string().nullable(),
    /* The verifier's own scope and limits. The projection has always retained
       them inside the Verification Record; carrying them here is what lets a
       surface print what a check covered instead of restating its outcome. New
       fields stay optional so a `ReviewSummary` built before this lift, or by
       a surface this change never intended to touch, still satisfies it. */
    started_at: z.string().nullable().optional(),
    property: z.string().nullable().optional(),
    does_not_establish: z.array(z.string()).optional(),
    verifier_profile: z.string().nullable().optional(),
    independent_of: z.array(z.string()).optional(),
    shared_dependencies: z.array(z.string()).optional(),
    reviewer_kind: z.enum(["human", "ai_model", "organization", "deterministic_tool"]).nullable().optional(),
    reviewer_display_name: z.string().nullable().optional(),
    reviewer_identifier: z.string().nullable().optional(),
    reviewer_provider: z.string().nullable().optional(),
    reviewer_version: z.string().nullable().optional(),
    review_method_root: hashRootSchema.nullable().optional(),
  })).optional(),
  decision_packet: decisionPacketSchema.nullable().optional(),
  proposed_state_preview: proposedStatePreviewSchema.nullable().optional(),
});

export type ReviewSummary = z.infer<typeof reviewSchema>;

/**
 * The Verification outcome a Proposal surface names.
 *
 * `verificationCore` above derives an outcome from the records; the projection
 * also retains that derivation as `verification_status`, so a caller holding
 * only the summary reads the same outcome the ledger draws. Three surfaces
 * disagreed about which to use: one preferred the retained column, two
 * recomputed from `verification_records`. A summary whose records array is
 * trimmed or absent makes those two answers differ, and the retained column is
 * the one the projection vouches for.
 *
 * One rule, in one place: the retained column, falling back to the derivation
 * for a summary that predates it.
 */
export function reviewVerification(
  review: Pick<ReviewSummary, "verification_records"> & { verification_status?: VerificationOutcome },
): VerificationOutcome {
  return review.verification_status ?? verificationCore(review);
}

/* The Claim standing axis, declared here for the same reason
   `VerificationOutcome` is: the data layer must not depend on the UI package,
   and this is the union `@vela/ui` declares.

   A `claimStanding(claim)` used to sit below this and map every non-`accepted`
   column value onto the axis, because the column held `pending_review`, a
   Proposal-axis word. The projection builder now writes these words, so there
   is nothing left to translate and every surface reads the column; a
   translation that has become the identity only hides where the words diverge.

   Nothing is promoted onto the axis either. `contested` and `retracted` are
   producer-side source flags and conditions are authored by the Submission, so
   reading them as `corrected` or `accepted_with_conditions` would say an
   authority had ruled where none had. Callers show them as what they are. */
export type ClaimStanding =
  | "unassessed"
  | "accepted"
  | "accepted_with_conditions"
  | "corrected"
  | "superseded"
  | "retracted";

const claimSchema = z.object({
  id: z.string(),
  /* `root` and `standing` were declared on the type and nowhere in this schema,
     so a Claim parsed here arrived stripped of both. The producer emits them —
     `projectClaim` writes `claim_root` and the standing word, `claimFromRow`
     reads them back — and only the emptiness of the release's `claims` array
     kept the loss latent. */
  root: hashRootSchema.optional(),
  /* The two standings the repository index can bind, in the standing axis's own
     vocabulary. Required, because the column is `NOT NULL` and every query that
     builds this reads `f.*`; optional invited each caller to invent a default
     for a case that does not occur. */
  standing: z.enum([
    "accepted",
    "unassessed",
    "corrected",
    "superseded",
    "retracted",
  ] as const satisfies readonly ClaimStanding[]),
  assertion: z.string(),
  assertion_type: z.string(),
  /* The projection retains conditions as a list. Joining them into one string
     lost the boundary between two conditions, which is the only thing that
     makes them countable on a row. */
  conditions: z.array(z.string()),
  created: z.string().nullable(),
  source_title: z.string().nullable(),
  source_type: z.string().nullable(),
  /* The record's own file, repository-relative. Retained since the schema was
     written and read by nothing, so every Claim page could name its digest and
     none could name the file that digest is of. */
  source_path: z.string().nullable(),
  /* The retained record itself, canonicalised back into the exact bytes whose
     sha256 is `root`. Carried only by the single-record read: a ledger page
     asks for fifty rows and none of them needs a kilobyte of jsonb to draw a
     row. */
  record: z.unknown().optional(),
  /* A Proposal targeting this Claim is retained. It says nothing about a
     Decision or a Verification outcome; those are separate axes and a reader of
     this field must not print one for the other. */
  has_proposal: z.boolean(),
  contested: z.boolean(),
  retracted: z.boolean(),
  evidence_count: z.number().int().nonnegative(),
  revision: z.number().int().nullable(),
  relation_count: z.number().int().nonnegative(),
});

export type ClaimSummary = z.infer<typeof claimSchema>;

export interface ClaimStandingLineage {
  submission: {
    id: string | null;
    root: HashRoot | null;
  } | null;
  /* One entry per Verification Record, and deliberately not reduced to a
     single outcome. `verificationCore` reduces the set to its worst case,
     which is the right input to a badge and the wrong answer to "what was
     checked": a Proposal can hold `lean_kernel_acceptance = pass` beside
     `statement_fidelity = fail`, and either reduction of that pair deletes
     the result. `property` names the dimension; `does_not_establish` is what
     the verifier refused to claim, which is the sentence a reader arriving at
     a Claim most needs and until now could only find on the Proposal. */
  verifications: Array<{
    id: string;
    root: HashRoot;
    outcome: string;
    property: string | null;
    does_not_establish: string[];
    verifier: string;
    verifier_profile: string | null;
    reviewer_kind?: "human" | "ai_model" | "organization" | "deterministic_tool";
    reviewer_display_name?: string;
    reviewer_identifier?: string;
    reviewer_provider?: string | null;
    reviewer_version?: string | null;
    review_method_root?: HashRoot;
    completed_at: string | null;
  }>;
  /* `status` and not `standing`: a Proposal has a lifecycle position
     (`pending_review | accepted | rejected | withdrawn`), while Standing is the
     Claim-axis vocabulary this same interface family declares as
     `ClaimStanding`. `accepted` appears in both, so one word for both axes
     reads correct everywhere and is wrong everywhere. */
  proposal: {
    id: string;
    status: string;
    claim_root: HashRoot | null;
    created_at: string | null;
  };
  decision: {
    provenance: ReviewSummary["decision_provenance"];
    event_id: string | null;
    applied_event_id: string | null;
    plan_root: HashRoot | null;
    reason: string | null;
    decided_at: string | null;
    decided_by: string | null;
    performer_class: "human" | "agent" | null;
    session_ref: string | null;
    authority_principal_id: string | null;
  } | null;
}

export interface ClaimStandingView {
  claim_id: string;
  standing: ClaimStanding;
  lineage_state: "retained" | "not_projected";
  lineages: ClaimStandingLineage[];
}

/**
 * Builds the exact Claim-centred authority view already retained by the read
 * projection. It deliberately does not reconstruct historical lineage from
 * matching text, dates, graph proximity, or verifier outcome.
 */
export function buildClaimStandingView(
  claim: ClaimSummary,
  reviews: ReviewSummary[],
): ClaimStandingView {
  /* `claimFromRow` reads an untyped row, so this is the read-time boundary that
     holds the column to the two standings the repository index can bind. */
  if (!["accepted", "unassessed", "corrected", "superseded", "retracted"].includes(claim.standing)) {
    throw new Error(`${claim.id}: projected Claim has no exact Standing`);
  }

  const retained = reviews
    .filter((review) => review.target === claim.id)
    .sort((left, right) =>
      (right.reviewed_at ?? right.created_at ?? "").localeCompare(
        left.reviewed_at ?? left.created_at ?? "",
      ) || left.proposal_id.localeCompare(right.proposal_id),
    );

  const lineages = retained.map((review): ClaimStandingLineage => {
    if (
      claim.root
      && review.content_root
      && claim.root !== review.content_root
    ) {
      throw new Error(`${review.proposal_id}: Proposal binds a different Claim root`);
    }

    const submission = review.producer_package_kind === "submission_v1"
      ? {
          id: review.producer_package_id ?? null,
          root: review.producer_package_root ?? review.receipt_root ?? null,
        }
      : null;
    /* A producer withdrawing its own Proposal is not a Decision. Keying on
       `!== "pending"` alone put the producer in the authority slot with no
       reason under it, which is the same collapse /decisions carried. The
       withdrawal is not lost: the Proposal row above renders its own
       `withdrawn` badge on the proposal axis. */
    const decision = review.decision_provenance === "pending"
      || review.decision_provenance === "producer_withdrawal"
      ? null
      : {
          provenance: review.decision_provenance,
          event_id: review.decision_event_id,
          applied_event_id: review.applied_event_id,
          plan_root: review.decision_plan_root,
          reason: review.decision_reason,
          decided_at: review.reviewed_at,
          decided_by: review.reviewed_by,
          performer_class: review.decision_actor_class,
          session_ref: review.decision_session_ref,
          authority_principal_id: review.decision_authority_principal_id,
        };

    return {
      submission,
      verifications: (review.verification_records ?? []).map((record) => ({
        id: record.verification_record_id,
        root: record.verification_root,
        outcome: record.outcome,
        property: record.property ?? null,
        does_not_establish: record.does_not_establish ?? [],
        verifier: record.verifier_actor,
        verifier_profile: record.verifier_profile ?? null,
        ...(record.reviewer_kind && record.reviewer_display_name && record.reviewer_identifier
          ? {
              reviewer_kind: record.reviewer_kind,
              reviewer_display_name: record.reviewer_display_name,
              reviewer_identifier: record.reviewer_identifier,
              reviewer_provider: record.reviewer_provider ?? null,
              reviewer_version: record.reviewer_version ?? null,
              ...(record.review_method_root ? { review_method_root: record.review_method_root } : {}),
            }
          : {}),
        completed_at: record.completed_at,
      })),
      proposal: {
        id: review.proposal_id,
        status: review.status,
        claim_root: review.content_root,
        created_at: review.created_at,
      },
      decision,
    };
  });

  return {
    claim_id: claim.id,
    standing: claim.standing,
    lineage_state: lineages.length > 0 ? "retained" : "not_projected",
    lineages,
  };
}

export const siteRepositorySchema = z.object({
  slug: z.string(),
  source: z.object({
    remote: z.string().url(),
    access: z.enum(["public", "private"]),
    commit: z.string().regex(/^[0-9a-f]{40}$/u),
    tree: z.string().regex(/^[0-9a-f]{40}$/u),
    committed_at: z.string(),
  }),
  published_snapshot_at: z.string(),
  status: compactStatusSchema,
  graph: repositoryGraphProjectionSchema.nullable(),
  reviews: z.array(reviewSchema),
  claims: z.array(claimSchema),
  reproduce: z.object({ clone: z.string(), checkout: z.string(), command: z.string() }),
});

export type SiteRepository = z.infer<typeof siteRepositorySchema>;

/** The two integrity booleans, which are read as a pair wherever they appear. */
export function repositoryIntegrity(repository: SiteRepository): { strict: boolean; replayed: boolean } {
  return {
    strict: repository.status.integrity.strict === "pass",
    replayed: repository.status.integrity.replay === "verified",
  };
}

/* What the Repository has reached, in the order the mark draws it.
 *
 * The Repositories list and a Repository's own header each built this from
 * `status.counts`, and the arithmetic is not plumbing: `decisions` summed the
 * withdrawn Proposals too, so a Repository whose only terminal Proposal was
 * withdrawn drew a lit Decision star. `vela review withdraw` is producer-owned
 * queue hygiene — it reads no repository-authority key and emits no Event
 * (PROTOCOL.md 5.5) — so a withdrawal is a terminal Proposal and never a
 * Decision. It still counts toward `proposals`, which asks a different
 * question. */
export function repositoryLoop(repository: SiteRepository): {
  source: boolean;
  submissions: number;
  proposals: number;
  verifications: number;
  decisions: number;
  replayed: boolean;
  accepted: number;
} {
  const counts = repository.status.counts;
  const decisions = counts.accepted_review + counts.rejected_review;
  return {
    source: repository.source.commit.length === 40,
    submissions: counts.submissions,
    proposals: decisions + counts.withdrawn_review + counts.pending_review,
    verifications: counts.verifications,
    decisions,
    replayed: repositoryIntegrity(repository).replayed,
    accepted: counts.accepted_claims,
  };
}

export const projectionReleaseSchema = z.object({
  schema: z.literal("vela.projection-release.v1"),
  generated_at: z.string(),
  generator: z.object({ vela_version: z.string(), vela_binary_sha256: hashRootSchema }),
  repositories: z.array(siteRepositorySchema),
});

export type ProjectionRelease = z.infer<typeof projectionReleaseSchema>;

const currentProjectionSourceRepositorySchema = z.object({
  /* The manifest names each repository by its protocol identity, like every
     table the release carries. `siteRepositorySchema` above keeps `slug` because
     that is the reader's shape, not the release's. */
  repository_id: repositoryIdSchema,
  commit: z.string().regex(/^[0-9a-f]{40}$/u),
  tree: z.string().regex(/^[0-9a-f]{40}$/u),
  origin_id: z.string().regex(/^vro_[0-9a-f]{16}$/u),
  origin_root: hashRootSchema,
  repository_root: hashRootSchema,
  authority_keyset_root: hashRootSchema,
  authority_policy_root: hashRootSchema,
  claim_count: z.number().int().nonnegative(),
  accepted_claim_count: z.number().int().nonnegative(),
  pending_claim_count: z.number().int().nonnegative(),
  review_count: z.number().int().nonnegative(),
  submission_count: z.number().int().nonnegative(),
  verification_count: z.number().int().nonnegative(),
  graph_source_root: hashRootSchema.nullable(),
  graph_layout_root: hashRootSchema.nullable(),
  graph_node_count: z.number().int().nonnegative(),
  graph_edge_count: z.number().int().nonnegative(),
  problem_count: z.number().int().nonnegative(),
  graph_claim_count: z.number().int().nonnegative(),
}).superRefine((repository, context) => {
  if (repository.claim_count !== repository.accepted_claim_count + repository.pending_claim_count) {
    context.addIssue({
      code: "custom",
      path: ["claim_count"],
      message: "Claim standing counts do not partition the projected repository",
    });
  }
});

const projectionManifestBaseSchema = z.object({
  generated_at: z.string(),
  activation_time: z.string(),
  vela_binary_sha256: hashRootSchema,
  release_root: hashRootSchema,
  table_roots: z.record(z.string(), hashRootSchema),
}).strict();

export const currentProjectionManifestSchema = projectionManifestBaseSchema.extend({
  schema: z.literal(currentProjectionManifestSchemaId),
  /* Not a literal on the pinned release: a projection is generated after the
     code that reads it lands, so equality here makes a version bump
     unperformable. See readable_predecessors in release.ts. */
  vela_version: z.enum(velaReadableVersions as [string, ...string[]]),
  source_repositories: z.array(currentProjectionSourceRepositorySchema),
  source_registry: mathSourceRegistryReleaseSchema,
}).superRefine((manifest, context) => {
  if (!velaGeneratorBinaryRoots.has(manifest.vela_binary_sha256)) {
    context.addIssue({
      code: "custom",
      path: ["vela_binary_sha256"],
      message: "projection generator binary is not a checked platform binary for this Vela release",
    });
  }
});

export type ProjectionManifest = z.infer<
  typeof currentProjectionManifestSchema
>;

export function normalizeProjectionManifest(
  value: unknown,
): ProjectionManifest {
  return currentProjectionManifestSchema.parse(value);
}

export const projectionManifestSchema = z.unknown().transform((value, context) => {
  try {
    return normalizeProjectionManifest(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "invalid Problems projection manifest",
    });
    return z.NEVER;
  }
});

type ReleaseRow = { manifest: unknown };

let releasePromise: Promise<ProjectionRelease> | undefined;

function projectionDatabaseUrl(): string {
  const value = process.env.VELA_PROJECTION_DATABASE_URL;
  if (!value) throw new Error("VELA_PROJECTION_DATABASE_URL is required for repository reads");
  return value;
}

export function projectionRelease(): Promise<ProjectionRelease> {
  releasePromise ??= (async () => {
    const [repositories, manifest] = await Promise.all([allRepositories(), projectionManifest()]);
    return projectionReleaseSchema.parse({
      schema: "vela.projection-release.v1",
      generated_at: manifest.generated_at,
      generator: {
        vela_version: manifest.vela_version,
        vela_binary_sha256: manifest.vela_binary_sha256,
      },
      repositories,
    });
  })();
  return releasePromise;
}

export async function projectionManifest(): Promise<ProjectionManifest> {
  const sql = neon(projectionDatabaseUrl());
  const boundRoot = process.env.VELA_PROJECTION_RELEASE_ROOT;
  if (boundRoot && !hashRootSchema.safeParse(boundRoot).success) {
    throw new Error("VELA_PROJECTION_RELEASE_ROOT is malformed");
  }
  if (!boundRoot) return currentProjectionManifest();
  const rows = await sql.query(
    "SELECT manifest FROM projection.releases WHERE release_root = $1 LIMIT 1",
    [boundRoot],
  ) as ReleaseRow[];
  const manifest = rows[0]?.manifest;
  if (!manifest) throw new Error("the Problems projection has no retained release manifest for the bound root");
  return normalizeProjectionManifest(manifest);
}

/**
 * Read the projection head rather than the release root compiled into a site
 * deployment. This is intentionally reserved for the public deployment
 * manifest: ordinary page and API reads remain bound to an exact retained
 * release so a deployment cannot silently change underneath a reader.
 */
export async function currentProjectionManifest(): Promise<ProjectionManifest> {
  const sql = neon(projectionDatabaseUrl());
  const rows = await sql`SELECT r.manifest FROM projection.current_release c
      JOIN projection.releases r USING (release_root) WHERE c.singleton = true LIMIT 1` as ReleaseRow[];
  const manifest = rows[0]?.manifest;
  if (!manifest) throw new Error("the Problems projection has no current release manifest");
  return normalizeProjectionManifest(manifest);
}

/**
 * When a refresh last re-derived the current release and agreed with it.
 *
 * Read on its own rather than folded into the manifest. The manifest schema is
 * `.strict()`, so an extra key would fail `normalizeProjectionManifest`
 * and take `/.well-known/vela-site.json` down with it — and the manifest is
 * written once per release and never updated, so a value that changes every
 * refresh could not live there in any case.
 *
 * Scoped to a release root rather than read bare. A build pins a root, and the
 * pointer can move under it; answering with the live release's confirmation
 * would date a release the page is not serving. No row means no claim.
 *
 * Null until the first refresh after the column was added. The row that existed
 * then was confirmed at an instant nobody recorded, and a made-up one would be
 * worse than none.
 */
export async function projectionConfirmedAt(releaseRoot: HashRoot): Promise<string | null> {
  const sql = neon(projectionDatabaseUrl());
  const rows = await sql`SELECT confirmed_at FROM projection.current_release
      WHERE singleton = true AND release_root = ${releaseRoot}
      LIMIT 1` as { confirmed_at: string | Date | null }[];
  const value = rows[0]?.confirmed_at ?? null;
  return value === null ? null : new Date(value).toISOString();
}

async function boundReleaseRoot(): Promise<HashRoot> {
  return (await projectionManifest()).release_root;
}

export interface MathSourceRegistryReadOptions {
  root?: string;
  sourceId?: string;
  recordSourceId?: string;
  repositorySlug?: string;
  nativeId?: string;
  nativeKind?: string;
  query?: string;
  includeRecords?: boolean;
  limit?: number;
  cursor?: string;
  bindingCursor?: string;
}

export interface ProjectedMathSource {
  declaration: MathSourceDeclaration;
  declaration_row_root: HashRoot;
  observation: MathSourceObservation | null;
  native_record_count: number;
  repository_binding_count: number;
}

export interface MathSourceRegistryReadResult {
  schema: "vela.math-source-registry-read.v1";
  release_root: HashRoot;
  source_registry: MathSourceRegistryRelease;
  sources: ProjectedMathSource[];
  native_records: NativeSourceRecord[];
  repository_bindings: RepositorySourceBinding[];
  next_cursor?: string | null;
  next_binding_cursor?: string | null;
}

export type MathSourceRegistryCursorKind = "native" | "binding";

export function encodeMathSourceRegistryCursor(
  kind: MathSourceRegistryCursorKind,
  values: string[],
): string {
  return Buffer.from(JSON.stringify([kind, ...values]), "utf8").toString(
    "base64url",
  );
}

export function decodeMathSourceRegistryCursor(
  cursor: string | undefined,
  kind: MathSourceRegistryCursorKind,
  valueCount: number,
): string[] | null {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (
      !Array.isArray(decoded)
      || decoded.length !== valueCount + 1
      || decoded[0] !== kind
      || decoded.slice(1).some((value) => typeof value !== "string")
    ) {
      throw new Error("shape");
    }
    return decoded.slice(1);
  } catch {
    throw new ProjectionReadError("invalid_cursor", `invalid Math Source Registry ${kind} cursor`);
  }
}

/* Deliberately uncoded. A count the projection cannot state as a safe integer is
   the projection contradicting itself, not the caller asking for the wrong
   thing — the substring ladder this replaced matched `invalid` here too and
   answered a corrupt projection with `400 Bad Request`. */
function projectedCount(value: unknown, field: string): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`invalid projected ${field}`);
  }
  return count;
}

function nativeSourceRecordFromRow(row: Record<string, any>, rowRootField = "row_root"): NativeSourceRecord {
  return nativeSourceRecordSchema.parse({
    schema: "vela.math-native-record.v1",
    source_id: row.source_id,
    observation_root: row.observation_root,
    native_id: row.native_id,
    native_kind: row.native_kind,
    native_revision: row.native_revision,
    title: row.title,
    summary: row.summary,
    locators: row.locators,
    metadata: row.metadata,
    metadata_root: row.metadata_root,
    content_root: row.content_root,
    availability: row.availability,
    row_root: row[rowRootField],
  });
}

/**
 * Reads the current Math Source Registry. Full native rows and bindings are
 * opt-in and bounded; the ordinary catalogue path reads only declarations,
 * one observation per source, and aggregate counts.
 */
export async function mathSourceRegistryRead(
  input: MathSourceRegistryReadOptions = {},
): Promise<MathSourceRegistryReadResult> {
  const manifest = input.root
    ? await projectionManifestAtRoot(input.root)
    : await projectionManifest();
  const sql = neon(projectionDatabaseUrl());
  const sourceId = input.sourceId?.trim() || null;
  const recordSourceId = input.recordSourceId?.trim() || sourceId;
  const repositorySlug = input.repositorySlug?.trim() || null;
  const nativeId = input.nativeId?.trim() || null;
  const nativeKind = input.nativeKind?.trim() || null;
  const query = input.query?.trim() || null;
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 250);
  const root = manifest.release_root;
  const sourceRows = await sql.query(
    `SELECT
       declaration.source_id,
       declaration.native_namespace,
       declaration.publisher_or_maintainer,
       declaration.locators,
       declaration.attributed_claims,
       declaration.source_kind,
       declaration.rights,
       declaration.snapshot_policy,
       declaration.adapter,
       declaration.coverage AS declaration_coverage,
       declaration.declaration_root,
       declaration.row_root AS declaration_row_root,
       observation.observation_root,
       observation.observation_id,
       observation.acquisition_root,
       observation.observed_at,
       observation.native_revision,
       observation.snapshot_root,
       observation.snapshot_state,
       observation.projected_record_count,
       observation.projected_records_root,
       observation.coverage AS observation_coverage,
       observation.omissions,
       release_source.native_record_count,
       CASE
         WHEN $3::text IS NULL THEN release_source.repository_binding_count
         ELSE (
           SELECT count(*)::bigint
           FROM projection.repository_source_bindings binding
           WHERE binding.release_root = release_source.release_root
             AND binding.source_id = release_source.source_id
             AND binding.repository_id = $3
         )
       END AS repository_binding_count
     FROM projection.release_sources release_source
     JOIN projection.source_declarations declaration
       USING (declaration_root, source_id)
     JOIN projection.source_observations observation
       USING (observation_root, source_id)
     WHERE release_source.release_root = $1
       AND ($2::text IS NULL OR release_source.source_id = $2)
     ORDER BY release_source.source_id`,
    [root, sourceId, repositorySlug],
  );

  const sources = sourceRows
    .map((row): ProjectedMathSource => {
      const declaration = mathSourceDeclarationSchema.parse({
        source_id: row.source_id,
        native_namespace: row.native_namespace,
        publisher_or_maintainer: row.publisher_or_maintainer,
        locators: row.locators,
        attributed_claims: row.attributed_claims,
        source_kind: row.source_kind,
        rights: row.rights,
        snapshot_policy: row.snapshot_policy,
        adapter: row.adapter,
        coverage: row.declaration_coverage,
        declaration_root: row.declaration_root,
      });
      const observation = mathSourceObservationSchema.parse({
        schema: "vela.math-source-observation.v1",
        source_id: row.source_id,
        observation_id: row.observation_id,
        declaration_root: row.declaration_root,
        acquisition_root: row.acquisition_root,
        observed_at: String(row.observed_at),
        native_revision: row.native_revision,
        snapshot_root: row.snapshot_root,
        snapshot_state: row.snapshot_state,
        projected_record_count: projectedCount(
          row.projected_record_count,
          "observation record count",
        ),
        projected_records_root: row.projected_records_root,
        coverage: row.observation_coverage,
        omissions: row.omissions,
        observation_root: row.observation_root,
      });
      return {
        declaration,
        declaration_row_root: hashRootSchema.parse(row.declaration_row_root),
        observation: bindMathSourceObservationToDeclaration(
          observation,
          declaration,
        ),
        native_record_count: projectedCount(
          row.native_record_count,
          "native-record count",
        ),
        repository_binding_count: projectedCount(
          row.repository_binding_count,
          "Repository-binding count",
        ),
      };
    })
    .filter(({ declaration }) => (
      repositorySlug === null || declaration.coverage.repository_slugs.includes(
        repositorySlug as MathSourceDeclaration["coverage"]["repository_slugs"][number],
      )
    ));

  if (!input.includeRecords) {
    return {
      schema: "vela.math-source-registry-read.v1",
      release_root: root,
      source_registry: manifest.source_registry,
      sources,
      native_records: [],
      repository_bindings: [],
      next_cursor: null,
      next_binding_cursor: null,
    };
  }

  const nativeCursor = decodeMathSourceRegistryCursor(
    input.cursor,
    "native",
    4,
  );
  const bindingCursor = decodeMathSourceRegistryCursor(
    input.bindingCursor,
    "binding",
    4,
  );
  const [nativeRows, bindingRows] = await Promise.all([
    sql.query(
      `SELECT native_record.*
       FROM projection.release_sources release_source
       JOIN projection.native_records native_record
         USING (observation_root, source_id)
       WHERE release_source.release_root = $1
         AND ($2::text IS NULL OR native_record.source_id = $2)
         AND ($3::text IS NULL OR native_record.native_id = $3)
         AND (
           $4::text IS NULL
           OR native_record.native_id = $4
           OR native_record.search_document @@ websearch_to_tsquery('simple', $4)
         )
         AND ($5::text IS NULL OR native_record.native_kind = $5)
         AND (
           $6::text IS NULL
           OR EXISTS (
             SELECT 1
             FROM projection.repository_source_bindings binding
             WHERE binding.release_root = release_source.release_root
               AND binding.source_id = native_record.source_id
               AND binding.observation_root = native_record.observation_root
               AND binding.native_id = native_record.native_id
               AND binding.repository_id = $6
           )
         )
         AND (
           $7::text IS NULL
           OR (
             native_record.source_id,
             native_record.observation_root,
             native_record.native_kind,
             native_record.native_id
           ) > ($8::text, $9::text, $10::text, $11::text)
         )
       ORDER BY
         native_record.source_id,
         native_record.observation_root,
         native_record.native_kind,
         native_record.native_id
       LIMIT $12`,
      [
        root,
        recordSourceId,
        nativeId,
        query,
        nativeKind,
        repositorySlug,
        input.cursor ?? null,
        ...(nativeCursor ?? ["", "", "", ""]),
        limit + 1,
      ],
    ),
    sql.query(
      `SELECT *
       FROM projection.repository_source_bindings
       WHERE release_root = $1
         AND ($2::text IS NULL OR source_id = $2)
         AND ($3::text IS NULL OR repository_id = $3)
         AND (
           $4::text IS NULL
           OR native_id = $4
         )
         AND (
           ($5::text IS NULL AND $6::text IS NULL)
           OR EXISTS (
             SELECT 1
             FROM projection.native_records native_record
             WHERE native_record.source_id = repository_source_bindings.source_id
               AND native_record.observation_root = repository_source_bindings.observation_root
               AND native_record.native_id = repository_source_bindings.native_id
               AND (
                 $5::text IS NULL
                 OR native_record.native_id = $5
                 OR native_record.search_document @@ websearch_to_tsquery('simple', $5)
               )
               AND ($6::text IS NULL OR native_record.native_kind = $6)
           )
         )
         AND (
           $7::text IS NULL
           OR (
             repository_id,
             source_id,
             observation_root,
             binding_id
           ) > ($8::text, $9::text, $10::text, $11::text)
         )
       ORDER BY repository_id, source_id, observation_root, binding_id
       LIMIT $12`,
      [
        root,
        recordSourceId,
        repositorySlug,
        nativeId,
        query,
        nativeKind,
        input.bindingCursor ?? null,
        ...(bindingCursor ?? ["", "", "", ""]),
        limit + 1,
      ],
    ),
  ]);

  const nativePage = nativeRows.slice(0, limit);
  const bindingPage = bindingRows.slice(0, limit);
  const lastNative = nativePage.at(-1);
  const lastBinding = bindingPage.at(-1);
  return {
    schema: "vela.math-source-registry-read.v1",
    release_root: root,
    source_registry: manifest.source_registry,
    sources,
    native_records: nativePage.map((row) => nativeSourceRecordFromRow(row)),
    repository_bindings: bindingPage.map((row) => repositorySourceBindingSchema.parse({
      schema: "vela.repository-source-binding.v1",
      release_root: root,
      repository_id: row.repository_id,
      binding_id: row.binding_id,
      source_id: row.source_id,
      observation_root: row.observation_root,
      native_id: row.native_id,
      native_record_root: row.native_record_root,
      binding_kind: row.binding_kind,
      repository_object_kind: row.repository_object_kind,
      repository_object_id: row.repository_object_id,
      repository_object_root: row.repository_object_root,
      local_standing_effect: row.local_standing_effect,
      binding_root: row.binding_root,
    })),
    next_cursor: nativeRows.length > limit && lastNative
      ? encodeMathSourceRegistryCursor("native", [
          String(lastNative.source_id),
          String(lastNative.observation_root),
          String(lastNative.native_kind),
          String(lastNative.native_id),
        ])
      : null,
    next_binding_cursor: bindingRows.length > limit && lastBinding
      ? encodeMathSourceRegistryCursor("binding", [
          String(lastBinding.repository_id),
          String(lastBinding.source_id),
          String(lastBinding.observation_root),
          String(lastBinding.binding_id),
        ])
      : null,
  };
}

/**
 * Reads one complete, immutable source inventory and the explicitly configured
 * source-authored facet for each profiled corpus. The SQL selects only the
 * configured metadata value, not retained statements or other source bytes.
 * Every profile is bounded and the pure summary refuses rather than clips.
 */
export async function sourceCorpusMapRead(input: {
  root?: string;
} = {}): Promise<SourceCorpusMapRead> {
  assertSourceCorpusProfileBounds(sourceCorpusProfilesConfig);
  const registry = await mathSourceRegistryRead({ root: input.root });
  const inventoryBySource = new Map(
    registry.sources.map((source) => [source.declaration.source_id, source]),
  );
  for (const profile of sourceCorpusProfilesConfig.profiles) {
    if (!inventoryBySource.has(profile.source_id)) {
      throw new Error(`Source corpus profile names unknown Source ${profile.source_id}`);
    }
  }

  const sql = neon(projectionDatabaseUrl());
  const profiledReads = await Promise.all(sourceCorpusProfilesConfig.profiles.map(async (profile) => {
    const rows = await sql.query(
      `SELECT native_record.metadata -> $4::text AS facet_value
       FROM projection.release_sources release_source
       JOIN projection.native_records native_record
         USING (observation_root, source_id)
       WHERE release_source.release_root = $1
         AND native_record.source_id = $2
         AND native_record.native_kind = $3
       ORDER BY native_record.native_id, native_record.row_root
       LIMIT $5`,
      [
        registry.release_root,
        profile.source_id,
        profile.native_kind,
        profile.facet.key,
        MAX_SOURCE_CORPUS_RECORDS_PER_PROFILE + 1,
      ],
    );
    if (rows.length > MAX_SOURCE_CORPUS_RECORDS_PER_PROFILE) {
      throw new Error(`${profile.source_id}/${profile.native_kind} exceeds the reviewed ${MAX_SOURCE_CORPUS_RECORDS_PER_PROFILE}-record profile bound`);
    }
    return {
      source_id: profile.source_id,
      native_kind: profile.native_kind,
      facet_values: rows.map(({ facet_value }) => facet_value),
    };
  }));

  return summarizeSourceCorpusMap({
    release_root: registry.release_root,
    source_registry: registry.source_registry,
    sources: registry.sources.map((source) => {
      if (!source.observation) {
        throw new Error(`Source corpus inventory is missing observation ${source.declaration.source_id}`);
      }
      return {
        source_id: source.declaration.source_id,
        source_kind: source.declaration.source_kind,
        declaration_root: hashRootSchema.parse(source.declaration.declaration_root),
        observation_root: hashRootSchema.parse(source.observation.observation_root),
        coverage_status: source.observation.coverage.status,
        native_record_count: source.native_record_count,
        repository_binding_count: source.repository_binding_count,
      };
    }),
    profiles: profiledReads,
  });
}

/** Exact identity lookup for one source-native record in one immutable release.
 * This does not traverse Repository bindings: an occurrence stays addressable
 * even when it has no Claim and therefore no local Standing. */
export async function nativeSourceRecordByIdentity(input: {
  root?: string;
  sourceId: string;
  nativeId: string;
  nativeKind?: string;
}): Promise<NativeSourceRecord | null> {
  const manifest = input.root
    ? await projectionManifestAtRoot(input.root)
    : await projectionManifest();
  const rows = await neon(projectionDatabaseUrl()).query(
    `SELECT native_record.*
     FROM projection.release_sources release_source
     JOIN projection.native_records native_record
       USING (observation_root, source_id)
     WHERE release_source.release_root = $1
       AND native_record.source_id = $2
       AND native_record.native_id = $3
       AND ($4::text IS NULL OR native_record.native_kind = $4)
     ORDER BY native_record.native_kind, native_record.row_root
     LIMIT 2`,
    [manifest.release_root, input.sourceId, input.nativeId, input.nativeKind?.trim() || null],
  );
  if (rows.length > 1) {
    throw new Error(`source-native identity ${input.sourceId}/${input.nativeId} is ambiguous in ${manifest.release_root}`);
  }
  return rows[0] ? nativeSourceRecordFromRow(rows[0]) : null;
}

export type ProblemSourceCoverage = {
  source_id: string;
  resolution_namespace: string;
  label: string;
  source_role: ProblemResolutionCandidateSource["source_role"];
  source_occurrences: number;
  reviewed_occurrences: number;
  statement_occurrences: number;
};

export type ProblemSourceReadResult = ProblemSourceResolution & {
  schema: "vela.problem-source-read.v1";
  release_root: HashRoot;
  canonical_record: NativeSourceRecord;
  resolution_namespace: string;
  problem_number: number;
  coverage: ProblemSourceCoverage[];
  candidate_limit: number;
};

/**
 * Bounded Problem source read around one exact source occurrence. Matching source
 * numbers are candidate navigation only. The pure resolver below is the sole
 * place reviewed occurrence relations enter, and it never emits Standing.
 */
export async function nativeProblemSourceRead(input: {
  root?: string;
  sourceId: string;
  nativeId: string;
  nativeKind?: string;
  candidateLimit?: number;
}): Promise<ProblemSourceReadResult | null> {
  const manifest = input.root
    ? await projectionManifestAtRoot(input.root)
    : await projectionManifest();
  const canonical = await nativeSourceRecordByIdentity({
    root: manifest.release_root,
    sourceId: input.sourceId,
    nativeId: input.nativeId,
    nativeKind: input.nativeKind,
  });
  if (!canonical) return null;
  const resolutionIdentity = candidateProblemIdentity(canonical);
  if (resolutionIdentity === null) {
    throw new Error(`source-native identity ${canonical.source_id}/${canonical.native_id} is not eligible for Problem source resolution`);
  }
  const problemNumber = resolutionIdentity.problem_number;
  const limit = Math.min(Math.max(input.candidateLimit ?? 250, 1), 250);
  const namespaceSources = problemResolutionSourcesForNamespace(resolutionIdentity.resolution_namespace);
  const metadataProfiles = namespaceSources
    .filter(({ number_extraction }) => number_extraction.kind === "metadata_integer")
    .flatMap(({ source_id, native_kinds }) => native_kinds.map((nativeKind) => `${source_id}|${nativeKind}`));
  const formalProfiles = namespaceSources
    .filter(({ number_extraction }) => number_extraction.kind === "erdos_formal_native_id")
    .flatMap(({ source_id, native_kinds }) => native_kinds.map((nativeKind) => `${source_id}|${nativeKind}`));
  /* The current bounded resolver uses one exact metadata field for numeric
     sources. Refuse a future config that changes the model instead of silently
     applying `problem_number` to a new Source contract. */
  const metadataKeys = new Set(namespaceSources.flatMap(({ number_extraction }) => (
    number_extraction.kind === "metadata_integer" ? [number_extraction.key] : []
  )));
  if (metadataKeys.size !== 1 || !metadataKeys.has("problem_number")) {
    throw new Error("Problem resolver metadata extraction is not supported by the bounded SQL reader");
  }
  const rows = await neon(projectionDatabaseUrl()).query(
    `SELECT native_record.*
     FROM projection.release_sources release_source
     JOIN projection.native_records native_record
       USING (observation_root, source_id)
     WHERE release_source.release_root = $1
       AND (
         ((native_record.source_id || '|' || native_record.native_kind) = ANY($2::text[])
           AND native_record.metadata ->> 'problem_number' = $4)
         OR
         ((native_record.source_id || '|' || native_record.native_kind) = ANY($3::text[])
           AND substring(native_record.native_id from '^Erdos([1-9][0-9]*)(?:\\.|$)') = $4)
       )
     ORDER BY native_record.source_id, native_record.native_kind, native_record.native_id
     LIMIT $5`,
    [manifest.release_root, metadataProfiles, formalProfiles, String(problemNumber), limit + 1],
  );
  if (rows.length > limit) {
    throw new Error(`Problem ${resolutionIdentity.resolution_namespace}/${problemNumber} source candidates exceed the bounded limit of ${limit}`);
  }
  const resolution = resolveProblemSources(canonical, rows.map((row) => nativeSourceRecordFromRow(row)));
  if (resolution.resolver_root !== problemResolutionConfigRoot) {
    throw new Error("Problem source resolver root drifted during the read");
  }
  const reviewedOccurrenceKeys = new Set(resolution.relations.map(({ occurrence_key }) => occurrence_key));
  if (resolution.entity) {
    const canonical = resolution.occurrences.find((occurrence) => (
      occurrence.source_id === resolution.entity!.canonical_occurrence.source_id
      && occurrence.native_kind === resolution.entity!.canonical_occurrence.native_kind
      && occurrence.native_id === resolution.entity!.canonical_occurrence.native_id
    ));
    if (canonical) reviewedOccurrenceKeys.add(canonical.occurrence_key);
  }
  const coverage = namespaceSources.map((source): ProblemSourceCoverage => {
    const occurrences = resolution.occurrences.filter(({ source_id }) => source_id === source.source_id);
    return {
      source_id: source.source_id,
      resolution_namespace: source.resolution_namespace,
      label: source.label,
      source_role: source.source_role,
      source_occurrences: occurrences.length,
      reviewed_occurrences: occurrences.filter(({ occurrence_key }) => reviewedOccurrenceKeys.has(occurrence_key)).length,
      statement_occurrences: resolution.statements.filter(({ source_id }) => source_id === source.source_id).length,
    };
  });
  return {
    schema: "vela.problem-source-read.v1",
    release_root: manifest.release_root,
    resolver_root: resolution.resolver_root,
    semantics: resolution.semantics,
    canonical_record: canonical,
    resolution_namespace: resolutionIdentity.resolution_namespace,
    problem_number: problemNumber,
    entity: resolution.entity,
    occurrences: resolution.occurrences,
    statements: resolution.statements,
    relations: resolution.relations,
    identity_events: resolution.identity_events,
    coverage,
    candidate_limit: limit,
  };
}

/**
 * Reads every exact reviewed Problem entity in the resolver against one
 * immutable release. Each bounded child read refuses truncation; the summary
 * refuses missing or drifted entities and carries no scientific authority.
 */
export async function reviewedProblemSourceCoverageRead(input: {
  root?: string;
  candidateLimit?: number;
} = {}): Promise<ProblemSourceCoverageSummary> {
  assertProblemSourceCoverageBounds(problemResolutionConfig);
  const manifest = input.root
    ? await projectionManifestAtRoot(input.root)
    : await projectionManifest();
  const reads = await Promise.all(problemResolutionConfig.entities.map((entity) => nativeProblemSourceRead({
    root: manifest.release_root,
    sourceId: entity.canonical_occurrence.source_id,
    nativeId: entity.canonical_occurrence.native_id,
    nativeKind: entity.canonical_occurrence.native_kind,
    candidateLimit: input.candidateLimit,
  })));
  return summarizeReviewedProblemSourceCoverage(reads.map((read) => {
    if (!read) throw new Error("Problem source coverage is missing an exact reviewed canonical occurrence");
    return read;
  }));
}

export interface RepositoryObjectSourceRecord {
  record: NativeSourceRecord;
  binding: RepositorySourceBinding;
}

/**
 * Reads the source-native record bound to one Repository object.
 *
 * This reader is only for source records that have an explicit binding to a
 * Repository object such as a Claim. Source-native Problems deliberately have
 * no `problem` binding and must use `nativeSourceRecordByIdentity`; callers may
 * not infer a binding or graph node merely because a native occurrence exists.
 */
export async function repositoryObjectSourceRecord(input: {
  root?: string;
  repositorySlug: string;
  objectKind: string;
  objectId: string;
}): Promise<RepositoryObjectSourceRecord | null> {
  const manifest = input.root
    ? await projectionManifestAtRoot(input.root)
    : await projectionManifest();
  const sql = neon(projectionDatabaseUrl());
  const rows = await sql.query(
    `SELECT
       binding.*,
       native_record.native_kind,
       native_record.native_revision,
       native_record.title,
       native_record.summary,
       native_record.locators,
       native_record.metadata,
       native_record.metadata_root,
       native_record.content_root,
       native_record.availability,
       native_record.row_root AS native_row_root
     FROM projection.repository_source_bindings binding
     JOIN projection.native_records native_record
       ON native_record.observation_root = binding.observation_root
      AND native_record.source_id = binding.source_id
      AND native_record.native_id = binding.native_id
     WHERE binding.release_root = $1
       AND binding.repository_id = $2
       AND binding.repository_object_kind = $3
       AND binding.repository_object_id = $4
     ORDER BY binding.binding_id
     LIMIT 1`,
    [manifest.release_root, input.repositorySlug, input.objectKind, input.objectId],
  );
  const row = rows.at(0);
  if (!row) return null;
  return {
    record: nativeSourceRecordFromRow(row, "native_row_root"),
    binding: repositorySourceBindingSchema.parse({
      schema: "vela.repository-source-binding.v1",
      release_root: manifest.release_root,
      repository_id: row.repository_id,
      binding_id: row.binding_id,
      source_id: row.source_id,
      observation_root: row.observation_root,
      native_id: row.native_id,
      native_record_root: row.native_record_root,
      binding_kind: row.binding_kind,
      repository_object_kind: row.repository_object_kind,
      repository_object_id: row.repository_object_id,
      repository_object_root: row.repository_object_root,
      local_standing_effect: row.local_standing_effect,
      binding_root: row.binding_root,
    }),
  };
}

/* The retention window is one rule, so it is written once. This carried its own
   copy of `assertReadableRelease`'s query — the same CTE, the same LIMIT 3, the
   same manifest-schema filter — and its own copy of the refusal string, which
   is how the two drifted into reporting the same four facts as two. It pays one
   extra round trip and asks the gate everything else asks. */
export async function projectionManifestAtRoot(
  requestedRoot: string,
): Promise<ProjectionManifest> {
  const root = await assertReadableRelease(requestedRoot);
  const sql = neon(projectionDatabaseUrl());
  const rows = await sql.query(
    "SELECT release.manifest FROM projection.releases release WHERE release.release_root = $1 LIMIT 1",
    [root],
  ) as ReleaseRow[];
  const manifest = rows[0]?.manifest;
  if (!manifest) throw new ProjectionReadError("unknown_root", "no projection carries this root");
  return normalizeProjectionManifest(manifest);
}

function repositoryFromRows(
  row: any,
  reviewRows: any[],
  submissionRows: any[],
  verificationRows: any[],
): SiteRepository {
  const slug = slugForRepositoryId(row.repository_id) ?? row.repository_id;
  const declared = repositoryRegistry.repositories.find((entry) => entry.slug === slug);
  /* An unknown projected Repository cannot safely inherit a public-access
     assumption. It remains renderable for diagnosis, but its source is private
     and its acquisition command is withheld until the registry declares it. */
  const access = declared?.access ?? "private";
  return {
    slug,
    source: { remote: row.source_remote, access, commit: row.source_commit, tree: row.source_tree, committed_at: instant(row.committed_at) ?? "" },
    published_snapshot_at: instant(row.committed_at) ?? "",
    status: compactStatusSchema.parse(row.status),
    graph: row.graph_source_root ? {
      schema: "site.repository-graph-projection.v2", source_path: ".vela/repository.json + canonical records",
      source_sha256: row.graph_source_root,
      source_repository_root: row.repository_root,
      layout_root: row.graph_layout_root, node_count: row.graph_node_count,
      edge_count: row.graph_edge_count, problem_count: row.problem_count,
      claim_count: row.graph_claim_count,
    } : null,
    reviews: reviewRows
      .filter((review) => review.repository_id === row.repository_id)
      .map((review) => reviewFromRow(
        review,
        submissionRows.find((submission) => (
          submission.repository_id === row.repository_id && submission.proposal_id === review.proposal_id
        )),
        verificationRows.filter((verification) => (
          verification.repository_id === row.repository_id && verification.proposal_id === review.proposal_id
        )),
      )),
    claims: [],
    reproduce: {
      ...row.reproduce,
      clone: declared
        ? repositoryCheckoutCommand(declared)
        : "Source checkout requires an operator-provided authenticated locator.",
    },
  } as SiteRepository;
}

/* The tables one Repository is assembled from, in the order `repositoryFromRows`
   takes them. Every one of them keys on `repository_id`, including the repository
   row — which used to be the single exception, and the only reason the scoped
   and unscoped reads ever looked like two functions. */
const REPOSITORY_SOURCES = [
  { select: "*", from: "projection.repositories", order: "", one: true },
  { select: "*", from: "projection.reviews", order: "COALESCE(reviewed_at, created_at) DESC", one: false },
  { select: "*", from: "projection.submissions", order: "proposal_id", one: false },
  { select: "*", from: "projection.verifications", order: "proposal_id, completed_at", one: false },
] as const;

/* One derivation, read either over the release or over one slug.

   `repositoryFromRows` already re-filters every auxiliary set by repository,
   so the slug predicate here is a pushdown for cost, not for meaning — which is
   why the tempting collapse (`allRepositories().find(...)`) is wrong: it is
   semantically identical and would turn every `[slug]` route into a whole-
   release read of reviews, submissions and verifications, with a linear scan
   per review inside the mapper.

   `repository_id` leads the unscoped sort and is dropped only where the scoped
   predicate already fixes it. `repositoryFromRows` preserves query order for
   reviews and the proposal ledger renders in that order, so an interleaved
   global ordering would silently reorder a visible ledger with nothing in the
   type system or the suite to catch it. */
async function readRepositoryRows(slug?: string, requestedRoot?: string): Promise<any[][]> {
  const sql = neon(projectionDatabaseUrl());
  const root = requestedRoot
    ? (await projectionManifestAtRoot(requestedRoot)).release_root
    : await boundReleaseRoot();
  const scoped = slug !== undefined;
  const scope = scoped ? [root, repositoryKey(slug!)] : [root];
  return Promise.all(REPOSITORY_SOURCES.map((source) => {
    const order = [scoped ? "" : "repository_id", source.order].filter(Boolean).join(", ");
    return sql.query(
      `SELECT ${source.select} FROM ${source.from}
       WHERE release_root = $1${scoped ? " AND repository_id = $2" : ""}
       ${order ? `ORDER BY ${order}` : ""}${source.one && scoped ? " LIMIT 1" : ""}`,
      scope,
    );
  }));
}

export async function allRepositories(root?: string): Promise<SiteRepository[]> {
  const [repositoryRows, reviews, submissions, verifications] = await readRepositoryRows(undefined, root);
  return repositoryRows.map((row) => repositoryFromRows(row, reviews, submissions, verifications));
}

export async function repositoryBySlug(slug: string, root?: string): Promise<SiteRepository | undefined> {
  const [repositoryRows, reviews, submissions, verifications] = await readRepositoryRows(slug, root);
  return repositoryRows[0]
    ? repositoryFromRows(repositoryRows[0], reviews, submissions, verifications)
    : undefined;
}
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/* The Submission row keeps its actor and timestamp as columns and everything
   the producer declared inside `record`. Nothing here is derived: each field is
   the retained value or null. */
function producerPackageFromRow(submission: any): ReviewSummary["producer_package"] {
  if (!submission) return null;
  const record = (submission.record ?? {}) as Record<string, any>;
  return {
    producer_actor: submission.producer_actor ?? null,
    submitted_at: instant(submission.submitted_at),
    verification_requirements: stringList(record.verification_requirements),
    artifacts: Array.isArray(record.artifacts)
      ? record.artifacts.map((artifact: any) => ({ kind: String(artifact.kind), digest: artifact.digest }))
      : [],
    caveats: stringList(record.caveats),
    replayability: record.replayability ?? null,
    requested_change_kind: record.requested_change?.kind ?? null,
  };
}

/* Exported so the mapping from a projection row to a Proposal can be asserted
   without a database. */
export function reviewFromRow(row: any, submission?: any, verifications: any[] = []): ReviewSummary {
  return { proposal_id: row.proposal_id, status: row.status, kind: row.kind, target: row.target,
    claim: row.claim, content_root: row.content_root, receipt_root: row.receipt_root,
    created_at: instant(row.created_at), reviewed_at: instant(row.reviewed_at),
    reviewed_by: row.reviewed_by, decision_event_id: row.decision_event_id,
    decision_actor_class: row.decision_actor_class,
    decision_session_ref: row.decision_session_ref,
    decision_authority_principal_id: row.decision_authority_principal_id,
    decision_plan_root: row.decision_plan_root, decision_provenance: row.decision_provenance,
    applied_event_id: row.applied_event_id, decision_reason: row.decision_reason,
    producer_package_kind: submission ? "submission_v1" : row.receipt_root ? "receipt_v1" : "unrecorded",
    producer_package_id: submission?.submission_id ?? null,
    producer_package_root: submission?.submission_root ?? row.receipt_root,
    producer_package: producerPackageFromRow(submission),
    claim_retirement: row.claim_retirement ?? null,
    retired_by_claim_id: row.retired_by_claim_id ?? null,
    verification_status: verificationCore({ verification_records: verifications }),
    verification_record_count: verifications.length,
    verification_records: verifications.map((verification) => {
      const record = (verification.record ?? {}) as Record<string, any>;
      return {
        verification_record_id: verification.verification_record_id,
        verification_root: verification.verification_root,
        outcome: verification.outcome,
        verifier_actor: verification.verifier_actor,
        /* `started_at` is retained only inside the record; the row keeps the
           completion column alone. */
        started_at: record.started_at ? String(record.started_at) : null,
        completed_at: instant(verification.completed_at),
        /* From the columns, with the record as the fallback. The columns exist
           so a surface can count what a jsonb blob cannot be asked — and a
           column nothing reads is a column nothing holds to the builder, so
           reading them here is also what would surface a builder that stopped
           filling them. The fallback is not decoration: rows written before
           `assurance_vector.sql` carry NULL in both, and their scope is still
           in the record. */
        property: verification.property ?? record.scope?.property ?? null,
        does_not_establish: stringList(
          verification.does_not_establish ?? record.scope?.does_not_establish,
        ),
        verifier_profile: record.method?.profile ?? null,
        independent_of: stringList(record.independence?.declared_independent_of),
        /* The declaration has two halves and only one was read, so a record
           stating "independent of nobody, and here is what it shares with the
           producer" reached the reader as "no independence declared" — the
           product asserting the opposite of the record it cites. The payload
           is already decoded above; nothing else is needed to carry it. */
        shared_dependencies: stringList(record.independence?.shared_dependencies),
        reviewer_kind: verification.reviewer_kind ?? null,
        reviewer_display_name: verification.reviewer_display_name ?? null,
        reviewer_identifier: verification.reviewer_identifier ?? null,
        reviewer_provider: verification.reviewer_provider ?? null,
        reviewer_version: verification.reviewer_version ?? null,
        review_method_root: verification.review_method_root ?? null,
      };
    }),
    decision_packet: row.decision_packet ?? null,
    proposed_state_preview: row.proposed_state_preview
      ? verifyProposedStatePreview(row.proposed_state_preview)
      : null,
  } as ReviewSummary;
}
/* `reviews` carries both `target` and `claim`; only `target` holds a Claim
   identifier, and `buildClaimStandingView` above is the authority for that
   choice. Every query that reads a Claim row selects this so `has_proposal` is
   a retained fact rather than a restatement of standing.

   A `reviews` row is a Proposal, so this predicate is true for a Proposal still
   at `pending_review` with no Decision anywhere. It was named for the Decision
   axis, which is the collapse PROTOCOL.md exists to prevent: only the Decision
   admits an Event, and existence of a candidate transition is not one. The
   predicate was right; three identifiers over it were not. */
const CLAIM_PROPOSAL_SQL = `EXISTS (SELECT 1 FROM projection.reviews r
    WHERE r.release_root = f.release_root AND r.repository_id = f.repository_id
      AND r.target = f.claim_id)`;

/* Exported so the mapping from a projection row to a Claim can be asserted
   without a database. */
export function claimFromRow(row: any, options: { includeRecord?: boolean } = {}): ClaimSummary {
  const record = (row.record ?? {}) as Record<string, unknown>;
  return { id: row.claim_id, root: row.claim_root, standing: row.standing,
    assertion: row.assertion, assertion_type: row.assertion_kind,
    conditions: Array.isArray(row.conditions) ? row.conditions.map(String) : [],
    created: instant(row.created_at),
    source_title: row.source_title,
    source_type: row.source_type,
    source_path: row.source_path ?? null,
    /* Was `standing === "accepted"`, which drew a passing Verification on every
       accepted Claim in the release. Standing, Proposal and Verification are
       separate axes, so this reads the retained Proposal and nothing else; a
       row selected without the column carries none. */
    has_proposal: row.proposal_recorded === true,
    contested: row.contested,
    retracted: row.retracted, evidence_count: row.evidence_count,
    revision: typeof record.revision === "number" ? record.revision : null,
    relation_count: Array.isArray(record.relations) ? record.relations.length : 0,
    ...(options.includeRecord ? { record: row.record ?? null } : {}) };
}

export type ClaimFacetName = "standing" | "assertion_kind" | "source_type" | "disposition";

export interface ClaimFacetValue {
  value: string;
  count: number;
}

export type ClaimFacets = Record<ClaimFacetName, ClaimFacetValue[]>;

/* The strata a Claim passes through, counted over the active filter set.
   `with_proposal` is keyed on `reviews.target`, so it counts Claims carrying a
   retained Proposal rather than Claims carrying a Decision — the two axes are
   separate and the name has to say which one this is. (`reviews.claim` holds
   the assertion text; counting it returns zero on every repository here.) */
export interface ClaimLadder {
  claims: number;
  with_evidence: number;
  with_proposal: number;
}

/* How many values each sort key actually takes over the active filter set. A
   sort over a column that holds one value cannot reorder anything, and the
   ledger uses these to decide whether the control is worth drawing. */
export interface ClaimSortVariance {
  created: number;
  evidence_count: number;
}

export interface ClaimLedgerFilter {
  q?: string;
  standing?: string;
  assertionKind?: string;
  sourceType?: string;
  disposition?: string;
  sort?: "recent" | "identifier" | "evidence";
  limit?: number;
  offset?: number;
}

/* `disposition` is not a column: it is the three-way read of the two booleans
   the projection carries, surfaced as one facet because a reader asks "is this
   contested" and not "which boolean is set". */
const DISPOSITION_SQL = `CASE WHEN f.retracted THEN 'retracted' WHEN f.contested THEN 'contested' ELSE 'standing' END`;

export async function claimsForRepository(slug: string, input: ClaimLedgerFilter = {}) {
  const sql = neon(projectionDatabaseUrl());
  const root = await boundReleaseRoot();
  const q = input.q?.trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 250);
  const offset = Math.max(input.offset ?? 0, 0);
  const standing = input.standing ?? "";
  const assertionKind = input.assertionKind ?? "";
  const sourceType = input.sourceType ?? "";
  const disposition = input.disposition ?? "";

  /* Ordering by claim_id orders by a hash prefix, which is ordering by noise
     across 56 pages. Default to most recently recorded, with the identifier
     kept as an explicit choice for anyone reconciling against a checkout. */
  const order = input.sort === "identifier"
    ? "f.claim_id ASC"
    : input.sort === "evidence"
      ? "f.evidence_count DESC, f.created_at DESC NULLS LAST, f.claim_id ASC"
      /* 2,674 erdos Claims share one recorded date, so the date alone hands the
         page back to the hash order this sort exists to avoid. Evidence breaks
         the tie with the one thing a reader on a tied page can act on. */
      : "f.created_at DESC NULLS LAST, f.evidence_count DESC, f.claim_id ASC";

  /* Every term stays in every query; a facet drops its own term by passing an
     empty string for that parameter, which the `$n = ''` guard already treats
     as "unfiltered". So the SQL is one constant string and only the arguments
     change — no clause is ever assembled or spliced at runtime. */
  const WHERE = `f.release_root = $1 AND f.repository_id = $2
      AND ($3 = '' OR f.claim_id ILIKE '%' || $3 || '%' OR f.imported_object_id ILIKE '%' || $3 || '%' OR f.assertion ILIKE '%' || $3 || '%' OR f.source_title ILIKE '%' || $3 || '%')
      AND ($4 = '' OR f.standing = $4)
      AND ($5 = '' OR f.assertion_kind = $5)
      AND ($6 = '' OR coalesce(f.source_type, '') = $6)
      AND ($7 = '' OR ${DISPOSITION_SQL} = $7)`;
  const scope = [root, repositoryKey(slug), q, standing, assertionKind, sourceType, disposition];

  /* Counts are computed over the active filter set minus the facet's own term,
     so selecting one value does not zero out its siblings. */
  const withoutOwnTerm = (index: number) => scope.map((value, position) => (position === index ? "" : value));
  const facetQuery = (column: string, ownTerm: number) => sql.query(
    `SELECT ${column} AS value, count(*)::integer AS count
     FROM projection.claims f WHERE ${WHERE}
     GROUP BY 1 ORDER BY count DESC, 1 ASC LIMIT 30`,
    withoutOwnTerm(ownTerm),
  );

  /* The ladder's four strata and the sort keys' distinct counts are one pass
     over the same rows the facets already scan, so they ride here rather than
     costing the page a second round trip. */
  const [rows, standingRows, kindRows, sourceRows, dispositionRows, shapeRows] = await Promise.all([
    sql.query(
      `SELECT f.*, ${CLAIM_PROPOSAL_SQL} AS proposal_recorded, count(*) OVER()::integer AS total
       FROM projection.claims f
       WHERE ${WHERE} ORDER BY ${order} LIMIT $8 OFFSET $9`,
      [...scope, limit, offset],
    ),
    facetQuery("f.standing", 3),
    facetQuery("f.assertion_kind", 4),
    facetQuery("coalesce(f.source_type, 'unrecorded')", 5),
    facetQuery(DISPOSITION_SQL, 6),
    sql.query(
      `SELECT count(*)::integer AS claims,
         count(*) FILTER (WHERE f.evidence_count > 0)::integer AS with_evidence,
         count(*) FILTER (WHERE ${CLAIM_PROPOSAL_SQL})::integer AS with_proposal,
         count(DISTINCT f.created_at)::integer AS distinct_created,
         count(DISTINCT f.evidence_count)::integer AS distinct_evidence
       FROM projection.claims f WHERE ${WHERE}`,
      scope,
    ),
  ]);

  const facet = (rows: Record<string, unknown>[]): ClaimFacetValue[] => rows
    .filter((row) => typeof row.value === "string" && row.value.length)
    .map((row) => ({ value: String(row.value), count: Number(row.count) }));

  const shape = shapeRows[0] ?? {};
  return {
    items: rows.map((row) => claimFromRow(row)),
    total: rows[0]?.total ?? 0,
    facets: {
      standing: facet(standingRows),
      assertion_kind: facet(kindRows),
      source_type: facet(sourceRows),
      disposition: facet(dispositionRows),
    } satisfies ClaimFacets,
    ladder: {
      claims: Number(shape.claims ?? 0),
      with_evidence: Number(shape.with_evidence ?? 0),
      with_proposal: Number(shape.with_proposal ?? 0),
    } satisfies ClaimLadder,
    variance: {
      created: Number(shape.distinct_created ?? 0),
      evidence_count: Number(shape.distinct_evidence ?? 0),
    } satisfies ClaimSortVariance,
  };
}

export async function claimRecordById(slug: string, id: string): Promise<ClaimSummary | undefined> {
  const sql = neon(projectionDatabaseUrl());
  const root = await boundReleaseRoot();
  const rows = await sql.query(`SELECT f.*, ${CLAIM_PROPOSAL_SQL} AS proposal_recorded
    FROM projection.claims f
    WHERE f.release_root = $1 AND f.repository_id = $2
      AND (f.claim_id = $3 OR f.imported_object_id = $3)
    LIMIT 1`, [root, repositoryKey(slug), id]);
  return rows[0] ? claimFromRow(rows[0], { includeRecord: true }) : undefined;
}

export async function objectContextById(slug: string, id: string): Promise<SiteObjectContext | undefined> {
  const sql = neon(projectionDatabaseUrl());
  const root = await boundReleaseRoot();
  const rows = await sql.query(`SELECT claim_id, imported_object_id
    FROM projection.claims
    WHERE release_root = $1 AND repository_id = $2
      AND (claim_id = $3 OR imported_object_id = $3)
    LIMIT 1`, [root, repositoryKey(slug), id]) as ObjectContextIdentityMapping[];
  const graphId = resolveObjectContextGraphId(id, rows[0]);
  try {
    const graph = await graphRead({ root, repository: slug, view: "node", lens: "all", node: graphId });
    return graph.object_context ?? undefined;
  } catch (error) {
    /* A Repository that has no graph node under this identifier has no object
       context to give, which is a `undefined` rather than a failure. This
       compared the thrown message character for character. */
    if (projectionRefusal(error) === "unknown_node") return undefined;
    throw error;
  }
}

export interface ProblemRecord {
  problem: string;
  node_id: string;
  /** Exact source that owns this projected native Problem row. */
  source_id: string;
  native_kind: string;
  /** Exact bytes of the source-native Problem occurrence. */
  content_root: HashRoot;
  /** Source-native metadata retained for explicit versioned discovery profiles. */
  metadata: Record<string, unknown>;
  /** Exact Repository-local Claim binding, absent for source-native Problems that have not entered local State. */
  claim_id: string | null;
  statement: string;
  declared_status: string;
  formalized: boolean;
  lean_url: string | null;
  prize: string | null;
  tags: string[];
  oeis: string[];
  source_ids: string[];
  source_count: number;
  /** Repository-local Claim standing, when this source Problem is bound to a Claim. */
  local_standing: string | null;
}

export interface ProblemClaimSourceBinding {
  binding_id: string;
  binding_root: HashRoot;
  row_root: HashRoot;
  source_id: string;
  observation_root: HashRoot;
  native_id: string;
  native_kind: string;
  native_record_root: HashRoot;
  content_root: HashRoot;
  binding_kind: RepositorySourceBinding["binding_kind"];
  local_standing_effect: RepositorySourceBinding["local_standing_effect"];
  relation_kind: ProblemRelationKind | null;
  translation_disposition: "unresolved";
  authority_effect: "none";
}

export type ProblemClaimSummary = ClaimSummary & {
  source_bindings: ProblemClaimSourceBinding[];
};

export function problemClaimsFromBindingRows(input: {
  rows: Array<Record<string, any>>;
  releaseRoot: HashRoot;
  repositoryId: string;
  problemLabel: string;
  occurrences: ReviewedProblemBindingOccurrence[];
}): { claims: ProblemClaimSummary[]; current_claim_id: string | null } {
  const occurrenceByKey = new Map(input.occurrences.map((occurrence) => [
    `${occurrence.source_id}\u0000${occurrence.native_kind}\u0000${occurrence.native_id}\u0000${occurrence.content_root}`,
    occurrence,
  ]));
  const claimsById = new Map<string, ProblemClaimSummary>();
  for (const row of input.rows) {
    const claimId = String(row.claim_id);
    let claim = claimsById.get(claimId);
    if (!claim) {
      claim = { ...claimFromRow(row, { includeRecord: true }), source_bindings: [] };
      claimsById.set(claimId, claim);
    }
    const binding = repositorySourceBindingSchema.parse({
      schema: "vela.repository-source-binding.v1",
      release_root: input.releaseRoot,
      repository_id: input.repositoryId,
      binding_id: row.binding_id,
      source_id: row.binding_source_id,
      observation_root: row.binding_observation_root,
      native_id: row.binding_native_id,
      native_record_root: row.binding_native_record_root,
      binding_kind: row.binding_kind,
      repository_object_kind: "claim",
      repository_object_id: claimId,
      repository_object_root: row.binding_repository_object_root,
      local_standing_effect: row.local_standing_effect,
      binding_root: row.binding_root,
    });
    if (row.binding_row_root !== binding.binding_root || claim.root !== binding.repository_object_root) {
      throw new Error(`${binding.binding_id}: Problem Claim Binding root drift`);
    }
    const occurrence = occurrenceByKey.get(`${binding.source_id}\u0000${row.binding_native_kind}\u0000${binding.native_id}\u0000${row.binding_content_root}`);
    if (!occurrence || binding.native_id === null || binding.native_record_root === null) {
      throw new Error(`${binding.binding_id}: Problem Claim Binding is not an exact reviewed occurrence`);
    }
    if (claim.source_bindings.some(({ binding_id }) => binding_id === binding.binding_id)) {
      throw new Error(`${binding.binding_id}: duplicate Problem Claim Binding`);
    }
    claim.source_bindings.push({
      binding_id: binding.binding_id,
      binding_root: hashRootSchema.parse(binding.binding_root),
      row_root: hashRootSchema.parse(row.binding_row_root),
      source_id: binding.source_id,
      observation_root: hashRootSchema.parse(binding.observation_root),
      native_id: binding.native_id,
      native_kind: String(row.binding_native_kind),
      native_record_root: hashRootSchema.parse(binding.native_record_root),
      content_root: hashRootSchema.parse(row.binding_content_root),
      binding_kind: binding.binding_kind,
      local_standing_effect: binding.local_standing_effect,
      relation_kind: occurrence.relation_kind,
      translation_disposition: "unresolved",
      authority_effect: "none",
    });
  }
  const claims = [...claimsById.values()];
  const currentClaims = claims.filter(({ standing }) => standing !== "superseded" && standing !== "retracted");
  if (currentClaims.length > 1) {
    throw new Error(`Problem ${input.problemLabel} resolves to multiple current Repository Claims`);
  }
  const currentClaimId = currentClaims[0]?.id ?? (claims.length === 1 ? claims[0]!.id : null);
  claims.sort((left, right) => (
    Number(right.id === currentClaimId) - Number(left.id === currentClaimId)
    || left.id.localeCompare(right.id)
  ));
  return { claims, current_claim_id: currentClaimId };
}

export type ProblemFacetName = "status" | "formalization" | "tag" | "source";

/* `parts` is a partition of `count`, carried where the facet has a second axis
   the rail draws inside the bar. The status facet is the only one that has one:
   how many problems of that status the source also declares formalized. */
export interface ProblemFacetValue {
  value: string;
  count: number;
  parts?: Array<{ label: string; count: number }>;
}

export type ProblemFacets = Record<ProblemFacetName, ProblemFacetValue[]>;

export interface ProblemLedgerFilter {
  root?: string;
  q?: string;
  status?: string;
  formalization?: string;
  tag?: string;
  source?: string;
  sort?: "number" | "sources";
  limit?: number;
  offset?: number;
  /**
   * Facets are a ledger concern, not a catalogue concern. Exact catalogue
   * assembly can opt out so paging through one immutable release does not
   * rerun four whole-corpus aggregations for every page.
   */
  includeFacets?: boolean;
}

export interface ProblemCatalogRead {
  items: ProblemRecord[];
  total: number;
}

/* Declared status, formalization, prize and subject tags are fields of the
   Source record, read from `metadata`. They used to be regex-extracted from a
   Claim's assertion string, which is why a Problem could not exist without a
   Claim: an open question the authority has ruled on in no way had to be stored
   as an accepted assertion in order to appear here, and 1,217 of them were. */

/* A leaf of one declared state, in every encoding a retained release carries.
 *
 * The flat `<field>_<leaf>` key is what the adapter emits today. The string
 * branch is not a legacy hedge: `scalar()` in `source-adapters/projection.ts`
 * replaces any non-scalar metadata value with `canonicalJson(value)`, so a
 * nested `status` object is retained as the *text* of its own JSON, and
 * `metadata -> 'status' ->> 'state'` returned NULL on all 1,217 problems — a
 * whole cohort reading as a value the source never recorded.
 *
 * Verified against the live projection on 2026-08-07, all three retained
 * releases: the current two carry `status_state` and the oldest carries
 * `status` as the string `{"last_update":…,"state":"open"}`.
 * `assertReadableRelease` serves any of the last three activated releases and
 * `prune-releases.mjs` keeps exactly three, so pruning cannot close this window
 * while three exist. The string branch goes when this query returns no rows:
 *
 *   SELECT count(*) FROM projection.native_records n
 *   JOIN projection.release_sources rs
 *     ON rs.observation_root = n.observation_root AND rs.source_id = n.source_id
 *   WHERE jsonb_typeof(n.metadata -> 'status') = 'string';
 *
 * The `object` branch has never matched anything — `scalar()` forbids it — and
 * stays only because dropping an arm of a CASE makes a miss read as absent
 * rather than as an error, and a Problem silently losing its declared status is
 * worse than one line of unreachable SQL. */
const declaredStateSql = (field: string, leaf: string) => `coalesce(
        n.metadata ->> '${field}_${leaf}',
        CASE jsonb_typeof(n.metadata -> '${field}')
          WHEN 'object' THEN n.metadata -> '${field}' ->> '${leaf}'
          WHEN 'string' THEN (n.metadata ->> '${field}')::jsonb ->> '${leaf}'
        END)`;

/* Upstream regenerates `status` from `informal_status` and `formal_status` on
   every push. Both are carried, and the derived value is preferred only when it
   is present, so a release that predates the split still reads. */
const PROBLEM_STATUS_SQL = `coalesce(
      ${declaredStateSql("status", "state")},
      ${declaredStateSql("informal_status", "state")})`;

const PROBLEM_FORMALIZED_SQL = `(${declaredStateSql("formalized", "state")} = 'yes')`;

/* Upstream maintains the formalization link on `formal_status`; it is not
   derived from the flag beside it, and at the pinned commit only five problems
   carry one where 604 are declared formalized. */
const PROBLEM_LEAN_URL_SQL = declaredStateSql("formal_status", "url");

/* Every problem declares the field and `no` is a declared absence, so it reads
   as NULL rather than as the word. */
const PROBLEM_PRIZE_SQL = `nullif(n.metadata ->> 'prize', 'no')`;

/* A JSON array under `key`, in every encoding a retained release carries.
 *
 * The comment here used to say the string encoding was transitional and would
 * go at the next refresh. It has it backwards: `scalar()` in
 * `source-adapters/projection.ts` canonical-JSONs every non-scalar on the way
 * in, so a tag list is stored as the string `["analysis"]` — which `->` returns
 * as a scalar and `jsonb_array_elements_text` refuses — and that is true of the
 * current release, checked on 2026-08-07. The `array` arm is the speculative
 * one, and it stays for the same reason as its counterpart above: a dropped arm
 * turns a miss into an empty tag list rather than an error.
 *
 * Absent reads as empty, which is what a Problem with no subject tag has. */
const jsonArraySql = (key: string) => `CASE jsonb_typeof(n.metadata -> '${key}')
        WHEN 'array' THEN n.metadata -> '${key}'
        WHEN 'string' THEN (n.metadata ->> '${key}')::jsonb
        ELSE '[]'::jsonb END`;

const PROBLEM_TAGS_SQL = `ARRAY(SELECT jsonb_array_elements_text(${jsonArraySql("tags")}))`;

/* Resolver v1 requires every catalog Source to retain its numeric route key in
   the exact `problem_number` metadata field. The native ID remains an opaque
   Source identity and is never parsed into a cross-domain number. */
const PROBLEM_NUMBER_SQL = `n.metadata ->> 'problem_number'`;
const PROBLEM_ORDINAL_SQL = `(CASE WHEN (${PROBLEM_NUMBER_SQL}) ~ '^[0-9]+$' THEN (${PROBLEM_NUMBER_SQL})::bigint END)`;

/* A Problem is a Source observation, and the Claim is optional.
   This used to read `graph_nodes JOIN claims`, an inner join, which said in one
   line that a question cannot be asked here until this authority has already
   answered it. Anchoring on `native_records` and scoping through
   `release_sources` inverts that: the questions are what the sources publish,
   and Standing is something a Problem may or may not have acquired. */
const PROBLEM_FROM = `projection.native_records n
       JOIN projection.release_sources rs
         ON rs.observation_root = n.observation_root AND rs.source_id = n.source_id
       JOIN projection.source_declarations sd
         ON sd.declaration_root = rs.declaration_root AND sd.source_id = rs.source_id
       JOIN projection.repositories fr ON fr.release_root = rs.release_root
       LEFT JOIN LATERAL (
         WITH bound_claims AS (
           SELECT DISTINCT c.claim_id, c.claim_root, c.standing
           FROM projection.repository_source_bindings b
           JOIN projection.native_records bound_native
             ON bound_native.observation_root = b.observation_root
            AND bound_native.source_id = b.source_id
            AND bound_native.native_id = b.native_id
            AND bound_native.row_root = b.native_record_root
           JOIN projection.claims c
             ON c.release_root = b.release_root AND c.repository_id = b.repository_id
            AND c.claim_id = b.repository_object_id
           WHERE b.release_root = rs.release_root AND b.repository_id = fr.repository_id
             AND b.repository_object_kind = 'claim'
             AND (
               (
                 b.source_id = n.source_id AND b.native_id = n.native_id
                 AND bound_native.native_kind = n.native_kind
                 AND bound_native.content_root = n.content_root
               ) OR EXISTS (
                 SELECT 1 FROM reviewed_problem_occurrences occurrence
                 WHERE occurrence.canonical_source_id = n.source_id
                   AND occurrence.canonical_native_id = n.native_id
                   AND occurrence.canonical_native_kind = n.native_kind
                   AND occurrence.canonical_content_root = n.content_root
                   AND occurrence.source_id = b.source_id
                   AND occurrence.native_id = b.native_id
                   AND occurrence.native_kind = bound_native.native_kind
                   AND occurrence.content_root = bound_native.content_root
               )
             )
         ), selected AS (
           SELECT *, standing NOT IN ('superseded', 'retracted') AS current
           FROM bound_claims
         )
         SELECT
           CASE
             WHEN count(*) FILTER (WHERE current) = 1
               THEN min(claim_id) FILTER (WHERE current)
             WHEN count(*) FILTER (WHERE current) = 0 AND count(*) = 1
               THEN min(claim_id)
           END AS claim_id,
           CASE
             WHEN count(*) FILTER (WHERE current) = 1
               THEN min(claim_root) FILTER (WHERE current)
             WHEN count(*) FILTER (WHERE current) = 0 AND count(*) = 1
               THEN min(claim_root)
           END AS claim_root,
           CASE
             WHEN count(*) FILTER (WHERE current) = 1
               THEN min(standing) FILTER (WHERE current)
             WHEN count(*) FILTER (WHERE current) = 0 AND count(*) = 1
               THEN min(standing)
           END AS standing,
           count(*) FILTER (WHERE current)::integer AS current_claim_count,
           count(*)::integer AS bound_claim_count
         FROM selected
       ) f ON true
       LEFT JOIN problem_resolution_profiles primary_profile
         ON primary_profile.source_id = n.source_id AND primary_profile.native_kind = n.native_kind
       LEFT JOIN problem_sources ps
         ON ps.resolution_namespace = primary_profile.resolution_namespace
        AND ps.problem_number = n.metadata ->> 'problem_number'`;

/*
  Which sources publish a record about each problem number, aggregated once per
  query rather than once per row.

  The old count walked bindings to a shared graph node, which exists only where
  a Claim does; the problem number is what the sources actually agree on. But it
  asked that question as a correlated subquery over every source-native record
  in the release — free while the ledger returned nothing, and 10ms per row the
  moment it returned 1,217. Four of the five queries below carried it, so a page
  cost roughly twenty seconds and the integration suite timed out reading the
  corpus it exists to check.

  `array_agg(DISTINCT …)` returns them sorted, which is the order the row wants
  anyway. A record with no problem number contributes to no group and joins to
  no row.
*/
const sqlText = (value: string) => `'${value.replaceAll("'", "''")}'`;

const PROBLEM_RESOLUTION_PROFILE_VALUES = problemResolutionConfig.candidate_sources.flatMap((source) => (
  source.native_kinds.map((nativeKind) => `(${[
    source.source_id,
    source.resolution_namespace,
    nativeKind,
    source.source_role,
    source.number_extraction.kind,
  ].map(sqlText).join(", ")})`)
)).join(", ");

const PROBLEM_REVIEWED_OCCURRENCE_VALUES = problemResolutionConfig.entities.flatMap((entity) => (
  [entity.canonical_occurrence, ...entity.reviewed_occurrences].map((occurrence) => `(${[
    entity.canonical_occurrence.source_id,
    entity.canonical_occurrence.native_id,
    entity.canonical_occurrence.native_kind,
    entity.canonical_occurrence.content_root,
    occurrence.source_id,
    occurrence.native_id,
    occurrence.native_kind,
    occurrence.content_root,
  ].map(sqlText).join(", ")})`)
)).join(", ");

const PROBLEM_SOURCES_CTE = `WITH problem_resolution_profiles(source_id, resolution_namespace, native_kind, source_role, number_extraction) AS (
      VALUES ${PROBLEM_RESOLUTION_PROFILE_VALUES}
    ), reviewed_problem_occurrences(
      canonical_source_id, canonical_native_id, canonical_native_kind, canonical_content_root,
      source_id, native_id, native_kind, content_root
    ) AS (
      VALUES ${PROBLEM_REVIEWED_OCCURRENCE_VALUES}
    ), problem_sources AS (
      SELECT profile.resolution_namespace,
             CASE WHEN profile.number_extraction = 'erdos_formal_native_id'
               THEN substring(n2.native_id from '^Erdos([1-9][0-9]*)(?:\\.|$)')
               ELSE n2.metadata ->> 'problem_number' END AS problem_number,
             array_agg(DISTINCT n2.source_id) AS source_ids
      FROM projection.native_records n2
      JOIN projection.release_sources rs2
        ON rs2.observation_root = n2.observation_root AND rs2.source_id = n2.source_id
      JOIN problem_resolution_profiles profile
        ON profile.source_id = n2.source_id AND profile.native_kind = n2.native_kind
      WHERE rs2.release_root = $1 AND CASE WHEN profile.number_extraction = 'erdos_formal_native_id'
        THEN substring(n2.native_id from '^Erdos([1-9][0-9]*)(?:\\.|$)')
        ELSE n2.metadata ->> 'problem_number' END IS NOT NULL
      GROUP BY 1, 2
    )`;

/* Absent reads as empty, which is what a Problem no source has published a
   second record about has. */
const PROBLEM_SOURCE_IDS_SQL = "coalesce(ps.source_ids, ARRAY[]::text[])";

const problemSourceCoverageSchema = z.object({
  repository_slugs: z.array(z.string().min(1)).min(1),
}).passthrough();

function sourceCoversRepository(coverage: unknown, slug: string): boolean {
  return problemSourceCoverageSchema.parse(coverage).repository_slugs.includes(slug);
}

/* One constant WHERE, exactly as the Claim ledger builds it: a facet drops its
   own term by passing an empty string for that parameter, so no clause is ever
   assembled at runtime.

   The search term dispatches on what was typed. An all-digits query is a
   problem number, matched exactly and by prefix; numeric order then puts the
   exact match first, because every longer identifier sharing the prefix is a
   larger integer. Anything else is language, and it runs against
   `search_document` under the `simple` configuration: the projection builds
   that vector unstemmed, so `websearch_to_tsquery('english', 'covering')`
   matches 3 statements where `('simple', 'covering')` matches 14.

   The non-numeric branch also matches the identifier exactly, because that is
   how `problemDetail` resolves a route segment back to a record. Erdős numbers
   all take the numeric branch, so this disjunct matches nothing in the current
   release; it is what lets a repository whose problems are not numbered have a
   detail page at all. */
const PROBLEM_WHERE = `rs.release_root = $1 AND fr.repository_id = $2 AND primary_profile.source_role = 'problem_catalog'
      AND (sd.coverage -> 'repository_slugs') ? $3
      AND ($4 = '' OR CASE WHEN $4 ~ '^[0-9]+$'
            THEN ${PROBLEM_NUMBER_SQL} LIKE $4 || '%'
            ELSE (${PROBLEM_NUMBER_SQL} = $4
                  OR n.search_document @@ websearch_to_tsquery('simple', $4)) END)
      AND ($5 = '' OR ${PROBLEM_STATUS_SQL} = $5)
      AND ($6 = '' OR CASE WHEN ${PROBLEM_FORMALIZED_SQL} THEN 'formalized' ELSE 'not formalized' END = $6)
      AND ($7 = '' OR $7 = ANY(${PROBLEM_TAGS_SQL}))
      AND ($8 = '' OR $8 = ANY(${PROBLEM_SOURCE_IDS_SQL}))`;

export async function problemsForRepository(slug: string, input: ProblemLedgerFilter = {}) {
  const sql = neon(projectionDatabaseUrl());
  const root = input.root
    ? (await projectionManifestAtRoot(input.root)).release_root
    : await boundReleaseRoot();
  const q = input.q?.trim() ?? "";
  const includeFacets = input.includeFacets !== false;
  /* Interactive ledgers stay tightly paged. The internal catalogue reader may
     take one bounded release snapshot without facets; its caller independently
     refuses a corpus above the same 5,000-record product bound. */
  const maximumLimit = includeFacets ? 250 : 5_000;
  const limit = Math.min(Math.max(input.limit ?? 50, 1), maximumLimit);
  const offset = Math.max(input.offset ?? 0, 0);
  const scope = [root, repositoryKey(slug), slug, q, input.status ?? "", input.formalization ?? "", input.tag ?? "", input.source ?? ""];

  const order = input.sort === "sources"
    ? `source_count DESC, ${PROBLEM_ORDINAL_SQL} NULLS LAST, n.native_id`
    : `${PROBLEM_ORDINAL_SQL} NULLS LAST, n.native_id`;

  const withoutOwnTerm = (index: number) => scope.map((value, position) => (position === index ? "" : value));

  /* The subject and source facets carry no LIMIT, unlike the Claim ledger's 30.
     The rail prints how many subjects it has folded away, and that sentence is
     only true if the tail it counts is the whole tail. The vocabulary is closed
     at 41 subjects and 6 sources. */
  const rowRead = sql.query(
      `${PROBLEM_SOURCES_CTE}
       SELECT n.native_id AS node_id,
         ${PROBLEM_NUMBER_SQL} AS problem,
         n.source_id,
         n.native_kind,
         n.content_root,
         n.metadata,
         f.claim_id,
         f.standing AS local_standing,
         n.summary AS statement,
         ${PROBLEM_STATUS_SQL} AS declared_status,
         ${PROBLEM_FORMALIZED_SQL} AS formalized,
         ${PROBLEM_PRIZE_SQL} AS prize,
         ${PROBLEM_TAGS_SQL} AS tags,
         ARRAY(SELECT jsonb_array_elements_text(${jsonArraySql("oeis")})) AS oeis,
         ${PROBLEM_LEAN_URL_SQL} AS lean_url,
         ${PROBLEM_SOURCE_IDS_SQL} AS source_ids,
         coalesce(array_length(ps.source_ids, 1), 0) AS source_count,
         count(*) OVER()::integer AS total
       FROM ${PROBLEM_FROM}
       WHERE ${PROBLEM_WHERE} ORDER BY ${order} LIMIT $9 OFFSET $10`,
      [...scope, limit, offset],
    );
  if (!includeFacets) {
    const rows = await rowRead;
    return {
      items: rows.map(problemFromRow),
      total: rows[0]?.total ?? 0,
      facets: { status: [], formalization: [], tag: [], source: [] } satisfies ProblemFacets,
    };
  }

  const [rows, statusRows, formalizationRows, tagRows, sourceRows] = await Promise.all([
    rowRead,
    sql.query(
      `${PROBLEM_SOURCES_CTE}
       SELECT ${PROBLEM_STATUS_SQL} AS value, count(*)::integer AS count,
         count(*) FILTER (WHERE ${PROBLEM_FORMALIZED_SQL})::integer AS formalized
       FROM ${PROBLEM_FROM} WHERE ${PROBLEM_WHERE}
       GROUP BY 1 ORDER BY count DESC, 1 ASC`,
      withoutOwnTerm(4),
    ),
    sql.query(
      `${PROBLEM_SOURCES_CTE}
       SELECT CASE WHEN ${PROBLEM_FORMALIZED_SQL} THEN 'formalized' ELSE 'not formalized' END AS value,
         count(*)::integer AS count
       FROM ${PROBLEM_FROM} WHERE ${PROBLEM_WHERE}
       GROUP BY 1 ORDER BY count DESC, 1 ASC`,
      withoutOwnTerm(5),
    ),
    sql.query(
      `${PROBLEM_SOURCES_CTE}
       SELECT tag AS value, count(*)::integer AS count
       FROM ${PROBLEM_FROM}, LATERAL unnest(${PROBLEM_TAGS_SQL}) AS tag
       WHERE ${PROBLEM_WHERE}
       GROUP BY 1 ORDER BY count DESC, 1 ASC`,
      withoutOwnTerm(6),
    ),
    sql.query(
      /* Lateral over the row's own aggregated sources, so each problem
         contributes each of its sources once. */
      `${PROBLEM_SOURCES_CTE}
       SELECT sibling AS value, count(DISTINCT n.native_id)::integer AS count
       FROM ${PROBLEM_FROM}
       CROSS JOIN LATERAL unnest(${PROBLEM_SOURCE_IDS_SQL}) AS sibling
       WHERE ${PROBLEM_WHERE}
       GROUP BY 1 ORDER BY count DESC, 1 ASC`,
      withoutOwnTerm(7),
    ),
  ]);

  const facet = (facetRows: Record<string, unknown>[]): ProblemFacetValue[] => facetRows
    .filter((row) => typeof row.value === "string" && row.value.length)
    .map((row) => ({ value: String(row.value), count: Number(row.count) }));

  return {
    items: rows.map(problemFromRow),
    total: rows[0]?.total ?? 0,
    facets: {
      status: statusRows
        .filter((row) => typeof row.value === "string" && row.value.length)
        .map((row) => {
          const count = Number(row.count);
          const formalized = Number(row.formalized);
          return {
            value: String(row.value),
            count,
            parts: [
              { label: "formalized", count: formalized },
              { label: "not formalized", count: count - formalized },
            ],
          } satisfies ProblemFacetValue;
        }),
      formalization: facet(formalizationRows),
      tag: facet(tagRows),
      source: facet(sourceRows),
    } satisfies ProblemFacets,
  };
}

/**
 * Read the complete Problem discovery catalogue for one Repository without the
 * interactive ledger's four facet scans. This is deliberately a separate read
 * contract: discovery needs every bounded row once, while a ledger needs one
 * page plus global facet distributions. Conflating them made the app request
 * five ledger pages and twenty redundant aggregate queries.
 */
export async function problemCatalogForRepository(
  slug: string,
  input: { root?: string; limit?: number } = {},
): Promise<ProblemCatalogRead> {
  const sql = neon(projectionDatabaseUrl());
  const root = input.root
    ? (await projectionManifestAtRoot(input.root)).release_root
    : await boundReleaseRoot();
  const limit = Math.min(Math.max(input.limit ?? 5_000, 1), 5_000);
  /* These are independent, indexed reads over one immutable root. Joining the
     complete multi-Source map and Claim bindings into the native-row
     query made Postgres materialize a wide intermediate relation before it
     could return anything. Keeping the bounded sets narrow and joining them in
     memory cuts cold catalogue latency without weakening any identity key. */
  const [rows, sourceRows, claimRows] = await Promise.all([
    sql.query(
      `WITH problem_resolution_profiles(source_id, resolution_namespace, native_kind, source_role, number_extraction) AS (
         VALUES ${PROBLEM_RESOLUTION_PROFILE_VALUES}
       ) SELECT n.native_id AS node_id,
         ${PROBLEM_NUMBER_SQL} AS problem,
         n.source_id,
         n.native_kind,
         n.content_root,
         n.metadata,
         n.summary AS statement,
         ${PROBLEM_STATUS_SQL} AS declared_status,
         ${PROBLEM_FORMALIZED_SQL} AS formalized,
         ${PROBLEM_PRIZE_SQL} AS prize,
         ${PROBLEM_TAGS_SQL} AS tags,
         ARRAY(SELECT jsonb_array_elements_text(${jsonArraySql("oeis")})) AS oeis,
         ${PROBLEM_LEAN_URL_SQL} AS lean_url,
         primary_profile.resolution_namespace
       FROM projection.native_records n
       JOIN projection.release_sources rs
         ON rs.observation_root = n.observation_root AND rs.source_id = n.source_id
       JOIN projection.source_declarations sd
         ON sd.declaration_root = rs.declaration_root AND sd.source_id = rs.source_id
       JOIN projection.repositories fr ON fr.release_root = rs.release_root
       JOIN problem_resolution_profiles primary_profile
         ON primary_profile.source_id = n.source_id AND primary_profile.native_kind = n.native_kind
       WHERE rs.release_root = $1 AND fr.repository_id = $2
         AND primary_profile.source_role = 'problem_catalog'
         AND (sd.coverage -> 'repository_slugs') ? $3
       ORDER BY ${PROBLEM_ORDINAL_SQL} NULLS LAST, n.native_id
       LIMIT $4`,
      [root, repositoryKey(slug), slug, limit + 1],
    ),
    sql.query(
      `${PROBLEM_SOURCES_CTE}
       SELECT resolution_namespace, problem_number, source_ids
       FROM problem_sources
       ORDER BY resolution_namespace, problem_number`,
      [root],
    ),
    sql.query(
      `SELECT b.source_id, b.native_id, native_record.native_kind,
         native_record.content_root, c.claim_id, c.standing
       FROM projection.repository_source_bindings b
       JOIN projection.native_records native_record
         ON native_record.observation_root = b.observation_root
        AND native_record.source_id = b.source_id
        AND native_record.native_id = b.native_id
        AND native_record.row_root = b.native_record_root
       JOIN projection.claims c
         ON c.release_root = b.release_root AND c.repository_id = b.repository_id
        AND c.claim_id = b.repository_object_id
       WHERE b.release_root = $1 AND b.repository_id = $2
         AND b.repository_object_kind = 'claim'
       ORDER BY b.source_id, b.native_id, c.claim_id`,
      [root, repositoryKey(slug)],
    ),
  ]);
  const total = rows.length;
  const boundedRows = rows.slice(0, limit);
  const sources = new Map(sourceRows.map((row) => [
    `${row.resolution_namespace}\u0000${row.problem_number}`,
    stringList(row.source_ids),
  ]));
  const bindingKey = (value: { source_id: string; native_id: string; native_kind: string; content_root: string }) => (
    `${value.source_id}\u0000${value.native_kind}\u0000${value.native_id}\u0000${value.content_root}`
  );
  const claims = new Map<string, Array<Record<string, any>>>();
  for (const claim of claimRows) {
    const key = bindingKey(claim as never);
    const entries = claims.get(key) ?? [];
    if (!entries.some(({ claim_id }) => claim_id === claim.claim_id)) entries.push(claim);
    claims.set(key, entries);
  }
  return {
    items: boundedRows.map((row) => {
      const boundClaims = reviewedProblemBindingOccurrences({
        source_id: String(row.source_id),
        native_id: String(row.node_id),
        native_kind: String(row.native_kind),
        content_root: hashRootSchema.parse(row.content_root),
      }).flatMap((occurrence) => claims.get(bindingKey(occurrence)) ?? []);
      const uniqueClaims = [...new Map(boundClaims.map((claim) => [String(claim.claim_id), claim])).values()];
      const liveClaims = uniqueClaims.filter(({ standing }) => standing !== "superseded" && standing !== "retracted");
      if (liveClaims.length > 1) {
        throw new Error(`Problem ${row.source_id}/${row.node_id} resolves to multiple current Repository Claims`);
      }
      const claim = liveClaims[0] ?? (uniqueClaims.length === 1 ? uniqueClaims[0] : undefined);
      const sourceIds = sources.get(`${row.resolution_namespace}\u0000${row.problem}`) ?? [];
      return problemFromRow({
        ...row,
        claim_id: claim?.claim_id ?? null,
        local_standing: claim?.standing ?? null,
        source_ids: sourceIds,
        source_count: sourceIds.length,
      });
    }),
    total,
  };
}

/* Exported so the mapping from a projection row to a Problem can be asserted
   without a database. */
export function problemFromRow(row: any): ProblemRecord {
  if (Number(row.current_claim_count ?? 0) > 1) {
    throw new Error(`Problem ${row.source_id}/${row.node_id} resolves to multiple current Repository Claims`);
  }
  return {
    problem: row.problem,
    node_id: row.node_id,
    source_id: row.source_id,
    native_kind: typeof row.native_kind === "string" ? row.native_kind : "problem",
    content_root: hashRootSchema.parse(row.content_root),
    metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? { ...row.metadata } : {},
    claim_id: typeof row.claim_id === "string" ? row.claim_id : null,
    statement: row.statement ?? "",
    declared_status: row.declared_status,
    formalized: row.formalized === true,
    lean_url: row.lean_url ?? null,
    prize: row.prize ?? null,
    tags: stringList(row.tags),
    oeis: stringList(row.oeis),
    source_ids: stringList(row.source_ids),
    source_count: Number(row.source_count ?? 0),
    local_standing: typeof row.local_standing === "string" ? row.local_standing : null,
  };
}

/* Which repositories have a problem ledger at all. Read off the same rows the
   ledger reads, so a repository can never be offered a section with nothing in
   it, or denied one that has rows. It read `graph_nodes` of kind `problem`,
   and a graph node exists only where a Claim does: the repository publishing
   1,217 open questions and no accepted assertion was denied the section that
   holds them. */
export async function problemRepositorySlugs(requestedRoot?: string): Promise<string[]> {
  const root = requestedRoot
    ? (await projectionManifestAtRoot(requestedRoot)).release_root
    : await boundReleaseRoot();
  const rows = await neon(projectionDatabaseUrl()).query(
    `WITH problem_resolution_profiles(source_id, resolution_namespace, native_kind, source_role, number_extraction) AS (
       VALUES ${PROBLEM_RESOLUTION_PROFILE_VALUES}
     ) SELECT DISTINCT fr.repository_id, sd.coverage
     FROM projection.repositories fr
     JOIN projection.release_sources rs ON rs.release_root = fr.release_root
     JOIN projection.source_declarations sd
       ON sd.declaration_root = rs.declaration_root AND sd.source_id = rs.source_id
     JOIN projection.native_records n
       ON n.observation_root = rs.observation_root AND n.source_id = rs.source_id
     JOIN problem_resolution_profiles profile
       ON profile.source_id = n.source_id AND profile.native_kind = n.native_kind
     WHERE fr.release_root = $1 AND profile.source_role = 'problem_catalog'
     ORDER BY fr.repository_id, sd.coverage`,
    [root],
  );
  /* Named for what it returns: the handles the Problem routes are built from.
     A repository the registry does not carry has no route to offer, so it is
     dropped rather than surfaced under its raw id. */
  return [...new Set(rows.flatMap((row) => {
    const slug = slugForRepositoryId(String(row.repository_id));
    return slug && sourceCoversRepository(row.coverage, slug) ? [slug] : [];
  }))];
}

export async function problemByNumber(slug: string, problem: string, root?: string): Promise<ProblemRecord | undefined> {
  /* A detail lookup consumes no facet rail. Running all four aggregate queries
     here made every Problem navigation pay directory-page cost. */
  const first = await problemsForRepository(slug, { root, q: problem, limit: 250, includeFacets: false });
  const remaining = await Promise.all(Array.from(
    { length: Math.max(0, Math.ceil((first.total - first.items.length) / 250)) },
    (_, index) => problemsForRepository(slug, { root, q: problem, limit: 250, offset: first.items.length + index * 250, includeFacets: false }),
  ));
  const exact = [...first.items, ...remaining.flatMap((page) => page.items)]
    .filter((item) => item.problem === problem);
  if (exact.length > 1) {
    throw new Error(`Problem route ${slug}/${problem} is ambiguous across ${exact.length} exact source rows`);
  }
  return exact[0];
}

/* Bounded by `[slug]`, like every other Problem reader in this file. It read
   `erdos` in its name, in a constructed `erdos:<n>` node id, and in three
   literal `repository_id` predicates, while the nav entry that exposes the
   section is gated on `problem_count > 0` — so the first repository besides Erdős
   to project a problem node would have rendered a ledger whose every row linked
   to a hard 404.

   The node id comes off the retained record rather than from `${slug}:${problem}`.
   The namespace belongs to the source, not to the Repository; Erdős's happens to
   equal its slug and nothing guarantees that for the next source. */
export async function problemDetail(slug: string, problem: string, requestedRoot?: string) {
  const record = await problemByNumber(slug, problem, requestedRoot);
  if (!record) return undefined;
  const sql = neon(projectionDatabaseUrl());
  const root = requestedRoot
    ? (await projectionManifestAtRoot(requestedRoot)).release_root
    : await boundReleaseRoot();
  const bindingOccurrences = reviewedProblemBindingOccurrences({
    source_id: record.source_id,
    native_id: record.node_id,
    native_kind: record.native_kind,
    content_root: record.content_root,
  });
  const claimRows = await (
    /* Every Claim this authority has admitted about the problem, reached
       through the Source binding rather than through a graph node. A problem
       with no Claim returns no rows, which is the honest answer and was
       previously unrepresentable. */
    sql.query(`WITH reviewed_occurrences(source_id, native_id, native_kind, content_root) AS (
        SELECT source_id, native_id, native_kind, content_root
        FROM jsonb_to_recordset($3::jsonb)
          AS occurrence(source_id text, native_id text, native_kind text, content_root text)
      ) SELECT f.*, ${CLAIM_PROPOSAL_SQL} AS proposal_recorded,
        b.binding_id, b.binding_root, b.row_root AS binding_row_root,
        b.source_id AS binding_source_id, b.observation_root AS binding_observation_root,
        b.native_id AS binding_native_id, b.native_record_root AS binding_native_record_root,
        b.binding_kind, b.repository_object_root AS binding_repository_object_root,
        b.local_standing_effect, native_record.native_kind AS binding_native_kind,
        native_record.content_root AS binding_content_root
      FROM projection.repository_source_bindings b
      JOIN reviewed_occurrences occurrence
        ON occurrence.source_id=b.source_id AND occurrence.native_id=b.native_id
      JOIN projection.native_records native_record
        ON native_record.observation_root=b.observation_root
       AND native_record.source_id=b.source_id
       AND native_record.native_id=b.native_id
       AND native_record.native_kind=occurrence.native_kind
       AND native_record.content_root=occurrence.content_root
       AND native_record.row_root=b.native_record_root
      JOIN projection.claims f ON f.release_root=b.release_root AND f.repository_id=b.repository_id
        AND f.claim_id = b.repository_object_id
      WHERE b.release_root=$1 AND b.repository_id=$2
        AND b.repository_object_kind='claim'
      ORDER BY f.claim_id, b.binding_id`, [root, repositoryKey(slug), JSON.stringify(bindingOccurrences)])
  );
  const { claims, current_claim_id: currentClaimId } = problemClaimsFromBindingRows({
    rows: claimRows,
    releaseRoot: root,
    repositoryId: repositoryKey(slug),
    problemLabel: `${slug}/${problem}`,
    occurrences: bindingOccurrences,
  });
  const claimIds = claims.map(({ id: claimId }) => claimId);
  /* Checks and Decisions belong to the joined Claim, not independently to a
     source occurrence. Reading them from the exact joined Claim IDs gives each
     Proposal one canonical presentation owner. */
  const reviewRows = claimIds.length === 0 ? [] : await sql.query(`SELECT r.*
    FROM projection.reviews r
    WHERE r.release_root=$1 AND r.repository_id=$2 AND r.target = ANY($3::text[])
    ORDER BY COALESCE(r.reviewed_at,r.created_at) DESC`, [root, repositoryKey(slug), claimIds]);
  const proposalIds = reviewRows.map((review) => String(review.proposal_id));
  const verificationRows = proposalIds.length === 0 ? [] : await sql.query(`SELECT verification.*
    FROM projection.verifications verification
    WHERE verification.release_root=$1 AND verification.repository_id=$2
      AND verification.proposal_id = ANY($3::text[])
    ORDER BY verification.proposal_id, verification.completed_at, verification.verification_record_id`, [root, repositoryKey(slug), proposalIds]);
  /* Passing `reviewFromRow` to `map` by name handed it the row index as the
     Submission and the whole array as the Verification Records, so every row
     after the first reported a Submission it had not got and a Verification
     count equal to the number of Proposals. This query reads neither table, so
     the row alone is the honest argument. */
  return {
    record,
    claims,
    current_claim_id: currentClaimId,
    reviews: reviewRows.map((review) => reviewFromRow(
      review,
      undefined,
      verificationRows.filter((verification) => verification.proposal_id === review.proposal_id),
    )),
  };
}

export async function allClaimRouteIds(): Promise<Array<{ repository: string; id: string }>> {
  const root = await boundReleaseRoot();
  const rows = await neon(projectionDatabaseUrl()).query(`SELECT repository_id AS repository, claim_id AS id
    FROM projection.claims WHERE release_root=$1 ORDER BY repository_id, claim_id`, [root]);
  return rows as Array<{ repository: string; id: string }>;
}

/* The fixed `substring(node_id from 7)` here was the byte length of the literal
   `erdos:`, so it mis-sliced any other namespace silently. It reads the same
   position-of-colon expression the ledger parses the route segment with, and
   returns the pair the route actually takes. */
export async function allProblemRouteIds(): Promise<Array<{ repository: string; problem: string }>> {
  const root = await boundReleaseRoot();
  const rows = await neon(projectionDatabaseUrl()).query(`WITH problem_resolution_profiles(source_id, resolution_namespace, native_kind, source_role, number_extraction) AS (
      VALUES ${PROBLEM_RESOLUTION_PROFILE_VALUES}
    ) SELECT fr.repository_id AS repository,
      ${PROBLEM_NUMBER_SQL} AS problem, sd.coverage
    FROM projection.native_records n
      JOIN projection.release_sources rs
        ON rs.observation_root = n.observation_root AND rs.source_id = n.source_id
      JOIN projection.source_declarations sd
        ON sd.declaration_root = rs.declaration_root AND sd.source_id = rs.source_id
      JOIN projection.repositories fr ON fr.release_root = rs.release_root
      JOIN problem_resolution_profiles profile
        ON profile.source_id = n.source_id AND profile.native_kind = n.native_kind
    WHERE rs.release_root=$1 AND profile.source_role='problem_catalog'
    ORDER BY fr.repository_id, ${PROBLEM_ORDINAL_SQL} NULLS LAST, n.native_id`, [root]);
  const routes = new Map<string, { repository: string; problem: string }>();
  for (const row of rows) {
    const repository = slugForRepositoryId(String(row.repository));
    const problem = String(row.problem);
    if (!repository || !sourceCoversRepository(row.coverage, repository)) continue;
    const key = `${repository}/${problem}`;
    if (routes.has(key)) throw new Error(`Problem route ${key} is ambiguous across exact source rows`);
    routes.set(key, { repository, problem });
  }
  return [...routes.values()];
}

export interface RepositoryCommit {
  sha: string;
  parent_sha: string | null;
  author_name: string;
  committed_at: string;
  subject: string;
  body: string;
  changed_paths: string[];
  machine: boolean;
  /* Present only where the commit changed the repository index, which is 56 of
     495 in the largest Repository. Everything else is editorial. */
  transition: RepositoryTransition | null;
}

export interface RepositoryTransition {
  repository_root_before: string | null;
  repository_root_after: string;
  accepted_added: string[];
  accepted_removed: string[];
  pending_added: string[];
  pending_removed: string[];
  counts: {
    accepted_before: number;
    accepted_after: number;
    pending_before: number;
    pending_after: number;
  };
  comparison_state: "verified" | "unavailable";
  before_revision_root: string | null;
  after_revision_root: string | null;
  semantic_delta_root: string | null;
}

const revisionRecordSchema = z.object({
  schema: z.literal("vela.projection-revision.v1"),
  authority_effect: z.literal("none"),
  identity: z.object({
    repository_id: z.string().min(1),
    git_commit: z.string().regex(/^[0-9a-f]{40}$/u),
    git_tree: z.string().regex(/^[0-9a-f]{40}$/u),
    repository_root: hashRootSchema.nullable(),
  }).strict(),
  reader: z.object({
    version: z.string().regex(/^vela 0\.[0-9]+\.[0-9]+/u),
    binary_root: hashRootSchema,
    projection_schema: z.literal("vela.repository-projection.v1"),
    projection_root: hashRootSchema.nullable(),
  }).strict(),
  replay: z.discriminatedUnion("state", [
    z.object({
      state: z.literal("verified"),
      integrity: z.literal("strict_pass"),
      blocker_codes: z.tuple([]),
    }).strict(),
    z.object({
      state: z.literal("unavailable"),
      integrity: z.string().min(1),
      blocker_codes: z.array(z.string()).nonempty(),
    }).strict(),
  ]),
  state: z.object({
    accepted_claim_ids: z.array(z.string()),
    unassessed_claim_ids: z.array(z.string()),
  }).strict().nullable(),
  source_index_root: hashRootSchema,
  nonclaims: z.array(z.string()).min(2),
}).strict();

export interface RepositoryRevision {
  git_commit: string;
  parent_commit: string | null;
  git_tree: string;
  source_repository_id: string;
  source_index_root: string;
  repository_root: string | null;
  replay_state: "verified" | "unavailable";
  revision_root: string;
  record: z.infer<typeof revisionRecordSchema>;
}

export interface RepositoryRevisionComparison {
  schema: "vela.projection-semantic-delta.v1";
  authority_effect: "none";
  before: RepositoryRevision;
  after: RepositoryRevision;
  accepted: { added: string[]; removed: string[]; before: number; after: number };
  unassessed: { added: string[]; removed: string[]; before: number; after: number };
  comparison_root: string;
  nonclaims: string[];
}

function assertRepositoryRevisionBinding(revision: RepositoryRevision): void {
  const { record } = revision;
  if (
    record.identity.repository_id !== revision.source_repository_id
    || record.identity.git_commit !== revision.git_commit
    || record.identity.git_tree !== revision.git_tree
    || record.identity.repository_root !== revision.repository_root
    || record.source_index_root !== revision.source_index_root
  ) {
    throw new ProjectionReadError("foreign_manifest", "Repository Revision identity binding drift");
  }
  const verified = revision.replay_state === "verified";
  if (
    verified !== (record.replay.state === "verified")
    || verified !== (revision.repository_root !== null)
    || verified !== (record.state !== null)
  ) {
    throw new ProjectionReadError("foreign_manifest", "Repository Revision replay binding drift");
  }
}

function revisionFromRow(row: Record<string, any>): RepositoryRevision {
  const record = revisionRecordSchema.parse(row.record);
  const body = {
    repository_id: row.repository_id,
    git_commit: row.git_commit,
    parent_commit: row.parent_commit ?? null,
    git_tree: row.git_tree,
    source_repository_id: row.source_repository_id,
    source_index_root: row.source_index_root,
    repository_root: row.repository_root ?? null,
    replay_state: row.replay_state,
    record,
  };
  if (sha256(canonicalJson(body)) !== row.row_root) {
    throw new ProjectionReadError("foreign_manifest", "Repository Revision row root drift");
  }
  const revision = { ...body, revision_root: row.row_root };
  assertRepositoryRevisionBinding(revision);
  return revision;
}

export async function revisionForRepository(
  slug: string,
  commit: string,
): Promise<RepositoryRevision | null> {
  if (!/^[0-9a-f]{40}$/u.test(commit)) return null;
  const sql = neon(projectionDatabaseUrl());
  const root = await boundReleaseRoot();
  const rows = await sql.query(
    `SELECT repository_id, git_commit, parent_commit, git_tree, source_repository_id,
            source_index_root, repository_root, replay_state, record, row_root
     FROM projection.repository_revisions
     WHERE release_root = $1 AND repository_id = $2 AND git_commit = $3`,
    [root, repositoryKey(slug), commit],
  ) as Record<string, any>[];
  return rows[0] ? revisionFromRow(rows[0]) : null;
}

export async function compareRepositoryRevisions(
  slug: string,
  beforeCommit: string,
  afterCommit: string,
): Promise<RepositoryRevisionComparison | null> {
  const [before, after] = await Promise.all([
    revisionForRepository(slug, beforeCommit),
    revisionForRepository(slug, afterCommit),
  ]);
  if (!before || !after) return null;
  return compareExactRepositoryRevisions(before, after);
}

export function compareExactRepositoryRevisions(
  before: RepositoryRevision,
  after: RepositoryRevision,
): RepositoryRevisionComparison {
  assertRepositoryRevisionBinding(before);
  assertRepositoryRevisionBinding(after);
  if (before.replay_state !== "verified" || after.replay_state !== "verified") {
    throw new ProjectionReadError(
      "foreign_manifest",
      "Exact comparison requires two strict-replayed revisions",
    );
  }
  if (before.source_repository_id !== after.source_repository_id) {
    throw new ProjectionReadError(
      "foreign_manifest",
      "Exact comparison cannot cross a Repository identity boundary",
    );
  }
  const beforeAccepted = new Set(before.record.state?.accepted_claim_ids ?? []);
  const afterAccepted = new Set(after.record.state?.accepted_claim_ids ?? []);
  const beforeUnassessed = new Set(before.record.state?.unassessed_claim_ids ?? []);
  const afterUnassessed = new Set(after.record.state?.unassessed_claim_ids ?? []);
  const delta = (from: Set<string>, to: Set<string>) => ({
    added: [...to].filter((id) => !from.has(id)).sort(),
    removed: [...from].filter((id) => !to.has(id)).sort(),
    before: from.size,
    after: to.size,
  });
  const body = {
    schema: "vela.projection-semantic-delta.v1" as const,
    authority_effect: "none" as const,
    before_revision_root: before.revision_root,
    after_revision_root: after.revision_root,
    before_repository_root: before.repository_root,
    after_repository_root: after.repository_root,
    accepted: delta(beforeAccepted, afterAccepted),
    unassessed: delta(beforeUnassessed, afterUnassessed),
    coverage: { state: "complete", basis: "strict_replay_of_both_exact_revisions" },
    nonclaims: [
      "The delta does not make a Decision or change Standing.",
      "Git publication alone does not establish acceptance.",
    ],
  };
  return {
    schema: body.schema,
    authority_effect: body.authority_effect,
    before,
    after,
    accepted: body.accepted,
    unassessed: body.unassessed,
    comparison_root: sha256(canonicalJson(body)),
    nonclaims: body.nonclaims,
  };
}

/* A Repository's history, newest first, with the index delta attached where the
   commit carried one.

   The join is a left join on purpose: a Commits view that showed only the 56
   commits touching scientific state would hide the 439 that did not, and the
   ratio between the two is itself the honest picture of how a Repository
   advances. */
export async function commitsForRepository(
  slug: string,
  { limit = 100, offset = 0, machineOnly = false }: { limit?: number; offset?: number; machineOnly?: boolean } = {},
): Promise<{ items: RepositoryCommit[]; total: number; machine: number }> {
  const sql = neon(projectionDatabaseUrl());
  const root = await boundReleaseRoot();
  const rows = await sql.query(
    `SELECT c.sha, c.parent_sha, c.author_name, c.committed_at, c.subject, c.body,
            c.changed_paths, c.machine,
            t.repository_root_before, t.repository_root_after,
            t.accepted_added, t.accepted_removed, t.pending_added, t.pending_removed, t.counts,
            t.comparison_state, t.before_revision_root, t.after_revision_root,
            t.semantic_delta_root,
            count(*) OVER()::integer AS total,
            count(*) FILTER (WHERE c.machine) OVER()::integer AS machine_total
     FROM projection.commits c
     LEFT JOIN projection.repository_transitions t
       ON t.release_root = c.release_root AND t.repository_id = c.repository_id AND t.commit_sha = c.sha
     WHERE c.release_root = $1 AND c.repository_id = $2 AND ($3 = false OR c.machine)
     ORDER BY c.committed_at DESC, c.sha
     LIMIT $4 OFFSET $5`,
    [root, repositoryKey(slug), machineOnly, Math.min(Math.max(1, limit), 250), Math.max(0, offset)],
  ) as Record<string, any>[];

  return {
    total: rows[0]?.total ?? 0,
    machine: rows[0]?.machine_total ?? 0,
    items: rows.map((row) => ({
      sha: row.sha,
      parent_sha: row.parent_sha ?? null,
      author_name: row.author_name,
      committed_at: instant(row.committed_at) ?? "",
      subject: row.subject,
      body: row.body ?? "",
      changed_paths: Array.isArray(row.changed_paths) ? row.changed_paths.map(String) : [],
      machine: row.machine === true,
      transition: row.repository_root_after
        ? {
            repository_root_before: row.repository_root_before ?? null,
            repository_root_after: row.repository_root_after,
            accepted_added: row.accepted_added ?? [],
            accepted_removed: row.accepted_removed ?? [],
            pending_added: row.pending_added ?? [],
            pending_removed: row.pending_removed ?? [],
            counts: row.counts,
            comparison_state: row.comparison_state ?? "unavailable",
            before_revision_root: row.before_revision_root ?? null,
            after_revision_root: row.after_revision_root ?? null,
            semantic_delta_root: row.semantic_delta_root ?? null,
          }
        : null,
    })),
  };
}


export interface ClaimNeighbours {
  previous: { id: string; assertion: string } | null;
  next: { id: string; assertion: string } | null;
}

/* The Claims either side of this one, in the ledger's own default order.
 *
 * A Repository holds 2,782 Claims and a record page offered no way to reach the
 * one beside it — you went back to the ledger, found your place, and clicked
 * the next row. Every catalogue that expects a reader to walk records puts the
 * step control on the record.
 *
 * Keyed on the whole sort tuple, not on `created_at` alone. 2,674 erdos Claims
 * share one recorded date, so a neighbour query keyed on the date would skip
 * every row tied with this one — which is almost all of them. The comparison
 * mirrors `claimsForRepository`'s default order exactly:
 *   created_at DESC NULLS LAST, evidence_count DESC, claim_id ASC
 * and row-wise comparison over the negated keys gives strict "after me" and
 * "before me" without restating the ordering by hand. */
export async function claimNeighbours(slug: string, id: string): Promise<ClaimNeighbours> {
  const sql = neon(projectionDatabaseUrl());
  const root = await boundReleaseRoot();
  const rows = await sql.query(
    `WITH anchor AS (
       SELECT created_at, evidence_count, claim_id FROM projection.claims
       WHERE release_root = $1 AND repository_id = $2
         AND (claim_id = $3 OR imported_object_id = $3)
       LIMIT 1
     )
     SELECT 'next' AS side, c.claim_id, c.assertion FROM projection.claims c, anchor a
     WHERE c.release_root = $1 AND c.repository_id = $2
       AND (coalesce(c.created_at, '-infinity'), -c.evidence_count, c.claim_id)
         < (coalesce(a.created_at, '-infinity'), -a.evidence_count, a.claim_id)
     ORDER BY c.created_at DESC NULLS LAST, c.evidence_count DESC, c.claim_id ASC
     LIMIT 1`,
    [root, repositoryKey(slug), id],
  ) as { side: string; claim_id: string; assertion: string }[];
  const before = await sql.query(
    `WITH anchor AS (
       SELECT created_at, evidence_count, claim_id FROM projection.claims
       WHERE release_root = $1 AND repository_id = $2
         AND (claim_id = $3 OR imported_object_id = $3)
       LIMIT 1
     )
     SELECT c.claim_id, c.assertion FROM projection.claims c, anchor a
     WHERE c.release_root = $1 AND c.repository_id = $2
       AND (coalesce(c.created_at, '-infinity'), -c.evidence_count, c.claim_id)
         > (coalesce(a.created_at, '-infinity'), -a.evidence_count, a.claim_id)
     ORDER BY c.created_at ASC NULLS FIRST, c.evidence_count ASC, c.claim_id DESC
     LIMIT 1`,
    [root, repositoryKey(slug), id],
  ) as { claim_id: string; assertion: string }[];

  const shape = (row?: { claim_id: string; assertion: string }) =>
    row ? { id: row.claim_id, assertion: row.assertion } : null;
  return { previous: shape(before[0]), next: shape(rows[0]) };
}

/* How many commits changed the repository index, over the whole history rather
   than the page in front of a reader. 56 of 495 in the largest Repository, and
   the ratio is the point: a Repository advances mostly by editorial work, and
   scientific state moves rarely and deliberately. */
export async function transitionSummaryForRepository(
  slug: string,
): Promise<{ moved: number; accepted: number | null }> {
  const sql = neon(projectionDatabaseUrl());
  const root = await boundReleaseRoot();
  /* The newest transition in the whole history, not the newest on a page. The
     50 most recent commits in the largest Repository are all editorial, so a
     count taken from the visible page reported "no transition retained" on a
     repository holding 56 of them. */
  const rows = await sql.query(
    `SELECT count(*)::integer AS moved,
            (SELECT (t.counts->>'accepted_after')::integer
             FROM projection.repository_transitions t
             JOIN projection.commits c
               ON c.release_root = t.release_root AND c.repository_id = t.repository_id
              AND c.sha = t.commit_sha
             WHERE t.release_root = $1 AND t.repository_id = $2
             ORDER BY c.committed_at DESC, c.sha LIMIT 1) AS accepted
     FROM projection.repository_transitions
     WHERE release_root = $1 AND repository_id = $2`,
    [root, repositoryKey(slug)],
  ) as { moved: number; accepted: number | null }[];
  return { moved: rows[0]?.moved ?? 0, accepted: rows[0]?.accepted ?? null };
}
