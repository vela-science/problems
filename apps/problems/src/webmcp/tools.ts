/* The tool implementations.
 *
 * Reads answer from the context the server already resolved. Writes go through
 * the same Server Actions the human forms post to — `attachArtifactAction` is
 * literally the function behind the "Attach evidence" button — so there is one
 * mutation path, one set of guards, and no second implementation to keep
 * honest. Every one of those actions already re-reads the exact Problem state,
 * recomputes the anchor root, refuses on drift, and requires a signed-in
 * account; a tool that reimplemented any of that would be reimplementing the
 * part that matters.
 *
 * Nothing here signs, decides, or writes Standing, and there is a test that
 * greps this directory to keep it that way. */

import type { WebMcpProblemContext, WebMcpWorkContext } from "./context";
import { failure, NON_AUTHORITATIVE, ok, type ToolResult } from "./results";
import { loadSearchIndex } from "@/lib/search-index";

export type MutationActions = {
  createApproach: (form: FormData) => Promise<void>;
  createAttempt: (form: FormData) => Promise<void>;
  attachArtifact: (form: FormData) => Promise<void>;
  addDiscussion: (form: FormData) => Promise<void>;
  saveSubmissionDraft: (form: FormData) => Promise<void>;
};

export type ToolEnvironment = {
  problem: WebMcpProblemContext;
  work: WebMcpWorkContext;
  actions: MutationActions;
  /** Re-read after a mutation so a tool can return the id it just created. */
  readActivity: () => Promise<ProblemActivitySnapshot>;
  /** Injected so tests can pin it; the browser supplies `crypto.randomUUID`. */
  idempotencyKey: () => string;
};

export type ProblemActivitySnapshot = {
  approaches: Array<{ id: string; title: string; version: number }>;
  attempts: Array<{ id: string; approachId: string; title: string; state: string }>;
  artifacts: Array<{ id: string; attemptId: string | null; kind: string; path: string; contentRoot: string }>;
  drafts: Array<{ id: string; payloadRoot: string; version: number; createdAt: string }>;
};

/* Every write form posts the same four hidden fields. Assembling them in one
   place is what keeps a tool from quietly omitting the anchor root, which is
   the field that makes a stale mutation fail instead of land. */
function scopeFields(environment: ToolEnvironment): FormData {
  const form = new FormData();
  form.set("repository", environment.problem.repository);
  form.set("problem", environment.problem.problem);
  form.set("workspaceId", environment.work.workspaceId ?? "");
  form.set("expectedAnchorRoot", environment.problem.anchor_root);
  form.set("idempotencyKey", environment.idempotencyKey());
  return form;
}

function requireWorkspace(environment: ToolEnvironment): ToolResult | null {
  if (!environment.work.accountsEnabled) {
    return failure(
      "accounts_unavailable",
      "This deployment is not configured for hosted accounts, so it has no Work plane to write to.",
      "Read-only tools still work. Nothing can be recorded here.",
    );
  }
  if (!environment.work.signedIn) {
    return failure(
      "not_signed_in",
      "Recording Work requires a signed-in account, so the record carries an author.",
      "Ask the person at the keyboard to sign in at /sign-in, then call this tool again.",
    );
  }
  if (!environment.work.workspaceId) {
    return failure(
      "no_workspace",
      "This Problem has no Workspace open for the signed-in account.",
      "Ask the person at the keyboard to open or create a Workspace in the Work section, then call this tool again.",
    );
  }
  return null;
}

/* A Server Action redirects on a guarded failure rather than throwing a value
   this side can inspect. Turning that into a result the model can act on is
   the difference between "the tool is broken" and "your anchor is stale". */
async function runAction(
  operation: () => Promise<void>,
  onFailure: (detail: string) => ToolResult,
): Promise<ToolResult | null> {
  try {
    await operation();
    return null;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (/NEXT_REDIRECT/u.test(detail)) {
      return onFailure(
        "The server refused the mutation and redirected. The usual cause is that "
        + "the exact Problem state moved since this page loaded.",
      );
    }
    return onFailure(detail);
  }
}

export function inspectProblem(environment: ToolEnvironment): ToolResult {
  const { problem } = environment;
  const current = problem.claims.find((claim) => claim.is_current) ?? null;
  return ok({
    problem: {
      route: problem.route,
      collection: problem.collection,
      label: problem.label,
      question: problem.question,
      declared_status: problem.declared_status,
      formalized: problem.formalized,
      tags: problem.tags,
    },
    current_result: current
      ? {
          claim_id: current.id,
          standing: current.standing,
          assertion: current.assertion,
          conditions: current.conditions,
          evidence_count: current.evidence_count,
        }
      : null,
    /* Said plainly, because "no current Result" and "a Result exists and no
       authority has ruled on it" are different states and a model that
       conflates them will overclaim. */
    standing_note: current
      ? `Standing is "${current.standing}". Only an authorised, attributed Decision in the Vela Repository can change it.`
      : "No Claim is recorded against this Problem, so there is nothing for an authority to have ruled on.",
    claims: problem.claims.map((claim) => ({
      claim_id: claim.id,
      standing: claim.standing,
      is_current: claim.is_current,
      assertion_type: claim.assertion_type,
      evidence_count: claim.evidence_count,
      corrections: claim.corrections,
    })),
    sources: problem.sources,
    exact_roots: {
      projection_release: problem.release_root,
      problem_record: problem.problem_record_root,
      repository: problem.repository_root,
      source_commit: problem.source_commit,
      anchor: problem.anchor_root,
    },
  });
}

export function inspectClaim(environment: ToolEnvironment, input: { claim_id?: string }): ToolResult {
  const { problem } = environment;
  const claim = input.claim_id
    ? problem.claims.find((candidate) => candidate.id === input.claim_id)
    : problem.claims.find((candidate) => candidate.is_current);
  if (!claim) {
    return failure(
      "claim_not_found",
      input.claim_id
        ? `No Claim with id ${input.claim_id} is recorded against this Problem in release ${problem.release_root}.`
        : "This Problem has no current Claim.",
      "Call inspect_problem to list the Claim ids this Problem actually holds.",
    );
  }
  return ok({
    claim: {
      claim_id: claim.id,
      claim_root: claim.root,
      standing: claim.standing,
      assertion: claim.assertion,
      assertion_type: claim.assertion_type,
      conditions: claim.conditions,
      is_current: claim.is_current,
      evidence_count: claim.evidence_count,
      /* Source-reported flags, kept separate from Standing on purpose. A
         source calling something contested is not an authority ruling. */
      source_flags: { contested: claim.contested, retracted: claim.retracted },
      corrections: claim.corrections,
    },
    lineages: claim.lineages,
    reading_note:
      "A Verification reports on one scoped property and its does_not_establish "
      + "list says what it leaves open. Verifications are not summed into a "
      + "verdict, and none of them accepts anything. Only the Decision does, and "
      + "only for the Repository that issued it.",
  });
}

export function inspectHistory(environment: ToolEnvironment): ToolResult {
  const { problem } = environment;
  const events = problem.claims.flatMap((claim) => claim.lineages.map((lineage) => ({
    claim_id: claim.id,
    standing_now: claim.standing,
    proposal: { id: lineage.proposal_id, status: lineage.proposal_status },
    submission_id: lineage.submission_id,
    verifications: lineage.verifications.map((verification) => ({
      outcome: verification.outcome,
      property: verification.property,
      verifier: verification.verifier,
      does_not_establish: verification.does_not_establish,
      completed_at: verification.completed_at,
    })),
    decision: lineage.decision,
  })));
  events.sort((left, right) => (left.decision?.decided_at ?? "").localeCompare(right.decision?.decided_at ?? ""));
  const corrections = problem.claims.flatMap((claim) => claim.corrections.map((correction) => ({
    kind: correction.kind,
    predecessor_claim_id: correction.target_claim_id,
    successor_claim_id: claim.id,
    successor_standing: claim.standing,
  })));
  return ok({
    problem: { route: problem.route, label: problem.label },
    chronology: events,
    corrections,
    answer_shape:
      "To say why a Standing holds, name the Submission that proposed it, what "
      + "each Verification checked and left open, and the attributed Decision "
      + "that accepted it — including who decided and under which event id.",
    exact_roots: { projection_release: problem.release_root },
  });
}

export async function searchProblems(
  environment: ToolEnvironment,
  input: { query: string; standing?: string; limit?: number },
): Promise<ToolResult> {
  const { problem } = environment;
  if (!problem.search) {
    return failure(
      "search_unavailable",
      "This release published no composite search index.",
      "Use inspect_problem on a Problem you can already address.",
    );
  }
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 25);
  try {
    const index = await loadSearchIndex(
      problem.release_root,
      problem.search.search_root,
      problem.search.collection_root,
      { q: input.query, ...(input.standing ? { standing: input.standing } : {}) },
    );
    const records = index.records.slice(0, limit).map((record) => ({
      kind: record.kind,
      id: record.id,
      title: record.source_title ?? record.assertion.slice(0, 160),
      href: record.href,
      repository: record.repository,
      /* Two different words, deliberately not merged. `standing` is what a
         Repository authority ruled; `source_status` is what the upstream
         collection says about itself and carries no authority at all. */
      standing: record.standing,
      source_status: record.source_status ?? null,
    }));
    return ok({
      query: input.query,
      ...(input.standing ? { standing: input.standing } : {}),
      returned: records.length,
      total_matched: index.records.length,
      results: records,
      exact_roots: { projection_release: problem.release_root, search: problem.search.search_root },
    });
  } catch (error) {
    return failure(
      "search_failed",
      error instanceof Error ? error.message : String(error),
      "Retry once; if it fails again the search index for this release is unreadable and only per-Problem reads will work.",
    );
  }
}

export async function openApproach(
  environment: ToolEnvironment,
  input: { title: string; summary: string; attempt_title: string },
): Promise<ToolResult> {
  const blocked = requireWorkspace(environment);
  if (blocked) return blocked;

  const approachForm = scopeFields(environment);
  approachForm.set("title", input.title);
  approachForm.set("summary", input.summary);
  const approachFailed = await runAction(
    () => environment.actions.createApproach(approachForm),
    (detail) => failure("approach_refused", detail, "Call inspect_problem to re-read the current anchor, then try again."),
  );
  if (approachFailed) return approachFailed;

  const afterApproach = await environment.readActivity();
  const approach = afterApproach.approaches.find((candidate) => candidate.title === input.title);
  if (!approach) {
    return failure(
      "approach_not_readable",
      "The Approach was recorded but could not be read back from the Workspace.",
      "Call inspect_candidate or reload the Work section to find it.",
    );
  }

  const attemptForm = scopeFields(environment);
  attemptForm.set("approachId", approach.id);
  attemptForm.set("title", input.attempt_title);
  const attemptFailed = await runAction(
    () => environment.actions.createAttempt(attemptForm),
    (detail) => failure("attempt_refused", detail, "The Approach exists; retry creating the Attempt."),
  );
  if (attemptFailed) return attemptFailed;

  const afterAttempt = await environment.readActivity();
  const attempt = afterAttempt.attempts.find(
    (candidate) => candidate.approachId === approach.id && candidate.title === input.attempt_title,
  );
  return ok({
    approach: { approach_id: approach.id, title: approach.title },
    attempt: attempt ? { attempt_id: attempt.id, title: attempt.title, state: attempt.state } : null,
    next: "Use attach_evidence with this attempt_id to record what the work rests on.",
    ...NON_AUTHORITATIVE,
  });
}

export async function attachEvidence(
  environment: ToolEnvironment,
  input: {
    attempt_id: string; kind: string; path: string; content_root: string;
    locator?: string; rationale: string;
  },
): Promise<ToolResult> {
  const blocked = requireWorkspace(environment);
  if (blocked) return blocked;

  const form = scopeFields(environment);
  form.set("attemptId", input.attempt_id);
  form.set("kind", input.kind);
  form.set("path", input.path);
  form.set("contentRoot", input.content_root);
  if (input.locator) form.set("locator", input.locator);
  const attachFailed = await runAction(
    () => environment.actions.attachArtifact(form),
    (detail) => failure(
      "evidence_refused",
      detail,
      "Check the attempt_id came from open_approach and that content_root is an exact sha256 root.",
    ),
  );
  if (attachFailed) return attachFailed;

  /* The rationale is recorded as an attributed note rather than folded into the
     artifact row. An artifact says what was attached; the note says why, and a
     reviewer reading the Workspace later needs both. */
  const noteForm = scopeFields(environment);
  noteForm.set("attemptId", input.attempt_id);
  noteForm.set("kind", "note");
  noteForm.set("visibility", "workspace");
  noteForm.set("body", input.rationale);
  await runAction(() => environment.actions.addDiscussion(noteForm), (detail) => failure("note_refused", detail, ""));

  const activity = await environment.readActivity();
  const artifact = activity.artifacts.find((candidate) => candidate.contentRoot === input.content_root);
  return ok({
    artifact: artifact
      ? { artifact_id: artifact.id, kind: artifact.kind, path: artifact.path, content_root: artifact.contentRoot }
      : { content_root: input.content_root },
    rationale_recorded: true,
    next: "Use prepare_submission with this artifact_id to draft a proposed scientific state change.",
    ...NON_AUTHORITATIVE,
  });
}

export async function prepareSubmission(
  environment: ToolEnvironment,
  input: Record<string, string>,
): Promise<ToolResult> {
  const blocked = requireWorkspace(environment);
  if (blocked) return blocked;

  const { problem } = environment;
  const targetsExistingClaim = input.requested_change !== "add_claim";
  if (targetsExistingClaim && !problem.current_claim_id) {
    return failure(
      "no_target_claim",
      `A ${input.requested_change} Submission acts on an existing Claim, and this Problem has none.`,
      "Use requested_change: \"add_claim\" instead.",
    );
  }

  const form = scopeFields(environment);
  form.set("actorId", input.actor_id);
  form.set("publicKey", input.public_key_hex);
  form.set("requestedChange", input.requested_change);
  form.set("researchBlockId", input.evidence_artifact_id);
  form.set("assertion", input.assertion);
  form.set("claimType", input.claim_type);
  if (input.condition) form.set("condition", input.condition);
  form.set("caveat", input.caveat);
  form.set("replayability", input.replayability);
  form.set("checkMethod", input.check_method);
  form.set("checkOutcome", input.check_outcome);
  form.set("verificationRequirement", input.verification_requirement);

  const draftFailed = await runAction(
    () => environment.actions.saveSubmissionDraft(form),
    (detail) => failure(
      "draft_refused",
      detail,
      "Check that evidence_artifact_id came from attach_evidence and that actor_id begins with \"agent:\".",
    ),
  );
  if (draftFailed) return draftFailed;

  const activity = await environment.readActivity();
  const draft = [...activity.drafts].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const current = problem.claims.find((claim) => claim.is_current) ?? null;
  return ok({
    draft: draft
      ? { draft_id: draft.id, payload_root: draft.payloadRoot, version: draft.version }
      : null,
    schema: "vela.submission.v3",
    signing_state: "unsigned",
    server_held_key: false,
    requested_change: input.requested_change,
    target_claim: targetsExistingClaim
      ? { claim_id: problem.current_claim_id, standing_before: current?.standing ?? null }
      : null,
    standing_after_this_call: current?.standing ?? null,
    ...NON_AUTHORITATIVE,
    what_happens_next: [
      "A human reviews the draft in the Work section of this Problem.",
      "They download it and sign it locally with a key this application never sees.",
      "They submit the signed Submission to the Vela Repository.",
      "Verification runs, and an authorised Decision accepts or rejects it.",
      "Only that Decision moves Standing, and only then does this page change.",
    ],
  });
}

export async function inspectCandidate(
  environment: ToolEnvironment,
  input: { draft_id?: string },
): Promise<ToolResult> {
  const blocked = requireWorkspace(environment);
  if (blocked) return blocked;
  const activity = await environment.readActivity();
  const drafts = input.draft_id
    ? activity.drafts.filter((draft) => draft.id === input.draft_id)
    : activity.drafts;
  if (input.draft_id && !drafts.length) {
    return failure(
      "draft_not_found",
      `No unsigned draft with id ${input.draft_id} exists in this Workspace.`,
      "Call inspect_candidate with no argument to list the drafts that do exist.",
    );
  }
  const current = environment.problem.claims.find((claim) => claim.is_current) ?? null;
  return ok({
    candidates: drafts.map((draft) => ({
      draft_id: draft.id,
      payload_root: draft.payloadRoot,
      version: draft.version,
      created_at: draft.createdAt,
      signing_state: "unsigned",
      export_href: `/drafts/${draft.id}/export?workspace=${environment.work.workspaceId}`,
    })),
    current_standing: current ? { claim_id: current.id, standing: current.standing } : null,
    boundary_note:
      "These are candidates, not Decisions. Standing is unchanged while they sit "
      + "here, and it stays unchanged until a signed Submission is decided in the "
      + "Vela Repository by an authority this application does not hold.",
  });
}
