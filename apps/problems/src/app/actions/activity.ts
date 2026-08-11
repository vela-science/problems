"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addDiscussionEntry,
  attachArtifact,
  createApproach,
  createAttempt,
  createWorkspace,
  ensureCurrentAccount,
  followProblem,
  forkApproach,
  saveSubmissionDraft,
  createWorkRequest,
  updateAttempt,
  type ScientificAnchor,
  type VelaSubmissionV2,
} from "@vela/activity-data";
import { currentHostedAccount } from "@/lib/auth";
import { scientificProblemState } from "@/lib/scientific-state";

function text(form: FormData, name: string, max = 16_384): string {
  const value = form.get(name);
  if (typeof value !== "string") throw new Error(`${name} is required`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) throw new Error(`${name} is invalid`);
  return trimmed;
}

function optionalText(form: FormData, name: string, max = 16_384): string | null {
  const value = form.get(name);
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error(`${name} is invalid`);
  return trimmed;
}

function expectedVersion(form: FormData): number {
  const value = Number(text(form, "expectedVersion", 24));
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("expectedVersion is invalid");
  return value;
}

function route(form: FormData): { repository: string; problem: string; workspaceId: string } {
  const repository = text(form, "repository", 64);
  const problem = text(form, "problem", 64);
  const workspaceId = text(form, "workspaceId", 64);
  return { repository, problem, workspaceId };
}

async function actor() {
  const hosted = await currentHostedAccount();
  if (!hosted) redirect("/sign-in");
  return ensureCurrentAccount({
    workosUserId: hosted.id,
    displayName: hosted.displayName,
    email: hosted.email,
  });
}

async function mutationContext(form: FormData) {
  const account = await actor();
  const target = route(form);
  const state = await scientificProblemState(target.repository, target.problem);
  if (!state) throw new Error("The exact Problem no longer exists");
  return {
    account,
    target,
    context: { accountId: account.id, workspaceId: target.workspaceId },
    anchor: state.anchor as ScientificAnchor,
    command: { idempotencyKey: text(form, "idempotencyKey", 128) },
  };
}

function returnTo(repository: string, problem: string, workspaceId: string): string {
  return `/p/${repository}/${problem}?mode=work&workspace=${encodeURIComponent(workspaceId)}`;
}

function refresh(repository: string, problem: string) {
  revalidatePath(`/p/${repository}/${problem}`);
}

export async function createWorkspaceAction(form: FormData) {
  const account = await actor();
  const repository = text(form, "repository", 64);
  const problem = text(form, "problem", 64);
  const workspace = await createWorkspace(account.id, {
    slug: text(form, "slug", 64),
    name: text(form, "name", 160),
  }, { idempotencyKey: text(form, "idempotencyKey", 128) });
  redirect(returnTo(repository, problem, workspace.id));
}

export async function followProblemAction(form: FormData) {
  const scope = await mutationContext(form);
  await followProblem(scope.context, { anchor: scope.anchor, following: text(form, "following", 5) === "true" }, scope.command);
  refresh(scope.target.repository, scope.target.problem);
}

export async function createApproachAction(form: FormData) {
  const scope = await mutationContext(form);
  await createApproach(scope.context, {
    anchor: scope.anchor,
    title: text(form, "title", 200),
    summary: text(form, "summary"),
  }, scope.command);
  refresh(scope.target.repository, scope.target.problem);
}

export async function forkApproachAction(form: FormData) {
  const scope = await mutationContext(form);
  await forkApproach(scope.context, {
    sourceApproachId: text(form, "approachId", 64),
    expectedVersion: expectedVersion(form),
    title: optionalText(form, "title", 200) ?? undefined,
    summary: optionalText(form, "summary") ?? undefined,
  }, scope.command);
  refresh(scope.target.repository, scope.target.problem);
}

export async function createAttemptAction(form: FormData) {
  const scope = await mutationContext(form);
  await createAttempt(scope.context, {
    approachId: text(form, "approachId", 64),
    provider: text(form, "provider", 100),
    title: text(form, "title", 200),
    externalSessionId: optionalText(form, "externalSessionId", 500),
    locator: optionalText(form, "locator", 2_000),
  }, scope.command);
  refresh(scope.target.repository, scope.target.problem);
}

export async function updateAttemptAction(form: FormData) {
  const scope = await mutationContext(form);
  await updateAttempt(scope.context, text(form, "attemptId", 64), expectedVersion(form), {
    state: text(form, "state", 24) as "planned" | "running" | "paused" | "completed" | "failed" | "abandoned",
  }, scope.command);
  refresh(scope.target.repository, scope.target.problem);
}

export async function addDiscussionAction(form: FormData) {
  const scope = await mutationContext(form);
  await addDiscussionEntry(scope.context, {
    anchor: scope.anchor,
    approachId: optionalText(form, "approachId", 64),
    attemptId: optionalText(form, "attemptId", 64),
    kind: text(form, "kind", 16) as "comment" | "note",
    visibility: text(form, "visibility", 16) as "workspace" | "private",
    body: text(form, "body"),
  }, scope.command);
  refresh(scope.target.repository, scope.target.problem);
}

export async function createWorkRequestAction(form: FormData) {
  const scope = await mutationContext(form);
  await createWorkRequest(scope.context, {
    anchor: scope.anchor,
    approachId: optionalText(form, "approachId", 64),
    attemptId: optionalText(form, "attemptId", 64),
    kind: text(form, "kind", 24) as "assignment" | "reproduction",
    title: text(form, "title", 200),
    detail: text(form, "detail"),
    assigneeAccountId: optionalText(form, "assigneeAccountId", 64),
  }, scope.command);
  refresh(scope.target.repository, scope.target.problem);
}

export async function attachArtifactAction(form: FormData) {
  const scope = await mutationContext(form);
  const byteSizeValue = optionalText(form, "byteSize", 32);
  const byteSize = byteSizeValue === null ? null : Number(byteSizeValue);
  if (byteSize !== null && (!Number.isSafeInteger(byteSize) || byteSize < 0)) throw new Error("byteSize is invalid");
  await attachArtifact(scope.context, {
    anchor: scope.anchor,
    attemptId: optionalText(form, "attemptId", 64),
    contentRoot: text(form, "contentRoot", 71) as `sha256:${string}`,
    kind: text(form, "kind", 100),
    path: text(form, "path", 2_000),
    mediaType: optionalText(form, "mediaType", 200),
    byteSize,
    locator: optionalText(form, "locator", 2_000),
    metadataRoot: optionalText(form, "metadataRoot", 71) as `sha256:${string}` | null,
  }, scope.command);
  refresh(scope.target.repository, scope.target.problem);
}

export async function saveSubmissionDraftAction(form: FormData) {
  const scope = await mutationContext(form);
  const producer = text(form, "actorId", 200);
  if (!producer.startsWith("agent:")) throw new Error("Vela actor ID must use the agent: namespace");
  const requestedKind = text(form, "requestedChange", 32) as VelaSubmissionV2["requested_change"]["kind"];
  const payload: VelaSubmissionV2 = {
    schema: "vela.submission.v2",
    identity: {
      schema: "vela.signer-identity.v1",
      actor_id: producer,
      actor_class: "agent",
      public_key_hex: text(form, "publicKey", 64),
      declared_at: new Date().toISOString(),
    },
    claim: {
      assertion: text(form, "assertion"),
      type: text(form, "claimType", 32) as VelaSubmissionV2["claim"]["type"],
      conditions: optionalText(form, "condition") ? [text(form, "condition")] : [],
    },
    artifacts: [{ kind: text(form, "artifactKind", 100), path: text(form, "artifactPath", 2_000), digest: text(form, "artifactRoot", 71) as `sha256:${string}` }],
    caveats: [text(form, "caveat")],
    replayability: text(form, "replayability", 24) as VelaSubmissionV2["replayability"],
    producer_checks: [{ method: text(form, "checkMethod", 200), outcome: text(form, "checkOutcome", 16) as "pass" | "fail" | "error" | "skipped" | "unknown", authority: "producer_reported" }],
    verification_requirements: [text(form, "verificationRequirement")],
    requested_change: requestedKind === "add_claim" ? { kind: "add_claim" } : {
      kind: requestedKind as "correct_claim" | "supersede_claim" | "retract_claim",
      target: {
        claim_id: scope.anchor.claimId ?? text(form, "targetClaimId", 68),
        claim_root: scope.anchor.claimRoot ?? text(form, "targetClaimRoot", 71) as `sha256:${string}`,
      },
    },
    provenance: {
      producer,
      source_system: "problems.science local-signing handoff",
      source_run: optionalText(form, "attemptId", 64) ?? undefined,
      emitted_at: new Date().toISOString(),
    },
  };
  await saveSubmissionDraft(scope.context, { anchor: scope.anchor, payload }, scope.command);
  refresh(scope.target.repository, scope.target.problem);
}
