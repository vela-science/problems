import { describe, expect, test } from "bun:test";
import {
  compactStatusSchema,
  statusClaimCount,
  statusStateRoot,
  statusStateRoots,
  type CompactStatus,
} from "../src";

const root = (digit: string) => `sha256:${digit.repeat(64)}` as const;

function currentStatus(): CompactStatus {
  return {
    schema: "vela.status.v4",
    ok: true,
    command: "status",
    repository: {
      id: "123e4567-e89b-42d3-a456-426614174000",
      name: "Test repository",
      profile_root: root("1"),
    },
    git: { role: "repository_head", commit: "1".repeat(40), tree: "2".repeat(40) },
    roots: {
      origin: root("2"),
      repository: root("3"),
      authority_keyset: root("4"),
      authority_policy: root("5"),
    },
    integrity: {
      replay: "verified",
      strict: "pass",
      blocker_count: 0,
      blockers_by_code: {},
    },
    counts: {
      claims: 12,
      accepted_claims: 10,
      pending_claims: 2,
      pending_review: 2,
      accepted_review: 1,
      rejected_review: 0,
      withdrawn_review: 0,
      submissions: 2,
      verifications: 2,
      artifacts: 4,
    },
    decision_inbox: {
      pending_count: 2,
      protocol_ready_count: 1,
      protocol_blocked_count: 1,
      projection_root: root("6"),
      first_entry_root: root("7"),
    },
    actions: {
      review: { pending_count: 2, command: "vela review inbox . --json" },
      work: { mode: "direct_submission", command: "vela submit --repo . --help", note: "Submit bounded evidence directly." },
    },
  };
}

describe("current compact status roots", () => {
  test("discloses the repository and origin roots", () => {
    const status = currentStatus();
    expect(statusStateRoots(status)).toEqual([
      { label: "Repository root", value: root("3") },
      { label: "Origin root", value: root("2") },
    ]);
    expect(statusStateRoot(status)).toEqual({
      label: "Repository root",
      value: root("3"),
    });
    expect(statusClaimCount(status)).toBe(12);
    expect(compactStatusSchema.parse(status)).toEqual(status);
  });

  /* Renaming or dropping a field is what this catches, and it catches it
     through the field that went missing rather than through the one that
     arrived: `findings` replacing `claims` fails because `claims` is required,
     not because `findings` is unfamiliar. That distinction is the reason no
     object in this schema is strict — see the rule above it. */
  test("rejects historical status and work vocabulary", () => {
    const status = currentStatus();
    expect(compactStatusSchema.safeParse({
      ...status,
      roots: { snapshot: root("6") },
    }).success).toBe(false);
    const { claims: _claims, ...countsWithoutClaims } = status.counts;
    expect(compactStatusSchema.safeParse({
      ...status,
      counts: { ...countsWithoutClaims, findings: 12 },
    }).success).toBe(false);
    expect(compactStatusSchema.safeParse({
      ...status,
      git: { ...status.git, role: "target_index_source" },
    }).success).toBe(false);
    expect(compactStatusSchema.safeParse({
      ...status,
      actions: { ...status.actions, work: { ...status.actions.work, mode: "inspect" } },
    }).success).toBe(false);
  });

  /* The three shape changes that broke the projection refresh in six days were
     all of this form. A field the producer added is not evidence of anything on
     a document that roots nothing, so it is read past and dropped. */
  test("ignores a field this version does not name", () => {
    const status = currentStatus();
    const parsed = compactStatusSchema.parse({
      ...status,
      counts: { ...status.counts, withdrawn_submissions: 3 },
      later_section: { anything: true },
    });
    expect(parsed).toEqual(status);
  });

  /* The epoch-1 document and the epoch-1 identifier. `vfr_` names an object the
     protocol no longer has, and no retained release carries either. */
  test("reads the current status document only", () => {
    const status = currentStatus();
    expect(compactStatusSchema.safeParse({ ...status, schema: "vela.status.v3" }).success).toBe(false);
    expect(compactStatusSchema.safeParse({
      ...status,
      repository: { ...status.repository, id: "vfr_0123456789abcdef" },
    }).success).toBe(false);
  });

  test("accepts the current direct-submission action", () => {
    const status = currentStatus();
    const direct = {
      ...status,
      actions: {
        ...status.actions,
        work: {
          mode: "direct_submission",
          command: "vela submit --repository . --help",
          note: "Submit bounded evidence directly.",
        },
      },
    };
    expect(compactStatusSchema.parse(direct)).toEqual(direct);
  });
});
