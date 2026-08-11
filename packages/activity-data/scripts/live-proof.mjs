import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import {
  addDiscussionEntry,
  attachArtifact,
  createApproach,
  createAttempt,
  createSubmissionDraftExport,
  createWorkspace,
  ensureCurrentAccount,
  exportSubmissionDraft,
  getProblemActivity,
  saveSubmissionDraft,
  updateAttempt,
} from "../src/index.ts";
import { canonicalJson, sha256 } from "@vela/observatory-data/canonical";

const appUrl = process.env.VELA_ACTIVITY_DATABASE_URL;
const migratorUrl = process.env.VELA_ACTIVITY_MIGRATOR_DATABASE_URL;
const projectionUrl = process.env.VELA_PROJECTION_DATABASE_URL;
if (!appUrl || !migratorUrl || !projectionUrl) {
  throw new Error("live proof requires activity app, activity migrator, and Observatory reader URLs");
}

const appSql = neon(appUrl);
const migratorSql = neon(migratorUrl);
const projectionSql = neon(projectionUrl);
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

await denied(
  getProblemActivity({
    accountId: accountB.id,
    workspaceId: workspaceA.id,
    repositoryId: anchor.repositoryId,
    problemId: anchor.problemId,
  }),
  "cross-tenant activity read",
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

const attempt = await createAttempt(contextA, {
  approachId: String(approach.id),
  provider: "provider-neutral-live-proof",
  title: "Live proof attempt",
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
}), "removed member read");

await attachArtifact(contextA, {
  anchor,
  attemptId: String(attempt.id),
  contentRoot: root("6"),
  metadataRoot: root("7"),
  kind: "proof",
  path: "artifacts/live-proof.json",
  mediaType: "application/json",
  byteSize: 42,
  locator: "file:artifacts/live-proof.json",
}, command());

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
const draft = await saveSubmissionDraft(contextA, { anchor, payload }, command());
const exported = await exportSubmissionDraft(contextA, String(draft.id));
if (exported.payloadRoot !== expectedExport.payloadRoot) throw new Error("draft export changed canonical payload bytes");

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
});
const approachAudits = activity.audit.filter((entry) => entry.operation === "approach.create");
if (approachAudits.length !== 1) throw new Error("idempotent retry appended a duplicate audit entry");
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
    attempts: activity.attempts.length,
    privateDiscussionForAuthor: activity.discussion.length,
    artifacts: activity.artifacts.length,
    drafts: activity.drafts.length,
    audit: activity.audit.length,
  },
  payloadRoot: exported.payloadRoot,
  standing: standingAfter,
  crossTenantDenied: true,
  removedMemberDenied: true,
  privateNoteIsolated: true,
  idempotencyProved: true,
  optimisticVersioningProved: true,
  appBaseTablesDenied: true,
  observatoryWriteDenied: true,
  authoritySecretColumns: 0,
  artifactByteColumns: 0,
}));
