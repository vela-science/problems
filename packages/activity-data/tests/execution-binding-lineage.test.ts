import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { sqlStatements } from "../scripts/sql-statements.mjs";

const packageRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(packageRoot, path), "utf8");
const temporaryRoots: string[] = [];
const root = (digit: string) => `sha256:${digit.repeat(64).slice(0, 64)}`;

function command(name: string, args: string[]) {
  return execFileSync(name, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, LC_ALL: "C" },
  });
}

async function availablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("failed to allocate PostgreSQL port"));
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

afterEach(() => {
  for (const path of temporaryRoots.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("execution-binding lineage migration", () => {
  test("is additive, closed over four roots, and explicitly non-authoritative", () => {
    const migration = read("migrations/20260813_execution_binding_lineage.sql");
    expect(sqlStatements(migration).length).toBeGreaterThan(15);
    for (const field of [
      "execution_packet_root",
      "execution_profile_root",
      "execution_verifier_capsule_root",
      "execution_result_contract_root",
    ]) expect(migration).toContain(`ADD COLUMN ${field} text`);
    expect(migration.match(/ADD COLUMN authority_effect text NOT NULL DEFAULT 'none'/gu)).toHaveLength(3);
    expect(migration.match(/CHECK \(authority_effect = 'none'\)/gu)).toHaveLength(3);
    expect(migration).toContain("execution binding must be null or one exact complete four-root object");
    expect(migration).toContain("binding->>'packet_root' <> approach.target_packet_root");
    expect(migration).toContain("Artifact execution binding differs from selected Attempt");
    expect(migration).toContain("Submission draft execution binding differs from selected Artifact");
    expect(migration).not.toMatch(/Decision|Verification|Standing|scientific State write/iu);
    expect(migration).not.toMatch(/\bDROP\b/iu);
  });

  test("applies after Target binding and enforces exact Approach to Attempt to Artifact to draft lineage", async () => {
    const pgBin = process.env.PG_BIN_DIR ?? command("pg_config", ["--bindir"]).trim();
    const port = await availablePort();
    const tempRoot = mkdtempSync(join(tmpdir(), "vela-execution-lineage-"));
    temporaryRoots.push(tempRoot);
    const data = join(tempRoot, "postgres");
    const log = join(tempRoot, "postgres.log");
    command(join(pgBin, "initdb"), [
      "--pgdata", data, "--username", "postgres", "--auth", "trust", "--no-locale", "--no-instructions",
    ]);
    command(join(pgBin, "pg_ctl"), [
      "--pgdata", data, "--log", log,
      "--options", `-h 127.0.0.1 -p ${port} -k ${tempRoot} -c statement_timeout=5s`,
      "--wait", "start",
    ]);
    const base = `postgres://postgres@127.0.0.1:${port}`;
    const admin = `${base}/postgres?sslmode=disable`;
    const database = `${base}/vela_activity?sslmode=disable`;
    const psql = (url: string, statement: string) => command(join(pgBin, "psql"), [
      url, "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", statement,
    ]).trim();
    const applyFile = (path: string) => command(join(pgBin, "psql"), [
      database, "--set", "ON_ERROR_STOP=1", "--single-transaction", "--file", resolve(packageRoot, path),
    ]);

    try {
      command(join(pgBin, "psql"), [admin, "--set", "ON_ERROR_STOP=1", "--file", resolve(packageRoot, "roles.sql")]);
      psql(admin, "CREATE DATABASE vela_activity");
      psql(database, "GRANT CREATE ON DATABASE vela_activity TO vela_activity_owner");
      applyFile("migrations/20260811_activity_v1.sql");
      applyFile("migrations/20260812_current_anchor_read.sql");
      applyFile("migrations/20260812_target_bound_approach.sql");

      const account = psql(database, "SELECT activity_api.ensure_account('user_A1','Alice','alice@example.test')->>'id'");
      const workspace = psql(database, `SELECT activity_api.create_workspace(
        '${account}'::uuid, 'lineage-test', 'Lineage test', 'workspace-key-a', '${root("a")}'
      )->>'id'`);
      const otherWorkspace = psql(database, `SELECT activity_api.create_workspace(
        '${account}'::uuid, 'lineage-other', 'Other workspace', 'workspace-key-b', '${root("b")}'
      )->>'id'`);
      const anchor = {
        root: root("1"), projection_release_root: root("2"), repository_id: "math",
        repository_root: root("3"), source_commit: "4".repeat(40), source_tree: "5".repeat(40),
        problem_id: "321", problem_record_root: root("6"), source_observation_root: null,
        claim_id: null, claim_root: null, claim_standing: null,
      };
      let requestDigit = 0;
      const execute = (
        workspaceId: string,
        kind: string,
        key: string,
        payload: object,
        expectedVersion: number | null = null,
      ) => {
        const requestRoot = `sha256:${(requestDigit++).toString(16).padStart(64, "0")}`;
        return psql(database, `SELECT activity_api.execute_command(
          '${account}'::uuid, '${workspaceId}'::uuid, ${sqlLiteral(kind)}, ${sqlLiteral(key)},
          ${sqlLiteral(requestRoot)}, ${sqlLiteral(JSON.stringify(payload))}::jsonb,
          ${expectedVersion === null ? "NULL" : expectedVersion}
        )::text`);
      };

      const legacyApproach = JSON.parse(execute(workspace, "approach.create", "legacy-approach-key", {
        anchor, title: "Legacy unbound", summary: "Created before lineage migration.",
      }));
      const legacyAttempt = JSON.parse(execute(workspace, "attempt.create", "legacy-attempt-key", {
        approach_id: legacyApproach.id, provider: "human", title: "Legacy attempt",
      }));
      const legacyArtifact = JSON.parse(execute(workspace, "artifact.attach", "legacy-artifact-key", {
        anchor, attempt_id: legacyAttempt.id, content_root: root("7"), kind: "log", path: "legacy.json",
      }));
      const legacyPayload = {
        schema: "vela.submission.v2",
        identity: { actor_class: "agent", actor_id: "agent:legacy" },
        provenance: { producer: "agent:legacy" },
      };
      const legacyDraft = JSON.parse(execute(workspace, "submission_draft.save", "legacy-draft-key", {
        anchor, draft_id: null, payload: legacyPayload, payload_root: root("8"),
      }));

      applyFile("migrations/20260813_execution_binding_lineage.sql");

      for (const [table, id] of [
        ["attempts", legacyAttempt.id], ["artifact_refs", legacyArtifact.id], ["submission_drafts", legacyDraft.id],
      ]) {
        expect(psql(database, `SELECT concat_ws(',', execution_packet_root, execution_profile_root,
          execution_verifier_capsule_root, execution_result_contract_root), authority_effect
          FROM activity.${table} WHERE id='${id}'::uuid`)).toBe("|none");
      }

      const binding = {
        packet_root: root("9"), profile_root: root("a"),
        verifier_capsule_root: root("b"), result_contract_root: root("c"),
      };
      const boundApproach = JSON.parse(execute(workspace, "approach.create", "bound-approach-key", {
        anchor, title: "Bound", summary: "Exact source offer.", target_id: "math:321:offer",
        target_packet_root: binding.packet_root, target_record_root: null,
      }));
      const attemptPayload = {
        approach_id: boundApproach.id, provider: "agent", title: "Bound attempt", execution_binding: binding,
      };
      const boundAttempt = JSON.parse(execute(workspace, "attempt.create", "bound-attempt-key", attemptPayload));
      expect(boundAttempt).toMatchObject({
        execution_packet_root: binding.packet_root,
        execution_profile_root: binding.profile_root,
        execution_verifier_capsule_root: binding.verifier_capsule_root,
        execution_result_contract_root: binding.result_contract_root,
        authority_effect: "none",
      });
      const repeated = JSON.parse(psql(database, `SELECT activity_api.execute_command(
        '${account}'::uuid, '${workspace}'::uuid, 'attempt.create', 'bound-attempt-key',
        'sha256:${"5".padStart(64, "0")}', ${sqlLiteral(JSON.stringify(attemptPayload))}::jsonb, NULL
      )::text`));
      expect(repeated.id).toBe(boundAttempt.id);

      expect(() => execute(workspace, "attempt.create", "attempt-missing-binding", {
        ...attemptPayload, execution_binding: null,
      })).toThrow(/absent, stale, or different/iu);
      expect(() => execute(workspace, "attempt.create", "attempt-stale-binding", {
        ...attemptPayload, execution_binding: { ...binding, packet_root: root("d") },
      })).toThrow(/absent, stale, or different/iu);
      expect(() => execute(workspace, "attempt.create", "attempt-partial-binding", {
        ...attemptPayload, execution_binding: { packet_root: binding.packet_root },
      })).toThrow(/exact complete four-root object/iu);
      expect(() => execute(workspace, "attempt.create", "unbound-attempt-claimed-binding", {
        approach_id: legacyApproach.id, provider: "agent", title: "Wrongly bound", execution_binding: binding,
      })).toThrow(/unbound Approach requires an unbound Attempt/iu);

      const artifactPayload = {
        anchor, attempt_id: boundAttempt.id, execution_binding: binding,
        content_root: root("d"), kind: "proof", path: "proof.json",
      };
      const boundArtifact = JSON.parse(execute(workspace, "artifact.attach", "bound-artifact-key", artifactPayload));
      expect(boundArtifact.execution_profile_root).toBe(binding.profile_root);
      const secondBoundArtifact = JSON.parse(execute(workspace, "artifact.attach", "bound-artifact-two-key", {
        ...artifactPayload, content_root: root("e"), path: "proof-two.json",
      }));
      expect(() => execute(workspace, "artifact.attach", "artifact-different-binding", {
        ...artifactPayload, content_root: root("e"), path: "different.json",
        execution_binding: { ...binding, profile_root: root("f") },
      })).toThrow(/differs from selected Attempt/iu);
      expect(() => execute(otherWorkspace, "artifact.attach", "artifact-cross-workspace", artifactPayload))
        .toThrow(/Attempt not found for Artifact/iu);

      const submissionBinding = { schema: "vela.execution-binding.v1", ...binding };
      const payload = {
        schema: "vela.submission.v2",
        identity: { actor_class: "agent", actor_id: "agent:bound" },
        provenance: { producer: "agent:bound" },
        execution_binding: submissionBinding,
      };
      const draftPayload = {
        anchor, artifact_id: boundArtifact.id, draft_id: null, payload, payload_root: root("e"),
      };
      const boundDraft = JSON.parse(execute(workspace, "submission_draft.save", "bound-draft-key", draftPayload));
      expect(boundDraft).toMatchObject({
        artifact_id: boundArtifact.id,
        execution_packet_root: binding.packet_root,
        authority_effect: "none",
      });
      expect(() => execute(workspace, "submission_draft.save", "draft-missing-binding", {
        ...draftPayload, payload: { ...payload, execution_binding: undefined },
      })).toThrow(/differs from selected Artifact/iu);
      expect(() => execute(workspace, "submission_draft.save", "draft-different-binding", {
        ...draftPayload,
        payload: { ...payload, execution_binding: { ...submissionBinding, result_contract_root: root("f") } },
      })).toThrow(/differs from selected Artifact/iu);
      expect(() => execute(workspace, "submission_draft.save", "draft-malformed-binding", {
        ...draftPayload, payload: { ...payload, execution_binding: { ...submissionBinding, extra: true } },
      })).toThrow(/Submission execution binding is malformed/iu);
      expect(() => execute(otherWorkspace, "submission_draft.save", "draft-cross-workspace", draftPayload))
        .toThrow(/Artifact not found for Submission draft/iu);
      expect(() => execute(workspace, "submission_draft.save", "draft-version-conflict", {
        ...draftPayload, draft_id: boundDraft.id,
      }, 99)).toThrow(/Submission draft version conflict/iu);
      expect(() => execute(workspace, "submission_draft.save", "draft-artifact-rebind", {
        ...draftPayload, artifact_id: secondBoundArtifact.id, draft_id: boundDraft.id,
      }, 1)).toThrow(/Submission draft version conflict/iu);
      expect(() => execute(workspace, "submission_draft.save", "draft-lineage-rebind", {
        ...draftPayload, artifact_id: legacyArtifact.id, draft_id: boundDraft.id,
        payload: { ...payload, execution_binding: undefined },
      }, 1)).toThrow(/Submission draft version conflict/iu);

      expect(() => psql(database, `UPDATE activity.attempts SET authority_effect='standing'
        WHERE id='${boundAttempt.id}'::uuid`)).toThrow(/activity_attempts_authority_effect_check/iu);
      expect(() => psql(database, `UPDATE activity.artifact_refs SET execution_profile_root=NULL
        WHERE id='${boundArtifact.id}'::uuid`)).toThrow(/activity_artifact_refs_execution_binding_check/iu);
      expect(psql(database, `SELECT count(*) FROM activity.activity_audit_entries
        WHERE subject_id IN ('${boundAttempt.id}','${boundArtifact.id}','${boundDraft.id}')`)).toBe("3");
    } finally {
      command(join(pgBin, "pg_ctl"), ["--pgdata", data, "--wait", "stop"]);
    }
  }, 60_000);
});
