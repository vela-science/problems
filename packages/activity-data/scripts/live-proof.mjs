import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import {
  addDiscussionEntry,
  attachArtifact,
  commandRequestRoot,
  createApproach,
  createAttempt,
  createSubmissionDraftExport,
  createWorkspace,
  ensureCurrentAccount,
  exportSubmissionDraft,
  followProblem,
  forkApproach,
  getProblemActivity,
  saveSubmissionDraft,
  scientificAnchorRoot,
  updateAttempt,
} from "../src/index.ts";
import { canonicalJson, sha256 } from "@vela/observatory-data/canonical";
import { observatoryProjectionReaderIdentity } from "@vela/observatory-data/projection-reader";

const appUrl = process.env.VELA_ACTIVITY_DATABASE_URL;
const migratorUrl = process.env.VELA_ACTIVITY_MIGRATOR_DATABASE_URL;
const projectionUrl = process.env.VELA_PROJECTION_DATABASE_URL;
if (!appUrl || !migratorUrl || !projectionUrl) {
  throw new Error("live proof requires activity app, activity migrator, and Observatory reader URLs");
}

const appSql = neon(appUrl);
const migratorSql = neon(migratorUrl);
const projectionSql = neon(projectionUrl);
const [projectionIdentity] = await projectionSql.query(
  `SELECT current_database() AS database, current_user AS role,
     pg_has_role(current_user, $1, 'MEMBER') AS permission_member,
     (SELECT rolinherit FROM pg_roles WHERE rolname = current_user) AS inherits_privileges`,
  [observatoryProjectionReaderIdentity.permissionRole],
);
if (
  projectionIdentity?.database !== observatoryProjectionReaderIdentity.database
  || projectionIdentity?.role !== observatoryProjectionReaderIdentity.loginRole
  || !projectionIdentity.permission_member
  || !projectionIdentity.inherits_privileges
) {
  throw new Error(`live proof received an unexpected Observatory reader identity: ${JSON.stringify(projectionIdentity)}`);
}
const suffix = Date.now().toString(36);
const root = (value) => `sha256:${value.repeat(64)}`;
const command = () => ({ idempotencyKey: randomUUID() });

async function denied(promise, label) {
  try {
    await promise;
  } catch {
    return true;
  }
  throw new Error(`${label} did not fail closed`);
}

async function ownerTransaction(statements) {
  return migratorSql.transaction((transaction) => [
    transaction.query("SET LOCAL ROLE vela_activity_owner"),
    ...statements(transaction),
  ]);
}

const preEnableCountResults = await ownerTransaction((transaction) => [transaction.query(
  "SELECT count(*)::integer AS bound_approaches FROM activity.approaches WHERE target_id IS NOT NULL",
)]);
const preEnableBoundApproaches = Number(preEnableCountResults.at(-1)?.[0]?.bound_approaches);
if (preEnableBoundApproaches !== 0) {
  throw new Error(`Target-bound write enablement requires zero existing bound rows, found ${preEnableBoundApproaches}`);
}

async function standingSnapshot() {
  const [current] = await projectionSql.query(
    "SELECT release_root FROM observatory.current_release",
  );
  const rows = await projectionSql.query(
    `SELECT repository_id, claim_id, claim_root, standing
     FROM observatory.claims WHERE release_root=$1 ORDER BY repository_id, claim_id`,
    [current.release_root],
  );
  return { releaseRoot: current.release_root, count: rows.length, root: sha256(canonicalJson(rows)) };
}

const standingBefore = await standingSnapshot();
const accountA = await ensureCurrentAccount({
  workosUserId: `user_liveproofa${suffix}`,
  displayName: "Live proof A",
  email: `liveproof-a-${suffix}@example.invalid`,
});
const accountB = await ensureCurrentAccount({
  workosUserId: `user_liveproofb${suffix}`,
  displayName: "Live proof B",
  email: `liveproof-b-${suffix}@example.invalid`,
});
const workspaceA = await createWorkspace(accountA.id, {
  slug: `live-proof-a-${suffix}`,
  name: "Live proof A",
}, command());
const workspaceB = await createWorkspace(accountB.id, {
  slug: `live-proof-b-${suffix}`,
  name: "Live proof B",
}, command());
const contextA = { accountId: accountA.id, workspaceId: workspaceA.id };
const anchor = {
  projectionReleaseRoot: standingBefore.releaseRoot,
  repositoryId: "8115c538-7688-40b7-ab75-3c4765bf3c19",
  repositoryRoot: root("1"),
  sourceCommit: "2".repeat(40),
  sourceTree: "3".repeat(40),
  problemId: "erdos:321",
  problemRecordRoot: root("4"),
  sourceObservationRoot: root("5"),
  claimId: null,
  claimRoot: null,
  claimStanding: null,
};
const currentAnchorRoot = scientificAnchorRoot(anchor);
const commandAnchor = {
  root: currentAnchorRoot,
  projection_release_root: anchor.projectionReleaseRoot,
  repository_id: anchor.repositoryId,
  repository_root: anchor.repositoryRoot,
  source_commit: anchor.sourceCommit,
  source_tree: anchor.sourceTree,
  problem_id: anchor.problemId,
  problem_record_root: anchor.problemRecordRoot,
  source_observation_root: anchor.sourceObservationRoot,
  claim_id: anchor.claimId,
  claim_root: anchor.claimRoot,
  claim_standing: anchor.claimStanding,
};

await denied(
  getProblemActivity({
    accountId: accountB.id,
    workspaceId: workspaceA.id,
    repositoryId: anchor.repositoryId,
    problemId: anchor.problemId,
    currentAnchorRoot,
  }),
  "cross-tenant activity read",
);
await denied(
  createApproach({ accountId: accountB.id, workspaceId: workspaceA.id }, {
    anchor,
    title: "Cross-tenant write must fail",
    summary: "A non-member cannot create activity in another Workspace.",
  }, command()),
  "cross-tenant activity write",
);

const approachCommand = command();
const approach = await createApproach(contextA, {
  anchor,
  title: "Live proof approach",
  summary: "A bounded integration proof for tenant and activity semantics.",
}, approachCommand);
const retriedApproach = await createApproach(contextA, {
  anchor,
  title: "Live proof approach",
  summary: "A bounded integration proof for tenant and activity semantics.",
}, approachCommand);
if (approach.id !== retriedApproach.id) throw new Error("idempotent retry returned a different resource");
await denied(createApproach(contextA, {
  anchor,
  title: "Changed request",
  summary: "The same idempotency key must reject changed bytes.",
}, approachCommand), "idempotency key reuse");

const boundTarget = {
  kind: "target",
  targetId: `erdos:321:live-proof:${suffix}`,
  targetPacketRoot: root("8"),
  targetRecordRoot: null,
};
const boundTitle = "Live proof Target-bound approach";
const boundSummary = "Exact Target packet provenance with no authority effect.";
const boundPayload = {
  anchor: commandAnchor,
  title: boundTitle,
  summary: boundSummary,
  target_id: boundTarget.targetId,
  target_packet_root: boundTarget.targetPacketRoot,
  target_record_root: null,
};
const boundRequestRoot = commandRequestRoot("approach.create", boundPayload);
const boundCommand = command();
const boundApproach = await createApproach(contextA, {
  anchor,
  title: boundTitle,
  summary: boundSummary,
  target: boundTarget,
}, boundCommand);
if (
  boundApproach.target_id !== boundTarget.targetId
  || boundApproach.target_packet_root !== boundTarget.targetPacketRoot
  || boundApproach.target_record_root !== null
  || boundApproach.authority_effect !== "none"
) {
  throw new Error(`Target-bound create returned inexact provenance: ${JSON.stringify(boundApproach)}`);
}
const retriedBoundApproach = await createApproach(contextA, {
  anchor,
  title: boundTitle,
  summary: boundSummary,
  target: boundTarget,
}, boundCommand);
if (retriedBoundApproach.id !== boundApproach.id) {
  throw new Error("exact Target-bound retry returned a different resource");
}
const changedBoundTarget = { ...boundTarget, targetPacketRoot: root("9") };
const changedBoundRequestRoot = commandRequestRoot("approach.create", {
  ...boundPayload,
  target_packet_root: changedBoundTarget.targetPacketRoot,
});
if (changedBoundRequestRoot === boundRequestRoot) {
  throw new Error("changed Target packet did not change the command request root");
}
await denied(createApproach(contextA, {
  anchor,
  title: boundTitle,
  summary: boundSummary,
  target: changedBoundTarget,
}, boundCommand), "Target-bound packet and request-root change");

await denied(createApproach({ accountId: accountB.id, workspaceId: workspaceA.id }, {
  anchor,
  title: "Cross-tenant Target-bound write must fail",
  summary: "A non-member cannot retain Target provenance in another Workspace.",
  target: boundTarget,
}, command()), "cross-tenant Target-bound activity write");
await denied(getProblemActivity({
  accountId: accountB.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot,
}), "cross-tenant Target-bound activity read");

const forkTitle = "Live proof Target-bound fork";
const forkSummary = "The immutable exact Target binding must be inherited.";
const forkExpectedVersion = Number(boundApproach.version);
const forkRequestRoot = commandRequestRoot("approach.fork", {
  source_approach_id: boundApproach.id,
  title: forkTitle,
  summary: forkSummary,
}, forkExpectedVersion);
const boundFork = await forkApproach(contextA, {
  sourceApproachId: String(boundApproach.id),
  expectedVersion: forkExpectedVersion,
  title: forkTitle,
  summary: forkSummary,
}, command());
if (
  boundFork.parent_approach_id !== boundApproach.id
  || boundFork.target_id !== boundTarget.targetId
  || boundFork.target_packet_root !== boundTarget.targetPacketRoot
  || boundFork.target_record_root !== null
  || boundFork.authority_effect !== "none"
) {
  throw new Error(`Target-bound fork changed immutable provenance: ${JSON.stringify(boundFork)}`);
}

const boundReadView = await getProblemActivity({
  accountId: accountA.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot,
});
for (const id of [boundApproach.id, boundFork.id]) {
  const retained = boundReadView.approaches.find((entry) => entry.id === id);
  if (
    retained?.target.kind !== "target"
    || retained.target.targetId !== boundTarget.targetId
    || retained.target.targetPacketRoot !== boundTarget.targetPacketRoot
    || retained.target.targetRecordRoot !== null
    || retained.authorityEffect !== "none"
  ) {
    throw new Error(`Target-bound read lost exact provenance for ${id}`);
  }
}

const attempt = await createAttempt(contextA, {
  approachId: String(approach.id),
  provider: "provider-neutral-live-proof",
  title: "Live proof attempt",
  executionBinding: null,
}, command());
await updateAttempt(
  contextA,
  String(attempt.id),
  Number(attempt.version),
  { state: "running" },
  command(),
);
await denied(updateAttempt(
  contextA,
  String(attempt.id),
  Number(attempt.version),
  { state: "completed" },
  command(),
), "optimistic version conflict");

await addDiscussionEntry(contextA, {
  anchor,
  kind: "note",
  visibility: "private",
  body: "Only the author may read this private note.",
}, command());
await ownerTransaction((transaction) => [transaction.query(
  "INSERT INTO activity.workspace_memberships (workspace_id, account_id, role) VALUES ($1::uuid,$2::uuid,'member')",
  [workspaceA.id, accountB.id],
)]);
const memberView = await getProblemActivity({
  accountId: accountB.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot,
});
if (memberView.discussion.length !== 0) throw new Error("private note crossed its author boundary");
await ownerTransaction((transaction) => [transaction.query(
  "DELETE FROM activity.workspace_memberships WHERE workspace_id=$1::uuid AND account_id=$2::uuid",
  [workspaceA.id, accountB.id],
)]);
await denied(getProblemActivity({
  accountId: accountB.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot,
}), "removed member read");

const artifact = await attachArtifact(contextA, {
  anchor,
  attemptId: String(attempt.id),
  executionBinding: null,
  contentRoot: root("6"),
  metadataRoot: root("7"),
  kind: "proof",
  path: "artifacts/live-proof.json",
  mediaType: "application/json",
  byteSize: 42,
  locator: "file:artifacts/live-proof.json",
}, command());

const historicalAnchor = {
  ...anchor,
  projectionReleaseRoot: root("b"),
  repositoryRoot: root("c"),
};
const historicalAnchorRoot = scientificAnchorRoot(historicalAnchor);
await followProblem(contextA, { anchor: historicalAnchor, following: true }, command());
const currentBeforeFollow = await getProblemActivity({
  accountId: accountA.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot,
});
if (currentBeforeFollow.following) throw new Error("historical follow was promoted to current-anchor following");
const historicalFollowView = await getProblemActivity({
  accountId: accountA.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot: historicalAnchorRoot,
});
if (!historicalFollowView.following) throw new Error("historical anchor follow was not returned by its exact root");
await followProblem(contextA, { anchor, following: true }, command());
const currentFollowView = await getProblemActivity({
  accountId: accountA.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot,
});
if (!currentFollowView.following) throw new Error("current anchor follow was not returned");
await followProblem(contextA, { anchor, following: false }, command());
const currentAfterUnfollow = await getProblemActivity({
  accountId: accountA.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot,
});
if (currentAfterUnfollow.following) throw new Error("current unfollow retained historical following as current");
const historicalAfterCurrentUnfollow = await getProblemActivity({
  accountId: accountA.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot: historicalAnchorRoot,
});
if (!historicalAfterCurrentUnfollow.following) throw new Error("current unfollow erased historical following");

const payload = {
  schema: "vela.submission.v2",
  identity: {
    schema: "vela.signer-identity.v1",
    actor_id: "agent:live-proof",
    actor_class: "agent",
    public_key_hex: "8".repeat(64),
    declared_at: "2026-08-11T00:00:00Z",
  },
  claim: { assertion: "Live integration proof only", type: "computational", conditions: [] },
  artifacts: [{ kind: "proof", path: "artifacts/live-proof.json", digest: root("6") }],
  caveats: ["This is a disposable hosted activity proof."],
  replayability: "exact",
  producer_checks: [{ method: "live role matrix", outcome: "pass", authority: "producer_reported" }],
  verification_requirements: ["Independent review before any repository action"],
  requested_change: { kind: "add_claim" },
  provenance: {
    producer: "agent:live-proof",
    source_system: "vela-web live activity proof",
    source_run: suffix,
    emitted_at: "2026-08-11T00:00:00Z",
  },
};
const expectedExport = createSubmissionDraftExport(payload);
const draft = await saveSubmissionDraft(contextA, {
  anchor,
  artifactId: String(artifact.id),
  payload,
}, command());
const exported = await exportSubmissionDraft(contextA, String(draft.id));
if (exported.payloadRoot !== expectedExport.payloadRoot) throw new Error("draft export changed canonical payload bytes");
await denied(
  exportSubmissionDraft({ accountId: accountB.id, workspaceId: workspaceA.id }, String(draft.id)),
  "unsigned draft export without membership",
);

await denied(appSql.query("SELECT count(*) FROM activity.accounts"), "app base-table read");
await denied(appSql.query("UPDATE activity.activity_audit_entries SET operation=operation"), "audit mutation");
const observatoryUrl = new URL(appUrl);
observatoryUrl.pathname = "/vela_observatory";
await denied(neon(observatoryUrl.toString()).query(
  "UPDATE observatory.current_release SET confirmed_at=confirmed_at",
), "activity role Observatory write");

const catalogResults = await ownerTransaction((transaction) => [transaction.query(`SELECT
  count(*) FILTER (WHERE column_name ~* '(private|signing|authority).*key|seed')::integer AS authority_secret_columns,
  count(*) FILTER (WHERE data_type='bytea')::integer AS byte_columns
  FROM information_schema.columns WHERE table_schema='activity'`)]);
const catalogRows = catalogResults.at(-1);
const catalog = catalogRows?.[0];
if (!catalog) throw new Error("activity catalog probe returned no row");
if (Number(catalog.authority_secret_columns) !== 0 || Number(catalog.byte_columns) !== 0) {
  throw new Error(`activity catalog authority/byte boundary failed: ${JSON.stringify(catalog)}`);
}
const activity = await getProblemActivity({
  accountId: accountA.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot,
});
const approachAudits = activity.audit.filter(
  (entry) => entry.operation === "approach.create" && entry.subjectId === approach.id,
);
if (approachAudits.length !== 1) throw new Error("idempotent retry appended a duplicate audit entry");
const boundAudits = activity.audit.filter(
  (entry) => entry.operation === "approach.create" && entry.subjectId === boundApproach.id,
);
if (boundAudits.length !== 1 || boundAudits[0]?.requestRoot !== boundRequestRoot) {
  throw new Error("Target-bound create audit did not retain the exact request root once");
}
const forkAudits = activity.audit.filter(
  (entry) => entry.operation === "approach.fork" && entry.subjectId === boundFork.id,
);
if (forkAudits.length !== 1 || forkAudits[0]?.requestRoot !== forkRequestRoot) {
  throw new Error("Target-bound fork audit did not retain the exact request root once");
}
const standingAfter = await standingSnapshot();
if (canonicalJson(standingAfter) !== canonicalJson(standingBefore)) {
  throw new Error("activity proof changed Observatory Standing");
}

console.log(JSON.stringify({
  ok: true,
  schema: "vela.activity-live-proof.v1",
  workspaceA: workspaceA.id,
  workspaceB: workspaceB.id,
  accountA: accountA.id,
  accountB: accountB.id,
  activityCounts: {
    approaches: activity.approaches.length,
    targetBoundApproaches: activity.approaches.filter((entry) => entry.target.kind === "target").length,
    attempts: activity.attempts.length,
    privateDiscussionForAuthor: activity.discussion.length,
    artifacts: activity.artifacts.length,
    drafts: activity.drafts.length,
    audit: activity.audit.length,
  },
  payloadRoot: exported.payloadRoot,
  standing: standingAfter,
  crossTenantDenied: true,
  crossTenantWriteDenied: true,
  crossTenantTargetBoundReadDenied: true,
  crossTenantTargetBoundWriteDenied: true,
  unsignedExportDenied: true,
  removedMemberDenied: true,
  privateNoteIsolated: true,
  idempotencyProved: true,
  targetBoundIdempotencyAndAuditProved: true,
  targetBoundForkInheritanceProved: true,
  preEnableBoundApproaches,
  optimisticVersioningProved: true,
  exactAnchorFollowingProved: true,
  appBaseTablesDenied: true,
  observatoryWriteDenied: true,
  authoritySecretColumns: 0,
  artifactByteColumns: 0,
}));
