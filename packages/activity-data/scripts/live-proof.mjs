import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { expectedTables } from "./expected-tables.mjs";
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
  listFollowedProblems,
  listWorkspaces,
  publicProfileByHandle,
  publicProfileForPerformer,
  savePublicProfile,
  saveSubmissionDraft,
  scientificAnchorRoot,
  updateAttempt,
} from "../src/index.ts";
import { canonicalJson, sha256 } from "@vela/projection-data/canonical";
import { projectionReaderIdentity } from "@vela/projection-data/projection-reader";

const appUrl = process.env.VELA_ACTIVITY_DATABASE_URL;
const migratorUrl = process.env.VELA_ACTIVITY_MIGRATOR_DATABASE_URL;
const projectionUrl = process.env.VELA_PROJECTION_DATABASE_URL;
if (!appUrl || !migratorUrl || !projectionUrl) {
  throw new Error("live proof requires activity app, activity migrator, and Problems reader URLs");
}

const appSql = neon(appUrl);
const migratorSql = neon(migratorUrl);
const projectionSql = neon(projectionUrl);
const [projectionIdentity] = await projectionSql.query(
  `SELECT current_database() AS database, current_user AS role,
     pg_has_role(current_user, $1, 'MEMBER') AS permission_member,
     (SELECT rolinherit FROM pg_roles WHERE rolname = current_user) AS inherits_privileges`,
  [projectionReaderIdentity.permissionRole],
);
if (
  projectionIdentity?.database !== projectionReaderIdentity.database
  || projectionIdentity?.role !== projectionReaderIdentity.loginRole
  || !projectionIdentity.permission_member
  || !projectionIdentity.inherits_privileges
) {
  throw new Error(`live proof received an unexpected Problems reader identity: ${JSON.stringify(projectionIdentity)}`);
}
const suffix = Date.now().toString(36);
const root = (value) => `sha256:${value.repeat(64)}`;
const command = () => ({ idempotencyKey: randomUUID() });

async function denied(promise, label) {
  try {
    await promise;
  } catch (error) {
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

/* Every generated row this proof creates is named for the proof: accounts and
   profiles under the reserved `example.invalid` domain, workspaces and handles
   under a `live-proof` / `live-` prefix. Sweeping by that shape rather than by
   a list of ids collected during the run is what makes the cleanup total.
   The id list missed the deletion fixture's profile, and it could not run at
   all when an assertion threw before reaching it. Two runs on 2026-08-19 did
   exactly that and stranded six accounts, four workspaces and four profiles in
   the real database until they were removed by hand. Sweeping on the way in as
   well as on the way out bounds the damage of a failed run to that one run. */
async function sweepLiveProofResidue() {
  const results = await ownerTransaction((transaction) => [
    /* The audit log is append-only to every application path, including a
       workspace cascade. The migrator owns this one bounded transaction:
       disable only the named trigger, remove the generated tenants, then
       restore it before commit. Any intervening failure rolls the DDL back
       with the sweep. */
    transaction.query(
      "ALTER TABLE activity.activity_audit_entries DISABLE TRIGGER activity_audit_append_only",
    ),
    transaction.query("DELETE FROM activity.workspaces WHERE slug LIKE 'live-proof-%'"),
    transaction.query(
      "DELETE FROM activity.accounts WHERE email LIKE 'liveproof-%@example.invalid'",
    ),
    transaction.query(
      "DELETE FROM activity.public_profiles WHERE handle LIKE 'live-current-%' OR handle LIKE 'live-deleted-%'",
    ),
    transaction.query(
      "ALTER TABLE activity.activity_audit_entries ENABLE TRIGGER activity_audit_append_only",
    ),
    transaction.query(
      `SELECT
         (SELECT count(*) FROM activity.workspaces WHERE slug LIKE 'live-proof-%')::integer AS workspaces,
         (SELECT count(*) FROM activity.accounts WHERE email LIKE 'liveproof-%@example.invalid')::integer AS accounts,
         (SELECT count(*) FROM activity.public_profiles
           WHERE handle LIKE 'live-current-%' OR handle LIKE 'live-deleted-%')::integer AS profiles`,
    ),
  ]);
  const remaining = results.at(-1)?.[0];
  if (Number(remaining?.workspaces) || Number(remaining?.accounts) || Number(remaining?.profiles)) {
    throw new Error(`activity live-proof sweep left rows behind: ${JSON.stringify(remaining)}`);
  }
}

async function standingSnapshot() {
  const [current] = await projectionSql.query(
    "SELECT release_root FROM projection.current_release",
  );
  const rows = await projectionSql.query(
    `SELECT repository_id, claim_id, claim_root, standing
     FROM projection.claims WHERE release_root=$1 ORDER BY repository_id, claim_id`,
    [current.release_root],
  );
  return { releaseRoot: current.release_root, count: rows.length, root: sha256(canonicalJson(rows)) };
}

/* Clear anything a previously failed run left behind, so a green proof is
   evidence the database is clean rather than evidence this run tidied itself. */
await sweepLiveProofResidue();
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
const privateHandle = `live-a-${suffix}`;
const currentHandle = `live-current-${suffix}`;
const accountProfile = await savePublicProfile(accountA.id, {
  handle: privateHandle,
  displayName: "Live proof contributor",
  bio: "Bounded public-profile proof.",
  affiliation: "",
  visibility: "private",
  links: { website: "https://example.invalid/live-proof" },
}, null);
if (await publicProfileByHandle(privateHandle)) throw new Error("private profile was publicly readable");
const ownerPreview = await publicProfileByHandle(privateHandle, accountA.id);
if (!ownerPreview?.ownerPreview || ownerPreview.handle !== privateHandle) throw new Error("profile owner preview failed");
const unlistedProfile = await savePublicProfile(accountA.id, {
  handle: privateHandle,
  displayName: "Live proof contributor",
  bio: "Bounded public-profile proof.",
  affiliation: "",
  visibility: "unlisted",
  links: { website: "https://example.invalid/live-proof" },
}, accountProfile.version);
const linkedPerformerId = `agent:live-proof-${suffix}`;
await ownerTransaction((transaction) => [transaction.query(
  `INSERT INTO activity.public_profile_performers
     (profile_id, performer_id, performer_kind, verification_kind, evidence_locator)
   VALUES ($1::uuid, $2, 'agent', 'signed_record', 'https://example.invalid/evidence')`,
  [unlistedProfile.id, linkedPerformerId],
)]);
if (!await publicProfileByHandle(privateHandle)) throw new Error("unlisted profile was not readable by exact handle");
if (await publicProfileForPerformer(linkedPerformerId)) throw new Error("unlisted profile leaked through public attribution");
/* The rename is proved through the reads below, not through its return
   value. */
await savePublicProfile(accountA.id, {
  handle: currentHandle,
  displayName: "Live proof contributor",
  bio: "Bounded public-profile proof.",
  affiliation: "",
  visibility: "public",
  links: { website: "https://example.invalid/live-proof" },
}, unlistedProfile.version);
if ((await publicProfileForPerformer(linkedPerformerId))?.handle !== currentHandle) {
  throw new Error("public profile was not reachable from exact performer attribution");
}
const renamedRead = await publicProfileByHandle(privateHandle);
if (!renamedRead?.redirect || renamedRead.handle !== currentHandle) throw new Error("retired profile handle did not redirect");
await denied(savePublicProfile(accountB.id, {
  handle: currentHandle,
  displayName: "Collision attempt",
  bio: "",
  affiliation: "",
  visibility: "public",
  links: {},
}, null), "public profile handle collision");

const deletedHandle = `live-deleted-${suffix}`;
const accountC = await ensureCurrentAccount({
  workosUserId: `user_liveproofc${suffix}`,
  displayName: "Live proof deleted account",
  email: `liveproof-c-${suffix}@example.invalid`,
});
const deletedProfile = await savePublicProfile(accountC.id, {
  handle: deletedHandle,
  displayName: "Private name removed on deletion",
  bio: "Private biography removed on deletion.",
  affiliation: "Private affiliation",
  visibility: "public",
  links: { website: "https://example.invalid/deleted-profile" },
}, null);
await ownerTransaction((transaction) => [transaction.query(
  "DELETE FROM activity.accounts WHERE id=$1::uuid",
  [accountC.id],
)]);
if (await publicProfileByHandle(deletedHandle)) throw new Error("deleted account profile remained public");
const deletedRows = await ownerTransaction((transaction) => [transaction.query(
  `SELECT account_id, status, display_name, bio, affiliation, visibility, links
   FROM activity.public_profiles WHERE id=$1::uuid`,
  [deletedProfile.id],
)]);
const deletedRow = deletedRows.at(-1)?.[0];
if (deletedRow?.account_id !== null || deletedRow?.status !== "deleted"
  || deletedRow?.display_name !== "Deleted contributor" || deletedRow?.bio !== ""
  || deletedRow?.affiliation !== "" || deletedRow?.visibility !== "private"
  || JSON.stringify(deletedRow?.links) !== "{}") {
  throw new Error(`deleted profile was not safely tombstoned: ${JSON.stringify(deletedRow)}`);
}
const accountD = await ensureCurrentAccount({
  workosUserId: `user_liveproofd${suffix}`,
  displayName: "Live proof handle reuse",
  email: `liveproof-d-${suffix}@example.invalid`,
});
await denied(savePublicProfile(accountD.id, {
  handle: deletedHandle,
  displayName: "Impersonation attempt",
  bio: "",
  affiliation: "",
  visibility: "public",
  links: {},
}, null), "deleted profile handle reuse");
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
  repositoryId: "3d012325-3768-4b95-a385-c94e9f2a57a6",
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
const approachPayload = {
  anchor: commandAnchor,
  title: "Live proof approach",
  summary: "A bounded integration proof for tenant and activity semantics.",
};
const approachRequestRoot = commandRequestRoot("approach.create", approachPayload);
const approach = await createApproach(contextA, {
  anchor,
  title: approachPayload.title,
  summary: approachPayload.summary,
}, approachCommand);
const [listedWorkspaceA] = (await listWorkspaces(accountA.id)).filter(({ id }) => id === workspaceA.id);
if (
  listedWorkspaceA?.problemContexts.length !== 1
  || listedWorkspaceA.problemContexts[0]?.projectionReleaseRoot !== anchor.projectionReleaseRoot
  || listedWorkspaceA.problemContexts[0]?.repositoryId !== anchor.repositoryId
  || listedWorkspaceA.problemContexts[0]?.problemId !== anchor.problemId
  || listedWorkspaceA.problemContexts[0]?.anchorRoot !== currentAnchorRoot
) {
  throw new Error(`Workspaces context summary lost exact anchor identity: ${JSON.stringify(listedWorkspaceA?.problemContexts)}`);
}
const [listedWorkspaceB] = (await listWorkspaces(accountB.id)).filter(({ id }) => id === workspaceB.id);
if (!listedWorkspaceB || listedWorkspaceB.problemContexts.length !== 0) {
  throw new Error("an unanchored Workspace invented Problem context");
}
const retriedApproach = await createApproach(contextA, {
  anchor,
  title: approachPayload.title,
  summary: approachPayload.summary,
}, approachCommand);
if (approach.id !== retriedApproach.id) throw new Error("idempotent retry returned a different resource");
await denied(createApproach(contextA, {
  anchor,
  title: "Changed request",
  summary: "The same idempotency key must reject changed bytes.",
}, approachCommand), "idempotency key reuse");

const forkTitle = "Live proof Problem-scoped fork";
const forkSummary = "A second approach to the same exact Problem anchor.";
const forkExpectedVersion = Number(approach.version);
const forkRequestRoot = commandRequestRoot("approach.fork", {
  source_approach_id: approach.id,
  title: forkTitle,
  summary: forkSummary,
}, forkExpectedVersion);
const fork = await forkApproach(contextA, {
  sourceApproachId: String(approach.id),
  expectedVersion: forkExpectedVersion,
  title: forkTitle,
  summary: forkSummary,
}, command());
if (
  fork.parent_approach_id !== approach.id
  || fork.anchor_root !== currentAnchorRoot
  || fork.created_by_account_id !== accountA.id
  || fork.authority_effect !== "none"
) {
  throw new Error(`Problem-scoped fork changed exact provenance: ${JSON.stringify(fork)}`);
}

const forkReadView = await getProblemActivity({
  accountId: accountA.id,
  workspaceId: workspaceA.id,
  repositoryId: anchor.repositoryId,
  problemId: anchor.problemId,
  currentAnchorRoot,
});
const retainedFork = forkReadView.approaches.find((entry) => entry.id === fork.id);
if (
  retainedFork?.parentApproachId !== approach.id
  || retainedFork.anchorRoot !== currentAnchorRoot
  || retainedFork.createdByAccountId !== accountA.id
  || retainedFork.authorityEffect !== "none"
) {
  throw new Error("Problem-scoped fork read lost exact provenance");
}

const attempt = await createAttempt(contextA, {
  approachId: String(approach.id),
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

/* The other direction of the same records: what this account watches, read
   without naming a Problem. Right here accountA follows only the historical
   anchor — the current one was just unfollowed — so the list must return that
   one Problem, carry the anchor of the state actually followed, and stay
   invisible to an account that follows nothing. */
const watchedByA = await listFollowedProblems(accountA.id);
const watchedHere = watchedByA.filter((entry) => (
  entry.anchor.repositoryId === anchor.repositoryId && entry.anchor.problemId === anchor.problemId
));
if (watchedHere.length !== 1) throw new Error("followed Problem list did not collapse to one row per Problem");
if (watchedHere[0].anchor.root !== historicalAnchorRoot) {
  throw new Error("followed Problem list did not report the earliest followed anchor");
}
if (watchedHere[0].anchor.projectionReleaseRoot !== historicalAnchor.projectionReleaseRoot) {
  throw new Error("followed Problem list lost the exact release root the follow was made at");
}
if (watchedHere[0].workspaceId !== workspaceA.id) throw new Error("followed Problem list reported the wrong Workspace");
const watchedByB = await listFollowedProblems(accountB.id);
if (watchedByB.some((entry) => entry.workspaceId === workspaceA.id)) {
  throw new Error("followed Problem list crossed a tenant boundary");
}

const payload = {
  schema: "vela.submission.v3",
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
const problemsUrl = new URL(appUrl);
problemsUrl.pathname = "/vela_projection";
await denied(neon(problemsUrl.toString()).query(
  "UPDATE projection.current_release SET confirmed_at=confirmed_at",
), "activity role Problems write");

const catalogResults = await ownerTransaction((transaction) => [transaction.query(`SELECT
  (SELECT count(*)::integer FROM pg_tables WHERE schemaname='activity') AS table_count,
  count(*) FILTER (WHERE column_name ~* '(private|signing|authority).*key|seed')::integer AS authority_secret_columns,
  count(*) FILTER (WHERE table_name || '.' || column_name IN (
    'approaches.target_id', 'approaches.target_packet_root', 'approaches.target_record_root',
    'attempts.provider', 'attempts.external_session_id', 'attempts.locator',
    'attempts.execution_packet_root', 'artifact_refs.execution_packet_root',
    'submission_drafts.artifact_id', 'submission_drafts.execution_packet_root'
  ))::integer AS retired_columns,
  count(*) FILTER (WHERE data_type='bytea'
    AND NOT (table_name='workspace_crdt_updates' AND column_name='update_bytes'))::integer
    AS unexpected_byte_columns,
  count(*) FILTER (WHERE data_type='bytea'
    AND table_name='workspace_crdt_updates' AND column_name='update_bytes')::integer
    AS bounded_crdt_byte_columns
  FROM information_schema.columns WHERE table_schema='activity'`)]);
/* Every API function the application can call, and nothing else can.
 *
 * PostgreSQL grants EXECUTE to PUBLIC on a newly created function by default,
 * so a schema fragment that creates one and revokes nothing opens it to every
 * role in the database. The reverse mistake is quieter and was the one worth
 * catching: `base.sql` grants across the whole schema, but it runs first, so a
 * fragment that forgets its own grant creates a function the app role cannot
 * execute — and nothing fails until a page 500s in production.
 *
 * `no-duplicate-definitions.test.ts` reads the same property out of the SQL
 * source. This reads it out of the database that actually serves traffic. */
const [functionPrivileges] = await migratorSql.query(`
  SELECT
    count(*)::integer AS total,
    count(*) FILTER (WHERE NOT has_function_privilege('vela_activity_app', p.oid, 'EXECUTE'))::integer
      AS app_cannot_execute,
    count(*) FILTER (WHERE has_function_privilege('public', p.oid, 'EXECUTE'))::integer
      AS public_can_execute,
    count(*) FILTER (WHERE NOT p.prosecdef)::integer AS not_security_definer
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'activity_api'`);
if (!functionPrivileges || Number(functionPrivileges.total) === 0) {
  throw new Error("activity_api exposes no functions");
}
if (
  Number(functionPrivileges.app_cannot_execute) !== 0
  || Number(functionPrivileges.public_can_execute) !== 0
  || Number(functionPrivileges.not_security_definer) !== 0
) {
  throw new Error(`activity_api function privileges failed: ${JSON.stringify(functionPrivileges)}`);
}

const catalogRows = catalogResults.at(-1);
const catalog = catalogRows?.[0];
if (!catalog) throw new Error("activity catalog probe returned no row");
if (
  Number(catalog.table_count) !== expectedTables.length
  || Number(catalog.authority_secret_columns) !== 0
  || Number(catalog.retired_columns) !== 0
  || Number(catalog.unexpected_byte_columns) !== 0
  || Number(catalog.bounded_crdt_byte_columns) !== 1
) {
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
if (approachAudits[0]?.requestRoot !== approachRequestRoot) {
  throw new Error("Problem-scoped create audit did not retain the exact request root");
}
const forkAudits = activity.audit.filter(
  (entry) => entry.operation === "approach.fork" && entry.subjectId === fork.id,
);
if (forkAudits.length !== 1 || forkAudits[0]?.requestRoot !== forkRequestRoot) {
  throw new Error("Problem-scoped fork audit did not retain the exact request root once");
}
/* The tenant is generated, so it leaves with the same sweep that cleared the
   way in, including the deletion fixture's orphaned profile that the old id
   list never named. */
await sweepLiveProofResidue();
const standingAfter = await standingSnapshot();
if (canonicalJson(standingAfter) !== canonicalJson(standingBefore)) {
  throw new Error("activity proof changed Problems Standing");
}

console.log(JSON.stringify({
  ok: true,
  schema: "vela.activity-live-proof.v1",
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
  crossTenantWriteDenied: true,
  unsignedExportDenied: true,
  removedMemberDenied: true,
  privateNoteIsolated: true,
  idempotencyProved: true,
  cleanSchemaProved: true,
  cleanupProved: true,
  problemScopedForkAndAuditProved: true,
  optimisticVersioningProved: true,
  profilePrivacyRenameCollisionDeletionProved: true,
  exactAnchorFollowingProved: true,
  followedProblemListProved: true,
  apiFunctions: Number(functionPrivileges.total),
  apiFunctionPrivilegesProved: true,
  appBaseTablesDenied: true,
  problemsWriteDenied: true,
  authoritySecretColumns: 0,
  unexpectedByteColumns: 0,
  boundedCrdtByteColumns: 1,
}));
