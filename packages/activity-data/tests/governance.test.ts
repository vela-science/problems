import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");

describe("Workspace implementation permission matrix", () => {
  test("binds the complete hosted mutation surface to the reviewed Server Action owner", () => {
    const actions = read("apps/problems/src/app/actions/activity.ts");
    const expectedActions = [
      "createWorkspaceAction",
      "followProblemAction",
      "createApproachAction",
      "forkApproachAction",
      "createAttemptAction",
      "updateAttemptAction",
      "addDiscussionAction",
      "appendWorkspaceCrdtUpdateAction",
      "attachArtifactAction",
      "saveSubmissionDraftAction",
    ];
    const actualActions = [...actions.matchAll(/export async function ([A-Za-z0-9_$]+)\(/gu)]
      .map((match) => match[1]);
    expect(actualActions).toEqual(expectedActions);
    expect(actions).toContain("const hosted = await currentAccount()");
    expect(actions).toContain("requireExpectedAnchorRoot(anchorRoot, expectedAnchorRoot)");
    expect(actions).toContain("return ensureCurrentAccount({");
  });

  test("keeps collaborative CRDT updates rooted, bounded, and non-authoritative", () => {
    const migration = read("packages/activity-data/schema/workspace-crdt.sql");
    const action = read("apps/problems/src/app/actions/activity.ts");
    expect(migration).toContain("update_bytes bytea NOT NULL CHECK (octet_length(update_bytes) BETWEEN 1 AND 262144)");
    expect(migration).toContain("p_update_root <> 'sha256:' || encode(public.digest(v_update_bytes, 'sha256'), 'hex')");
    expect(migration).toContain("PERFORM activity.require_membership(p_account_id, p_workspace_id)");
    expect(migration).toContain("v_anchor_root := activity.ensure_anchor(p_workspace_id, p_anchor)");
    expect(migration).toContain("authority_effect text NOT NULL DEFAULT 'none' CHECK (authority_effect = 'none')");
    expect(migration).toContain("'crdt_update.append', 'crdt_update'");
    expect(migration).not.toMatch(/Decision|Verification|Standing write|scientific State write/iu);
    expect(action).toContain("appendWorkspaceCrdtUpdateAction");
    expect(action).toContain('documentName: "canvas"');
    expect(action).toContain('updateRoot: text(form, "updateRoot", 71)');
  });

  test("keeps the database command vocabulary closed and membership-gated", () => {
    const migrations = readdirSync(resolve(repositoryRoot, "packages/activity-data/schema"))
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => read(`packages/activity-data/schema/${name}`))
      .join("\n");
    const definitions = [...migrations.matchAll(
      /CREATE OR REPLACE FUNCTION activity_api\.execute_command\([\s\S]*?\n\$function\$;/gu,
    )].map((match) => match[0]);
    const executeCommand = definitions.at(-1);
    expect(executeCommand).toBeDefined();

    const allowlist = /IF p_kind NOT IN \(\s*([\s\S]*?)\s*\) THEN/u.exec(executeCommand ?? "");
    expect(allowlist).not.toBeNull();
    const actualCommands = [...(allowlist?.[1] ?? "").matchAll(/'([^']+)'/gu)]
      .map((match) => match[1]);
    const expectedCommands = [
      "follow.set",
      "approach.create",
      "approach.fork",
      "attempt.create",
      "attempt.update",
      "discussion.add",
      "artifact.attach",
      "submission_draft.save",
    ];
    expect(actualCommands).toEqual(expectedCommands);
    expect(executeCommand).toContain("PERFORM activity.require_membership(p_account_id, p_workspace_id)");
    expect(executeCommand).toContain("SECURITY DEFINER\nSET search_path = pg_catalog, activity");
    expect(executeCommand).not.toMatch(/'(?:decision|verification|standing|event)\.[^']*'/iu);
  });

  test("binds tenant reads, private-note visibility, and unsigned export to membership", () => {
    const initial = read("packages/activity-data/schema/base.sql");
    const currentRead = read("packages/activity-data/schema/current-anchor-read.sql");
    for (const sql of [initial, currentRead]) {
      expect(sql).toContain("PERFORM activity.require_membership(p_account_id, p_workspace_id)");
      expect(sql).toContain("x.visibility='workspace' OR x.author_account_id=p_account_id");
    }
    expect(initial).toContain("CREATE OR REPLACE FUNCTION activity_api.export_submission_draft");
    const exportFunction = initial.slice(initial.indexOf("CREATE OR REPLACE FUNCTION activity_api.export_submission_draft"));
    expect(exportFunction).toContain("PERFORM activity.require_membership(p_account_id, p_workspace_id)");

    const liveProof = read("packages/activity-data/scripts/live-proof.mjs");
    expect(liveProof).toContain('"cross-tenant activity read"');
    expect(liveProof).toContain('"cross-tenant activity write"');
    expect(liveProof).toContain('"unsigned draft export without membership"');
    expect(liveProof).toContain('"private note crossed its author boundary"');
    expect(liveProof).toContain("Number(catalog.table_count) !== 20");
    expect(liveProof).toContain("DELETE FROM activity.workspaces");
    expect(liveProof).toContain("cleanupProved: true");
  });

  test("does not load hosted locators or activity for a signed-out reader", () => {
    const workspace = read("apps/problems/src/components/vela/problem-workspace.tsx");
    const signedOutBranch = workspace.indexOf("if (!hostedAccount) {");
    const signedOutReturn = workspace.indexOf("return <section", signedOutBranch);
    const activityLoad = workspace.indexOf("const loaded = await loadWorkspace");
    expect(signedOutBranch).toBeGreaterThan(-1);
    expect(signedOutReturn).toBeGreaterThan(-1);
    expect(activityLoad).toBeGreaterThan(signedOutReturn);
    expect(workspace.match(/getProblemActivity\(/gu)).toHaveLength(1);

    const artifactFrame = read("packages/ui/src/components/vela/rooted-artifact-frame.tsx");
    expect(artifactFrame).toContain("artifact.locator");
    expect(artifactFrame).not.toMatch(/<a[^>]+artifact\.locator/iu);
  });

  test("keeps the application role out of base tables and both hosted planes separate", () => {
    const privileges = read("packages/activity-data/database-privileges.sql");
    const migration = read("packages/activity-data/schema/base.sql");
    const verifier = read("packages/activity-data/scripts/verify-roles.mjs");
    expect(privileges).toContain("REVOKE CONNECT, TEMP ON DATABASE vela_activity FROM PUBLIC");
    expect(privileges).toContain("REVOKE CONNECT, TEMP ON DATABASE vela_projection FROM PUBLIC");
    expect(migration).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA activity FROM PUBLIC, vela_activity_app");
    expect(migration).toContain("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA activity_api TO vela_activity_app");
    expect(verifier).toContain("matrix.base_access");
    expect(verifier).toContain("matrix.problems_connect");
    expect(verifier).toContain("matrix.projection_reader_activity_connect");
  });

  test("keeps signing local and grants no hosted Verification, Decision, or Standing path", () => {
    const packageJson = JSON.parse(read("packages/activity-data/package.json"));
    expect(packageJson.scripts["submission:sign-local"])
      .toBe("bun scripts/sign-submission-draft.mjs");

    const appActions = read("apps/problems/src/app/actions/activity.ts");
    const draftRoute = read("apps/problems/src/app/drafts/[id]/export/route.ts");
    expect(appActions).not.toMatch(/@vela\/activity-data\/local-signing|createPrivateKey|signSubmissionDraftLocally\s*\(/u);
    expect(draftRoute).toContain('"Cache-Control": "private, no-store"');
    expect(draftRoute).toContain('"X-Vela-Signing-State"');
    expect(draftRoute).not.toMatch(/@vela\/activity-data\/local-signing|createPrivateKey|signSubmissionDraftLocally\s*\(/u);

    const boundary = read("scripts/scientific-authority-boundary.mjs");
    expect(boundary).toContain("ScientificEvent|Verification|Proposal");
    expect(boundary).toContain("forbiddenSecretEnvironment");
    expect(boundary).toContain("hosted_signing_dependency");
  });

});
