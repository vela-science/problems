"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addDiscussionEntry,
  appendWorkspaceCrdtUpdate,
  attachArtifact,
  createApproach,
  createAttempt,
  createWorkspace,
  ensureCurrentAccount,
  followProblem,
  forkApproach,
  getProblemActivity,
  listWorkspaces,
  saveSubmissionDraft,
  scientificAnchorRoot,
  updateAttempt,
  type ScientificAnchor,
  type VelaSubmissionV2,
} from "@vela/activity-data";
import { currentAccount } from "@/lib/auth";
import { publicProblemPath, publicProblemWorkspacePath } from "@/lib/problem-routes";
import { scientificProblemState } from "@/lib/scientific-state";
import {
  requireCurrentApproach,
  requireCurrentArtifact,
  requireCurrentAttempt,
  requireExpectedAnchorRoot,
  safeWorkspaceErrorCode,
} from "@/app/actions/workspace-mutation-guard";

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
  const hosted = await currentAccount();
  if (!hosted) redirect("/sign-in");
  return ensureCurrentAccount({
    workosUserId: hosted.id,
    displayName: hosted.displayName,
    email: hosted.email,
  });
}

async function mutationContext(form: FormData) {
  const target = route(form);
  const expectedAnchorRoot = text(form, "expectedAnchorRoot", 71);
  const state = await scientificProblemState(target.repository, target.problem);
  if (!state) throw new Error("The exact Problem no longer exists");
  const anchor = state.anchor as ScientificAnchor;
  const anchorRoot = scientificAnchorRoot(anchor);
  try {
    requireExpectedAnchorRoot(anchorRoot, expectedAnchorRoot);
  } catch (error) {
    const errorCode = safeWorkspaceErrorCode(error);
    if (errorCode) {
      redirect(`${returnTo(target.repository, target.problem, target.workspaceId)}&workError=${errorCode}`);
    }
    throw error;
  }
  const account = await actor();
  return {
    account,
    target,
    context: { accountId: account.id, workspaceId: target.workspaceId },
    anchor,
    anchorRoot,
    state,
    command: { idempotencyKey: text(form, "idempotencyKey", 128) },
  };
}

/* A Problem this release cannot address has nowhere to send a reader back to,
   and there is no honest substitute — `/problems` is a different page, not the
   one they were working in. The mutation still succeeded; the caller stays
   where it is. */
function returnTo(repository: string, problem: string, workspaceId: string): string | null {
  return publicProblemWorkspacePath(repository, problem, workspaceId);
}

function refresh(repository: string, problem: string) {
  const path = publicProblemPath(repository, problem);
  if (path) revalidatePath(path);
}

type MutationScope = Awaited<ReturnType<typeof mutationContext>>;

async function problemActivity(scope: MutationScope) {
  return getProblemActivity({
    accountId: scope.account.id,
    workspaceId: scope.target.workspaceId,
    repositoryId: scope.anchor.repositoryId,
    problemId: scope.anchor.problemId,
    currentAnchorRoot: scope.anchorRoot,
  });
}

async function runWorkspaceMutation(scope: MutationScope, operation: () => Promise<unknown>) {
  let errorCode: ReturnType<typeof safeWorkspaceErrorCode> = null;
  try {
    await operation();
  } catch (error) {
    errorCode = safeWorkspaceErrorCode(error);
    if (!errorCode) throw error;
  }
  if (errorCode) {
    redirect(`${returnTo(scope.target.repository, scope.target.problem, scope.target.workspaceId)}&workError=${errorCode}`);
  }
  refresh(scope.target.repository, scope.target.problem);
}

export async function createWorkspaceAction(form: FormData) {
  const account = await actor();
  const repository = text(form, "repository", 64);
  const problem = text(form, "problem", 64);
  const state = await scientificProblemState(repository, problem);
  if (!state) throw new Error("The exact Problem no longer exists");
  const anchor = state.anchor as ScientificAnchor;
  const anchorRoot = scientificAnchorRoot(anchor);
  const slug = text(form, "slug", 64);
  const name = text(form, "name", 160);
  const existing = (await listWorkspaces(account.id)).find((workspace) => workspace.slug === slug);
  if (existing && existing.name !== name) {
    throw new Error("A Workspace with that slug already exists");
  }
  const workspace = existing ?? await createWorkspace(account.id, {
    slug,
    name,
  }, { idempotencyKey: text(form, "idempotencyKey", 128) });
  await followProblem(
    { accountId: account.id, workspaceId: workspace.id },
    { anchor, following: true },
    { idempotencyKey: `${workspace.id}:${anchorRoot}` },
  );
  refresh(repository, problem);
  const destination = returnTo(repository, problem, workspace.id);
  if (destination) redirect(destination);
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
  const sourceApproachId = text(form, "approachId", 64);
  const sourceVersion = expectedVersion(form);
  await runWorkspaceMutation(scope, async () => {
    requireCurrentApproach(await problemActivity(scope), sourceApproachId, scope.anchorRoot, sourceVersion);
    return forkApproach(scope.context, {
      sourceApproachId,
      expectedVersion: sourceVersion,
      title: optionalText(form, "title", 200) ?? undefined,
      summary: optionalText(form, "summary") ?? undefined,
    }, scope.command);
  });
}

export async function createAttemptAction(form: FormData) {
  const scope = await mutationContext(form);
  const approachId = text(form, "approachId", 64);
  await runWorkspaceMutation(scope, async () => {
    const activity = await problemActivity(scope);
    requireCurrentApproach(activity, approachId, scope.anchorRoot);
    return createAttempt(scope.context, {
      approachId,
      title: text(form, "title", 200),
    }, scope.command);
  });
}

export async function updateAttemptAction(form: FormData) {
  const scope = await mutationContext(form);
  const attemptId = text(form, "attemptId", 64);
  const version = expectedVersion(form);
  await runWorkspaceMutation(scope, async () => {
    requireCurrentAttempt(await problemActivity(scope), attemptId, scope.anchorRoot, version);
    return updateAttempt(scope.context, attemptId, version, {
      state: text(form, "state", 24) as "planned" | "running" | "paused" | "completed" | "failed" | "abandoned",
    }, scope.command);
  });
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

export async function appendWorkspaceCrdtUpdateAction(form: FormData) {
  const scope = await mutationContext(form);
  await runWorkspaceMutation(scope, () => appendWorkspaceCrdtUpdate(scope.context, {
    anchor: scope.anchor,
    documentName: "canvas",
    updateRoot: text(form, "updateRoot", 71) as `sha256:${string}`,
    updateBase64: text(form, "updateBase64", 400_000),
  }, scope.command));
}

export async function attachArtifactAction(form: FormData) {
  const scope = await mutationContext(form);
  const attemptId = text(form, "attemptId", 64);
  const byteSizeValue = optionalText(form, "byteSize", 32);
  const byteSize = byteSizeValue === null ? null : Number(byteSizeValue);
  if (byteSize !== null && (!Number.isSafeInteger(byteSize) || byteSize < 0)) throw new Error("byteSize is invalid");
  await runWorkspaceMutation(scope, async () => {
    const activity = await problemActivity(scope);
    requireCurrentAttempt(activity, attemptId, scope.anchorRoot);
    return attachArtifact(scope.context, {
      anchor: scope.anchor,
      attemptId,
      contentRoot: text(form, "contentRoot", 71) as `sha256:${string}`,
      kind: text(form, "kind", 100),
      path: text(form, "path", 2_000),
      mediaType: optionalText(form, "mediaType", 200),
      byteSize,
      locator: optionalText(form, "locator", 2_000),
      metadataRoot: optionalText(form, "metadataRoot", 71) as `sha256:${string}` | null,
    }, scope.command);
  });
}

export async function saveSubmissionDraftAction(form: FormData) {
  const scope = await mutationContext(form);
  const producer = text(form, "actorId", 200);
  if (!producer.startsWith("agent:")) throw new Error("Vela actor ID must use the agent: namespace");
  const requestedKind = text(form, "requestedChange", 32) as VelaSubmissionV2["requested_change"]["kind"];
  const researchBlockId = text(form, "researchBlockId", 64);
  const activity = await problemActivity(scope);
  const artifact = requireCurrentArtifact(activity, researchBlockId, scope.anchorRoot);
  const emittedAt = new Date().toISOString().replace(/\.\d{3}Z$/u, "Z");
  const payload: VelaSubmissionV2 = {
    schema: "vela.submission.v2",
    identity: {
      schema: "vela.signer-identity.v1",
      actor_id: producer,
      actor_class: "agent",
      public_key_hex: text(form, "publicKey", 64),
      declared_at: emittedAt,
    },
    claim: {
      assertion: text(form, "assertion"),
      type: text(form, "claimType", 32) as VelaSubmissionV2["claim"]["type"],
      conditions: optionalText(form, "condition") ? [text(form, "condition")] : [],
    },
    artifacts: [{ kind: artifact.kind, path: artifact.path, digest: artifact.contentRoot }],
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
      emitted_at: emittedAt,
    },
  };
  /* Naming a draft revises it under its version guard; omitting one creates
     it. Both branches existed in SQL from the start — the form simply never
     named the draft, so every save minted a sibling. */
  const draftId = optionalText(form, "draftId", 64);
  const expectedVersion = draftId ? Number(text(form, "expectedVersion", 16)) : undefined;
  await runWorkspaceMutation(scope, () => saveSubmissionDraft(scope.context, {
    anchor: scope.anchor,
    payload,
    draftId: draftId ?? undefined,
  }, scope.command, expectedVersion));
}
