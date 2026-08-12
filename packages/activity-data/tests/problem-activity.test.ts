import { describe, expect, test } from "bun:test";
import { parseProblemActivity } from "../src/problem-activity";

const root = (digit: string) => `sha256:${digit.repeat(64).slice(0, 64)}` as const;
const workspaceId = "00000000-0000-4000-8000-000000000001";
const accountId = "00000000-0000-4000-8000-000000000002";
const anchorRoot = root("1");
const historicalRoot = root("2");
const createdAt = "2026-08-12T04:00:00.000Z";

function fixture() {
  return {
    anchors: [{
      anchor_root: anchorRoot,
      projection_release_root: root("3"),
      repository_id: "erdos-problems",
      repository_root: root("4"),
      source_commit: "5".repeat(40),
      source_tree: "6".repeat(40),
      problem_id: "erdos-321",
      problem_record_root: root("7"),
      source_observation_root: null,
      claim_id: null,
      claim_root: null,
      claim_standing: null,
      captured_at: createdAt,
    }],
    followedAnchorRoots: [anchorRoot],
    approaches: [{
      id: "approach-1", workspace_id: workspaceId, anchor_root: anchorRoot,
      parent_approach_id: null, created_by_account_id: accountId,
      title: "Finite reduction", summary: "Test a bounded obstruction.", state: "open",
      target_id: null, target_packet_root: null, target_record_root: null,
      authority_effect: "none",
      version: 2, created_at: createdAt, updated_at: createdAt,
    }],
    attempts: [{
      id: "attempt-1", workspace_id: workspaceId, anchor_root: anchorRoot,
      approach_id: "approach-1", created_by_account_id: accountId, provider: "human",
      external_session_id: null, locator: null, title: "Check n < 100", state: "planned",
      version: 1, created_at: createdAt, updated_at: createdAt,
    }],
    discussion: [{
      id: "discussion-1", workspace_id: workspaceId, anchor_root: anchorRoot,
      approach_id: "approach-1", attempt_id: null, author_account_id: accountId,
      kind: "note", visibility: "workspace", body: "A bounded note.", created_at: createdAt,
    }],
    workRequests: [{
      id: "request-1", workspace_id: workspaceId, anchor_root: anchorRoot,
      approach_id: "approach-1", attempt_id: null, created_by_account_id: accountId,
      assignee_account_id: null, kind: "reproduction", state: "open",
      title: "Reproduce", detail: "Repeat exact commands.", version: 1,
      created_at: createdAt, updated_at: createdAt,
    }],
    artifacts: [{
      id: "artifact-1", workspace_id: workspaceId, anchor_root: anchorRoot,
      attempt_id: "attempt-1", attached_by_account_id: accountId,
      content_root: root("8"), metadata_root: null, kind: "negative result",
      path: "artifacts/result.json", media_type: "application/json", byte_size: 42,
      locator: null, created_at: createdAt,
    }],
    drafts: [{
      id: "draft-1", workspace_id: workspaceId, anchor_root: anchorRoot,
      created_by_account_id: accountId, schema_name: "vela.submission.v2",
      payload_root: root("9"), version: 1, created_at: createdAt, updated_at: createdAt,
    }],
    audit: [{
      sequence: 17, workspace_id: workspaceId, account_id: accountId,
      anchor_root: anchorRoot, operation: "attempt.create", subject_kind: "attempt",
      subject_id: "attempt-1", request_root: root("a"), recorded_at: createdAt,
    }],
  };
}

describe("problem activity response contract", () => {
  test("maps every activity row into stable camel-case records", () => {
    const activity = parseProblemActivity(fixture(), anchorRoot);
    expect(activity.following).toBe(true);
    expect(activity.approaches[0]).toMatchObject({
      id: "approach-1",
      anchorRoot,
      version: 2,
      target: { kind: "unbound", targetId: null, targetPacketRoot: null, targetRecordRoot: null },
      authorityEffect: "none",
    });
    expect(activity.attempts[0]).toMatchObject({ id: "attempt-1", approachId: "approach-1" });
    expect(activity.discussion[0]).toMatchObject({ id: "discussion-1", approachId: "approach-1" });
    expect(activity.workRequests[0]).toMatchObject({ id: "request-1", kind: "reproduction" });
    expect(activity.artifacts[0]).toMatchObject({ id: "artifact-1", contentRoot: root("8"), byteSize: 42 });
    expect(activity.drafts[0]).toMatchObject({ id: "draft-1", payloadRoot: root("9") });
    expect(activity.audit[0]).toEqual({
      sequence: 17,
      workspaceId,
      accountId,
      anchorRoot,
      operation: "attempt.create",
      subjectKind: "attempt",
      subjectId: "attempt-1",
      requestRoot: root("a"),
      recordedAt: createdAt,
    });
  });

  test("does not treat a historical follow as a current follow", () => {
    const value = fixture();
    value.followedAnchorRoots = [historicalRoot];
    expect(parseProblemActivity(value, anchorRoot).following).toBe(false);
  });

  test("fails closed on malformed roots and SQL column drift", () => {
    const malformed = fixture();
    malformed.followedAnchorRoots = ["not-a-root" as typeof anchorRoot];
    expect(() => parseProblemActivity(malformed, anchorRoot)).toThrow("followed anchor root is invalid");

    const oldAuditColumn = fixture();
    const audit = oldAuditColumn.audit[0] as typeof oldAuditColumn.audit[0] & { created_at?: string };
    audit.created_at = audit.recorded_at;
    delete (audit as { recorded_at?: string }).recorded_at;
    expect(() => parseProblemActivity(oldAuditColumn, anchorRoot)).toThrow("audit recorded_at");

    const nullableSubject = fixture();
    (nullableSubject.audit[0] as { subject_kind: string | null }).subject_kind = null;
    expect(() => parseProblemActivity(nullableSubject, anchorRoot)).toThrow("audit subject_kind");
  });

  test("parses exact Target bindings and refuses partial or authoritative rows", () => {
    const bound = fixture();
    bound.approaches[0]!.target_id = "erdos:321:bounded-search";
    bound.approaches[0]!.target_packet_root = root("b");
    bound.approaches[0]!.target_record_root = root("c");
    expect(parseProblemActivity(bound, anchorRoot).approaches[0]?.target).toEqual({
      kind: "target",
      targetId: "erdos:321:bounded-search",
      targetPacketRoot: root("b"),
      targetRecordRoot: root("c"),
    });

    const partial = fixture();
    partial.approaches[0]!.target_id = "erdos:321:bounded-search";
    expect(() => parseProblemActivity(partial, anchorRoot)).toThrow("Target binding");

    const malformed = fixture();
    malformed.approaches[0]!.target_id = "erdos:321:bounded-search";
    malformed.approaches[0]!.target_packet_root = "sha256:short" as typeof anchorRoot;
    expect(() => parseProblemActivity(malformed, anchorRoot)).toThrow("target_packet_root");

    const emptyTarget = fixture();
    emptyTarget.approaches[0]!.target_id = "   ";
    emptyTarget.approaches[0]!.target_packet_root = root("b");
    expect(() => parseProblemActivity(emptyTarget, anchorRoot)).toThrow("Target binding");

    const paddedTarget = fixture();
    paddedTarget.approaches[0]!.target_id = " erdos:321:bounded-search ";
    paddedTarget.approaches[0]!.target_packet_root = root("b");
    expect(() => parseProblemActivity(paddedTarget, anchorRoot)).toThrow("Target binding");

    const authorityCreep = fixture();
    authorityCreep.approaches[0]!.authority_effect = "standing";
    expect(() => parseProblemActivity(authorityCreep, anchorRoot)).toThrow("authority_effect");
  });

  test("refuses JavaScript-coercible counters and nonpositive versions", () => {
    for (const value of [null, false, "", [], {}]) {
      const coercible = fixture();
      (coercible.approaches[0] as { version: unknown }).version = value;
      expect(() => parseProblemActivity(coercible, anchorRoot)).toThrow("approach version");
    }
    const zeroVersion = fixture();
    zeroVersion.attempts[0]!.version = 0;
    expect(() => parseProblemActivity(zeroVersion, anchorRoot)).toThrow("attempt version");
    const zeroSequence = fixture();
    zeroSequence.audit[0]!.sequence = 0;
    expect(() => parseProblemActivity(zeroSequence, anchorRoot)).toThrow("audit sequence");
    const decimalString = fixture();
    (decimalString.audit[0] as { sequence: unknown }).sequence = "17";
    expect(parseProblemActivity(decimalString, anchorRoot).audit[0]?.sequence).toBe(17);
  });
});
