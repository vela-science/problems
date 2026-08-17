import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  currentRepositoryFromProjection,
  currentClaimStandingCounts,
  projectCurrentObjects,
  projectGraph,
  projectProposedStatePreviews,
  projectReviewFromCore,
  latestRfc3339Instant,
  normalizeRepositoryCommand,
  readCommits,
  readCoreProjection,
  readRepositoryRevisions,
  readRepositoryTransitions,
  readStatus,
  sourceNativeProblemCount,
} from "../scripts/projection-builder.mjs";
import { canonicalJson, sha256 } from "../src/canonical";
import { sourceDeclarationRows } from "../src/math-sources";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;
const domainRoot = (domain: string, value: unknown) => sha256(Buffer.concat([
  Buffer.from(domain),
  Buffer.from([0]),
  Buffer.from(canonicalJson(value)),
]));
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Repository-scoped Problem counts", () => {
  test("reads coverage from the exact pre-insertion declaration row shape", () => {
    const erdosDeclaration = sourceDeclarationRows().find(
      ({ source_id }) => source_id === "source:erdos-problems",
    );
    expect(erdosDeclaration).toBeDefined();
    expect(erdosDeclaration).not.toHaveProperty("coverage");
    expect(sourceNativeProblemCount({
      repositorySlug: "math",
      nativeRecords: [
        { source_id: "source:erdos-problems", native_kind: "problem" },
      ],
      sourceDeclarations: [erdosDeclaration],
    })).toBe(1);
  });

  test("counts only Problems whose exact Source declaration covers the Repository", () => {
    const sourceDeclarations = [
      { source_id: "source:math", coverage: { repository_slugs: ["math"] } },
      { source_id: "source:biology", coverage: { repository_slugs: ["biology"] } },
      { source_id: "source:shared", coverage: { repository_slugs: ["math", "biology"] } },
    ];
    const nativeRecords = [
      { source_id: "source:math", native_kind: "problem" },
      { source_id: "source:biology", native_kind: "problem" },
      { source_id: "source:shared", native_kind: "problem" },
      { source_id: "source:math", native_kind: "paper" },
    ];
    expect(sourceNativeProblemCount({ repositorySlug: "math", nativeRecords, sourceDeclarations })).toBe(2);
    expect(sourceNativeProblemCount({ repositorySlug: "biology", nativeRecords, sourceDeclarations })).toBe(2);
    expect(sourceNativeProblemCount({ repositorySlug: "physics", nativeRecords, sourceDeclarations })).toBe(0);
  });

  test("refuses duplicate Source declarations instead of choosing coverage", () => {
    expect(() => sourceNativeProblemCount({
      repositorySlug: "math",
      nativeRecords: [],
      sourceDeclarations: [
        { source_id: "source:duplicate", coverage: { repository_slugs: ["math"] } },
        { source_id: "source:duplicate", coverage: { repository_slugs: ["biology"] } },
      ],
    })).toThrow(/duplicate source declaration/u);
    expect(() => sourceNativeProblemCount({ repositorySlug: undefined, nativeRecords: [], sourceDeclarations: [] }))
      .toThrow(/missing exact Repository slug/u);
    expect(() => sourceNativeProblemCount({
      repositorySlug: "math",
      nativeRecords: [],
      sourceDeclarations: [{ source_id: "source:missing", coverage: {} }],
    })).toThrow(/missing repository_slugs coverage/u);
  });
});

function fakeVela(responses: Record<string, { status: number; body: unknown }>) {
  const directory = mkdtempSync(join(tmpdir(), "vela-web-fake-vela-"));
  temporaryDirectories.push(directory);
  const executable = join(directory, "vela");
  writeFileSync(executable, `#!/usr/bin/env bun
const responses = ${JSON.stringify(responses)};
const response = responses[process.argv[2]];
if (!response) process.exit(64);
process.stdout.write(JSON.stringify(response.body));
process.exit(response.status);
`);
  chmodSync(executable, 0o755);
  return { directory, executable };
}

function status(overrides: Record<string, unknown> = {}) {
  return {
    schema: "vela.status.v4",
    ok: true,
    command: "status",
    repository: { id: "123e4567-e89b-42d3-a456-426614174000", name: "Test repository", profile_root: root("0") },
    git: { role: "repository_head", commit: "1".repeat(40), tree: "2".repeat(40) },
    integrity: { replay: "verified", strict: "pass", blocker_count: 0, blockers_by_code: {} },
    roots: {
      origin: root("1"),
      repository: root("2"),
      authority_keyset: root("3"),
      authority_policy: root("4"),
    },
    counts: {
      claims: 1,
      accepted_claims: 1,
      pending_claims: 0,
      pending_review: 1,
      accepted_review: 0,
      rejected_review: 0,
      withdrawn_review: 0,
      submissions: 0,
      verifications: 0,
      artifacts: 0,
    },
    decision_inbox: {
      pending_count: 1,
      protocol_ready_count: 1,
      protocol_blocked_count: 0,
      projection_root: root("6"),
      first_entry_root: root("7"),
    },
    actions: {
      review: { pending_count: 1, command: "vela review inbox . --json" },
      work: { mode: "direct_submission", command: "vela submit --repo . --help", note: "Submit bounded evidence directly." },
    },
    ...overrides,
  };
}

function projection(overrides: Record<string, unknown> = {}) {
  const value: Record<string, any> = {
    schema: "vela.repository-projection.v1",
    ok: true,
    command: "projection",
    authority_effect: "none",
    projection_root: root("0"),
    projection_root_definition: "sha256 of RFC 8785 canonical JSON after removing only projection_root",
    reader_version: "0.977.0",
    repository: {
      repository_id: "123e4567-e89b-42d3-a456-426614174000",
      name: "Test repository",
      origin_id: "vro_0123456789abcdef",
      origin_root: root("1"),
      repository_root: root("2"),
      authority_keyset_root: root("3"),
      authority_policy_root: root("4"),
    },
    git: { role: "repository_head", commit: "1".repeat(40), tree: "2".repeat(40) },
    roots: {
      origin: root("1"), repository: root("2"),
      authority_keyset: root("3"), authority_policy: root("4"),
    },
    integrity: { replay: "verified", strict: "pass", blocker_count: 0, blockers_by_code: {} },
    claims: [],
    proposals: [],
    submissions: [],
    verifications: [],
    artifacts: [],
    transitions: [],
    decision_inbox: {
      schema: "vela.decision-inbox.v3",
      repository_id: "123e4567-e89b-42d3-a456-426614174000",
      repository_root: root("2"),
      projection_root: root("5"),
      order: [],
      entries: [],
    },
    handoff: {
      accepted_claim_ids: [],
      active_pending_claim_ids: [],
      inactive_unassessed_claim_ids: [],
      retired_claim_ids: [],
      pending_proposal_ids: [],
      correction_successor_ids: [],
      exact_next_actions: [],
      failed_routes: [],
      nonclaims: [],
    },
    ...overrides,
  };
  const { projection_root: _projectionRoot, ...commitment } = value;
  value.projection_root = sha256(canonicalJson(commitment));
  return value;
}

describe("current repository command boundary", () => {
  test("orders release timestamps by instant rather than RFC3339 spelling", () => {
    expect(latestRfc3339Instant([
      "2026-07-30T23:00:00Z",
      "2026-07-30T20:35:11-04:00",
      "2026-07-30T18:55:26Z",
    ])).toBe("2026-07-30T20:35:11-04:00");
  });

  test("rejects missing or malformed release timestamps", () => {
    expect(() => latestRfc3339Instant([])).toThrow(
      "cannot derive generated_at without source timestamps",
    );
    expect(() => latestRfc3339Instant(["not-a-timestamp"])).toThrow(
      "invalid RFC3339 timestamp not-a-timestamp",
    );
    expect(() => latestRfc3339Instant(["2026-07-30"])).toThrow(
      "invalid RFC3339 timestamp 2026-07-30",
    );
  });

  test("removes checkout-local paths from projected commands", () => {
    const directory = mkdtempSync(join(tmpdir(), "vela-web-command-path-"));
    temporaryDirectories.push(directory);
    expect(normalizeRepositoryCommand(
      `vela repository verify ${directory} --json`,
      directory,
    )).toBe("vela repository verify . --json");
  });

  test("accepts only a strict, replay-verified current repository", () => {
    const fake = fakeVela({});
    const current = status({
      actions: {
        review: {
          pending_count: 1,
          command: `vela review inbox ${fake.directory} --json`,
        },
        work: {
          mode: "direct_submission",
          command: `vela submit --repo ${fake.directory} --help`,
          note: "Submit bounded evidence directly.",
        },
      },
    });
    writeFileSync(fake.executable, `#!/usr/bin/env bun
process.stdout.write(${JSON.stringify(JSON.stringify(current))});
`);
    chmodSync(fake.executable, 0o755);
    expect(readStatus(fake.executable, fake.directory)).toEqual({
      ...current,
      actions: {
        review: { pending_count: 1, command: "vela review inbox . --json" },
        work: { mode: "direct_submission", command: "vela submit --repo . --help", note: "Submit bounded evidence directly." },
      },
    });

    const blocked = status({
      ok: false,
      integrity: { replay: "verified", strict: "blocked", blocker_count: 1, blockers_by_code: { drift: 1 } },
    });
    const invalid = fakeVela({ status: { status: 1, body: blocked } });
    expect(() => readStatus(invalid.executable, invalid.directory)).toThrow("Vela status failed");
  });

  test("accepts only a rooted strict no-authority Core projection", () => {
    const current = projection();
    const fake = fakeVela({ projection: { status: 0, body: current } });
    expect(readCoreProjection(fake.executable, fake.directory)).toEqual({
      state: "available",
      projection: current,
    });

    const drifted = structuredClone(current);
    drifted.projection_root = root("9");
    const drift = fakeVela({ projection: { status: 0, body: drifted } });
    expect(() => readCoreProjection(drift.executable, drift.directory))
      .toThrow("Vela projection root drift");

    const claimsAuthority = projection({ authority_effect: "accept" });
    const authority = fakeVela({ projection: { status: 0, body: claimsAuthority } });
    expect(() => readCoreProjection(authority.executable, authority.directory))
      .toThrow("Vela projection claims authority");
  });

  test("strict-replays exact revisions and derives semantic deltas only across verified states", () => {
    const directory = mkdtempSync(join(tmpdir(), "vela-web-revision-history-"));
    temporaryDirectories.push(directory);
    const runGit = (...args: string[]) => execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();
    runGit("init", "-q");
    runGit("config", "user.name", "Vela test");
    runGit("config", "user.email", "test@vela.invalid");
    mkdirSync(join(directory, ".vela"), { recursive: true });
    const repositoryId = "123e4567-e89b-42d3-a456-426614174000";
    const writeIndex = (initialized: boolean, accepted: string[], pending: string[]) => {
      writeFileSync(join(directory, ".vela/repository.json"), canonicalJson({
        schema: "vela.repository.v4",
        repository_id: repositoryId,
        initialized,
        accepted_claims: accepted.map((claim_id) => ({ claim_id })),
        pending_claims: pending.map((claim_id) => ({ claim_id })),
      }));
      runGit("add", ".vela/repository.json");
      runGit("commit", "-qm", "state " + (initialized ? "ready" : "blocked"));
      return runGit("rev-parse", "HEAD");
    };
    const blocked = writeIndex(false, [], []);
    const before = writeIndex(true, [], ["vcl_exact"]);
    const after = writeIndex(true, ["vcl_exact"], []);

    const executable = join(directory, "fake-vela");
    writeFileSync(executable, [
      "#!/usr/bin/env bun",
      "import { createHash } from \"node:crypto\";",
      "import { existsSync, readFileSync, writeFileSync } from \"node:fs\";",
      "const cwd = process.cwd();",
      "const marker = cwd + \"/.historical-reader-marker\";",
      "if (existsSync(marker)) throw new Error(\"historical checkout leaked prior read bytes\");",
      "writeFileSync(marker, \"read\");",
      "const git = (...args) => Bun.spawnSync([\"git\", ...args], { cwd }).stdout.toString().trim();",
      "const bytes = readFileSync(cwd + \"/.vela/repository.json\");",
      "const record = JSON.parse(bytes.toString(\"utf8\"));",
      "const sha = \"sha256:\" + createHash(\"sha256\").update(bytes).digest(\"hex\");",
      "if (record.initialized !== true) {",
      "  process.stdout.write(JSON.stringify({ schema: \"vela.error.v1\", ok: false, command: \"projection\", error: { kind: \"domain\", code: null, message: \"historical profile is not supported\", hint: null } }));",
      "  process.exit(1);",
      "}",
      "const fixedRoot = (digit) => \"sha256:\" + digit.repeat(64);",
      "const sort = (value) => Array.isArray(value) ? value.map(sort) : value && typeof value === \"object\" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])) : value;",
      "const projection = {",
      "  schema: \"vela.repository-projection.v1\", ok: true, command: \"projection\", authority_effect: \"none\", projection_root: \"\",",
      "  projection_root_definition: \"sha256 of RFC 8785 canonical JSON after removing only projection_root\", reader_version: \"fixture\",",
      "  repository: { repository_id: record.repository_id, name: \"Fixture\", origin_id: \"vro_fixture\", origin_root: fixedRoot(\"1\"), repository_root: sha, authority_keyset_root: fixedRoot(\"2\"), authority_policy_root: fixedRoot(\"3\") },",
      "  git: { role: \"repository_head\", commit: git(\"rev-parse\", \"HEAD\"), tree: git(\"rev-parse\", \"HEAD^{tree}\") },",
      "  roots: { origin: fixedRoot(\"1\"), repository: sha, authority_keyset: fixedRoot(\"2\"), authority_policy: fixedRoot(\"3\") },",
      "  integrity: { replay: \"verified\", strict: \"pass\", blocker_count: 0, blockers_by_code: {} }, claims: [], proposals: [], submissions: [], verifications: [], artifacts: [], transitions: [],",
      "  decision_inbox: { schema: \"vela.decision-inbox.v3\", repository_id: record.repository_id, repository_root: sha, projection_root: fixedRoot(\"4\"), order: [], entries: [] },",
      "  handoff: { accepted_claim_ids: record.accepted_claims.map(({ claim_id }) => claim_id), active_pending_claim_ids: record.pending_claims.map(({ claim_id }) => claim_id), inactive_unassessed_claim_ids: [], retired_claim_ids: [], pending_proposal_ids: [], correction_successor_ids: [], exact_next_actions: [], failed_routes: [], nonclaims: [] },",
      "};",
      "const { projection_root, ...commitment } = projection;",
      "projection.projection_root = \"sha256:\" + createHash(\"sha256\").update(JSON.stringify(sort(commitment))).digest(\"hex\");",
      "process.stdout.write(JSON.stringify(projection));",
    ].join("\n"));
    chmodSync(executable, 0o755);
    const commits = readCommits(directory);
    const revisions = readRepositoryRevisions({
      vela: executable,
      cwd: directory,
      repositoryId,
      commits,
      currentCommit: after,
      readerVersion: "vela 0.972.1",
      readerBinaryRoot: root("a"),
    });
    expect(revisions).toHaveLength(3);
    expect(revisions.find(({ git_commit }) => git_commit === blocked)?.replay_state).toBe("unavailable");
    expect(revisions.find(({ git_commit }) => git_commit === before)?.record.state).toEqual({
      accepted_claim_ids: [],
      unassessed_claim_ids: ["vcl_exact"],
    });
    const transitions = readRepositoryTransitions(directory, commits, revisions);
    expect(transitions.find(({ commit_sha }: { commit_sha: string }) => commit_sha === before)).toMatchObject({
      comparison_state: "unavailable",
      semantic_delta: null,
    });
    expect(transitions.find(({ commit_sha }: { commit_sha: string }) => commit_sha === after)).toMatchObject({
      comparison_state: "verified",
      semantic_delta: {
        schema: "vela.projection-semantic-delta.v1",
        authority_effect: "none",
        accepted: { added: ["vcl_exact"], removed: [], before: 0, after: 1 },
        unassessed: { added: [], removed: ["vcl_exact"], before: 1, after: 0 },
      },
    });
  });

});

describe("proposed-state projection", () => {
  test("keeps producer withdrawal outside the historical Decision path", () => {
    const baseCommit = "1".repeat(40);
    const terminalCommit = "2".repeat(40);
    const currentCommit = "3".repeat(40);
    const proposalId = "vpr_withdrawn";
    const review = {
      proposal_id: proposalId,
      target: "vcl_withdrawn",
      status: "withdrawn",
    };
    const revisions = [
      { git_commit: baseCommit, repository_root: root("1"), row_root: root("a"), replay_state: "verified" },
      { git_commit: terminalCommit, repository_root: root("2"), row_root: root("b"), replay_state: "verified" },
      { git_commit: currentCommit, repository_root: root("3"), row_root: root("c"), replay_state: "verified" },
    ];
    const [projected] = projectProposedStatePreviews({
      reviews: [review],
      inbox: { projection_root: root("d"), entries: new Map() },
      revisions,
      transitions: [{
        parent_sha: baseCommit,
        commit_sha: terminalCommit,
        pending_removed: [review.target],
        accepted_added: [],
      }],
      historical: new Map([[baseCommit, {
        state: "available",
        projection_root: root("e"),
        entries: new Map([[proposalId, { proposal_id: proposalId }]]),
      }]]),
      currentCommit,
    });

    expect(projected.proposed_state_preview).toMatchObject({
      authority_effect: "none",
      state: "unavailable",
      entry_root: null,
      terminal: { proposal_status: "withdrawn", applied_exactly_as_reviewed: null },
      blocker: { code: "producer_withdrawal_no_decision_preview" },
    });
  });
});

describe("current repository object projection", () => {
  test("counts current Standing without dropping retained supersession lineage", () => {
    const repositoryId = "123e4567-e89b-42d3-a456-426614174000";
    const claims = [
      { repository_id: repositoryId, standing: "accepted" },
      { repository_id: repositoryId, standing: "unassessed" },
      { repository_id: repositoryId, standing: "superseded" },
      { repository_id: "223e4567-e89b-42d3-a456-426614174000", standing: "accepted" },
    ];
    expect(currentClaimStandingCounts(claims, repositoryId)).toEqual({
      claim_count: 2,
      accepted_claim_count: 1,
      pending_claim_count: 1,
    });
  });

  test("retains the exact Core Decision Inbox packet on pending review rows", () => {
    const claim = {
      claim_id: "vcl_pending",
      claim_root: root("1"),
      assertion: "Bounded pending result",
    };
    const packet = {
      proposal_id: "vpr_pending",
      inputs: { proposal_root: root("2") },
      staleness: { state: "current" },
      entry_root: root("3"),
    };
    const projected = projectReviewFromCore({
      proposal_id: packet.proposal_id,
      proposal_root: root("2"),
      status: "pending_review",
      subject_standing: "unassessed",
      decision: null,
      withdrawal: null,
      decision_inbox_entry: packet,
      record: {
        proposal_id: packet.proposal_id,
        action: "claim.add",
        subject: { id: claim.claim_id, root: claim.claim_root },
      },
    }, new Map([[claim.claim_id, claim]]), []);
    expect(projected.decision_packet).toBe(packet);
  });

  test("derives a rooted graph from current Claims and artifacts without a checked-in snapshot", () => {
    const claims = [
      {
        claim_id: "vcl_source",
        claim_root: root("1"),
        standing: "accepted",
        assertion: "Source Claim",
        assertion_kind: "theoretical",
        source_title: "source",
        record: {
          relations: [{ kind: "supports", target_claim_id: "vcl_target" }],
          evidence: [{
            artifact_id: "a".repeat(64),
            artifact_root: root("a"),
            relation: "supports",
          }],
        },
      },
      {
        claim_id: "vcl_target",
        claim_root: root("2"),
        standing: "accepted",
        assertion: "Target Claim",
        assertion_kind: "theoretical",
        source_title: "target",
        record: { relations: [], evidence: [] },
      },
    ];
    const current = {
      repository: { repository_id: "123e4567-e89b-42d3-a456-426614174000", origin_root: root("3") },
      origin: { origin_id: "vro_0123456789abcdef" },
      artifacts: [{
        artifact_id: "a".repeat(64),
        artifact_root: root("a"),
        byte_length: 42,
      }],
    };
    const graph = projectGraph("fixture", root("4"), current, claims, []);
    expect(graph.metadata).toMatchObject({
      source_path: ".vela/repository.json + canonical records",
      source_repository_root: root("4"),
      node_count: 3,
      edge_count: 2,
      claim_count: 2,
    });
    /* The kind is the protocol's word. The builder wrote `finding` and the
       Problems translated it back on every read; both nodes here are Claims
       and the projection now says so. */
    expect(graph.nodes.filter(({ kind }) => kind === "claim")).toHaveLength(2);
    expect(graph.nodes.map(({ node_id }) => node_id).sort()).toEqual([
      `artifact:${"a".repeat(64)}`,
      "vcl_source",
      "vcl_target",
    ]);
    expect(graph.edges.map(({ relation }) => relation).sort()).toEqual(["supports", "supports"]);
  });

  test("projects terminal Proposal axes from the Core export", () => {
    const claim = { claim_id: "vcl_terminal", claim_root: root("1"), assertion: "Bounded Claim" };
    const base = {
      proposal_id: "vpr_terminal",
      proposal_root: root("2"),
      status: "rejected",
      subject_standing: "unassessed",
      decision_inbox_entry: null,
      withdrawal: null,
      record: {
        proposal_id: "vpr_terminal",
        action: "claim.add",
        subject: { id: claim.claim_id, root: claim.claim_root },
      },
    };
    const rejected = projectReviewFromCore({
      ...base,
      decision: {
        actor_id: "reviewer:agent",
        actor_class: "agent",
        session_ref: "entire:checkpoint:opaque",
        authority_principal_id: "local:fixture",
        decided_at: "2026-07-28T05:30:38Z",
        reason: "The wording is stale.",
        decision_event: { semantic_event_id: "vev_decision" },
        applied_event: null,
      },
    }, new Map([[claim.claim_id, claim]]), []);
    expect(rejected).toMatchObject({
      status: "rejected",
      decision_event_id: "vev_decision",
      applied_event_id: null,
      decision_actor_class: "agent",
      decision_authority_principal_id: "local:fixture",
    });

    const withdrawn = projectReviewFromCore({
      ...base,
      status: "withdrawn",
      decision: null,
      withdrawal: {
        actor: "agent:producer",
        created_at: "2026-08-01T13:30:17Z",
        reason: "Replaced before Decision.",
      },
    }, new Map([[claim.claim_id, claim]]), []);
    expect(withdrawn).toMatchObject({
      status: "withdrawn",
      reviewed_by: "agent:producer",
      decision_event_id: null,
      applied_event_id: null,
      decision_provenance: "producer_withdrawal",
    });
  });

  test("keeps correction relation distinct from authoritative superseded Standing", () => {
    const claim = { claim_id: "vcl_predecessor", claim_root: root("1"), assertion: "Earlier Claim" };
    const proposal = {
      proposal_id: "vpr_predecessor",
      proposal_root: root("2"),
      status: "accepted",
      subject_standing: "superseded",
      decision: null,
      decision_inbox_entry: null,
      withdrawal: null,
      record: {
        proposal_id: "vpr_predecessor",
        action: "claim.add",
        subject: { id: claim.claim_id, root: claim.claim_root },
      },
    };
    const transition = {
      predecessor_claim_id: claim.claim_id,
      successor_claim_id: "vcl_successor",
      relation_kind: "corrects",
    };
    expect(projectReviewFromCore(
      proposal,
      new Map([[claim.claim_id, claim]]),
      [transition],
    )).toMatchObject({
      claim_retirement: "corrected",
      retired_by_claim_id: "vcl_successor",
    });
    expect(projectReviewFromCore(
      proposal,
      new Map([[claim.claim_id, claim]]),
      [{ ...transition, relation_kind: "supersedes" }],
    )).toMatchObject({
      claim_retirement: "superseded",
      retired_by_claim_id: "vcl_successor",
    });
  });

  test("preserves exact Core Submission, Verification, and reviewer bindings", () => {
    const claimId = "vcl_current";
    const proposalId = "vpr_current";
    const submissionId = "vsb_current";
    const submissionRoot = root("5");
    const reviewMethodRoot = root("8");
    const core = projection({
      claims: [{
        claim_id: claimId,
        claim_root: root("1"),
        source_path: "records/claims/current.json",
        standing: "accepted",
        active: true,
        proposal_status: "accepted",
        record: {
          claim_id: claimId,
          assertion: { text: "Bounded result", kind: "computational" },
          conditions: [], evidence: [], provenance: [], relations: [],
        },
      }],
      proposals: [{
        proposal_id: proposalId,
        proposal_root: root("2"),
        source_path: "records/proposals/current.json",
        status: "accepted",
        subject_standing: "accepted",
        decision: null,
        withdrawal: null,
        decision_inbox_entry: null,
        record: {
          action: "claim.add",
          created_at: "2026-07-27T12:01:00Z",
          subject: { id: claimId, root: root("1") },
          producer_package: {
            kind: "submission", id: submissionId, root: submissionRoot,
            path: "records/submissions/current.json",
          },
        },
      }],
      submissions: [{
        object_id: submissionId,
        object_root: submissionRoot,
        source_path: "records/submissions/current.json",
        payload: {
          provenance: { producer: "agent:producer", emitted_at: "2026-07-27T12:00:00Z" },
          authentication: { identity_binding: { actor_id: "agent:producer" } },
        },
        envelope: { payloadType: "application/vnd.vela.submission.v3+json" },
      }],
      verifications: [{
        object_id: "vvr_current",
        object_root: root("6"),
        source_path: "records/verifications/current.json",
        payload: {
          subject: {
            submission_id: submissionId, submission_root: submissionRoot,
            proposal_id: proposalId, claim_id: claimId,
          },
          outcome: "pass",
          identity: { actor_id: "agent:codex-review" },
          completed_at: "2026-07-27T12:02:00Z",
          scope: { property: "statement_fidelity", does_not_establish: ["Standing"] },
        },
        envelope: { payloadType: "application/vnd.vela.verification-record.v2+json" },
        review_method: {
          state: "verified",
          root: reviewMethodRoot,
          method: {
            reviewer: {
              kind: "ai_model", display_name: "GPT-5.6 Sol",
              identifier: "gpt-5.6-sol", provider: "OpenAI", version: null,
            },
          },
        },
      }],
    });
    const current = currentRepositoryFromProjection(core);
    expect(current.claims.map(({ standing }: { standing: string }) => standing)).toEqual(["accepted"]);
    const projected = projectCurrentObjects(current);
    expect(projected.submissions[0]).toMatchObject({
      submission_id: submissionId, proposal_id: proposalId, claim_id: claimId,
    });
    expect(projected.verifications[0]).toMatchObject({
      verification_record_id: "vvr_current",
      submission_id: submissionId,
      proposal_id: proposalId,
      claim_id: claimId,
      outcome: "pass",
      reviewer_kind: "ai_model",
      reviewer_display_name: "GPT-5.6 Sol",
      review_method_root: reviewMethodRoot,
    });

    const drift = currentRepositoryFromProjection(core);
    drift.verifications[0].record.subject.proposal_id = "vpr_wrong";
    expect(() => projectCurrentObjects(drift)).toThrow("Proposal binding drift");
  });
});
