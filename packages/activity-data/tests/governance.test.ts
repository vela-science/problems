import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");

describe("Workspace implementation permission matrix", () => {
  test("binds the complete hosted mutation surface to the reviewed Server Action owner", () => {
    const actions = read("apps/observatory/src/app/actions/activity.ts");
    const expectedActions = [
      "createWorkspaceAction",
      "followProblemAction",
      "createApproachAction",
      "createTargetApproachAction",
      "forkApproachAction",
      "createAttemptAction",
      "updateAttemptAction",
      "addDiscussionAction",
      "createWorkRequestAction",
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

  test("keeps the database command vocabulary closed and membership-gated", () => {
    const migrations = readdirSync(resolve(repositoryRoot, "packages/activity-data/migrations"))
      .filter((name) => /^\d+.*\.sql$/u.test(name))
      .sort()
      .map((name) => read(`packages/activity-data/migrations/${name}`))
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
      "work_request.create",
      "artifact.attach",
      "submission_draft.save",
    ];
    expect(actualCommands).toEqual(expectedCommands);
    expect(executeCommand).toContain("PERFORM activity.require_membership(p_account_id, p_workspace_id)");
    expect(executeCommand).toContain("SECURITY DEFINER\nSET search_path = pg_catalog, activity");
    expect(executeCommand).not.toMatch(/'(?:decision|verification|standing|event)\.[^']*'/iu);
  });

  test("binds tenant reads, private-note visibility, and unsigned export to membership", () => {
    const initial = read("packages/activity-data/migrations/20260811_activity_v1.sql");
    const currentRead = read("packages/activity-data/migrations/20260812_current_anchor_read.sql");
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
  });

  test("does not load hosted locators or activity for a signed-out reader", () => {
    const workbench = read("apps/observatory/src/components/vela/workbench.tsx");
    const signedOutReturn = workbench.indexOf("if (!hostedAccount) return");
    const activityLoad = workbench.indexOf("const loaded = await loadWorkbench");
    expect(signedOutReturn).toBeGreaterThan(-1);
    expect(activityLoad).toBeGreaterThan(signedOutReturn);
    expect(workbench.match(/getProblemActivity\(/gu)).toHaveLength(1);

    const artifactFrame = read("packages/ui/src/components/vela/rooted-artifact-frame.tsx");
    expect(artifactFrame).toContain("artifact.locator");
    expect(artifactFrame).not.toMatch(/<a[^>]+artifact\.locator/iu);
  });

  test("keeps the application role out of base tables and both hosted planes separate", () => {
    const privileges = read("packages/activity-data/database-privileges.sql");
    const migration = read("packages/activity-data/migrations/20260811_activity_v1.sql");
    const verifier = read("packages/activity-data/scripts/verify-roles.mjs");
    expect(privileges).toContain("REVOKE CONNECT, TEMP ON DATABASE vela_activity FROM PUBLIC");
    expect(privileges).toContain("REVOKE CONNECT, TEMP ON DATABASE vela_observatory FROM PUBLIC");
    expect(migration).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA activity FROM PUBLIC, vela_activity_app");
    expect(migration).toContain("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA activity_api TO vela_activity_app");
    expect(verifier).toContain("matrix.base_access");
    expect(verifier).toContain("matrix.observatory_connect");
    expect(verifier).toContain("matrix.observatory_reader_activity_connect");
  });

  test("keeps signing local and grants no hosted Verification, Decision, or Standing path", () => {
    const packageJson = JSON.parse(read("packages/activity-data/package.json"));
    expect(packageJson.scripts["submission:sign-local"])
      .toBe("bun scripts/sign-submission-draft.mjs");

    const appActions = read("apps/observatory/src/app/actions/activity.ts");
    const draftRoute = read("apps/observatory/src/app/drafts/[id]/export/route.ts");
    expect(appActions).not.toMatch(/@vela\/activity-data\/local-signing|createPrivateKey|signSubmissionDraftLocally\s*\(/u);
    expect(draftRoute).toContain('"Cache-Control": "private, no-store"');
    expect(draftRoute).toContain('"X-Vela-Signing-State"');
    expect(draftRoute).not.toMatch(/@vela\/activity-data\/local-signing|createPrivateKey|signSubmissionDraftLocally\s*\(/u);

    const boundary = read("scripts/scientific-authority-boundary.mjs");
    expect(boundary).toContain("ScientificEvent|Verification|Proposal");
    expect(boundary).toContain("forbiddenSecretEnvironment");
    expect(boundary).toContain("hosted_signing_dependency");
  });

  test("binds Target activity through the reviewed non-authoritative implementation", () => {
    const adr = read("docs/architecture/target-bound-approach-adr.md");
    const activityReadme = read("packages/activity-data/README.md");
    const threatModel = read("docs/security/vela-web-threat-model.md");
    const migration = read("packages/activity-data/migrations/20260812_target_bound_approach.sql");
    const actions = read("apps/observatory/src/app/actions/activity.ts");
    const configuration = read("apps/observatory/src/lib/target-bound-approach.ts");
    const workbench = read("apps/observatory/src/components/vela/workbench.tsx");
    const liveProof = read("packages/activity-data/scripts/live-proof.mjs");
    expect(adr).toContain("deployed and enabled; live integration proof passed; remaining interaction matrix tracked below");
    expect(adr).toContain("target_packet_root");
    expect(adr).toContain('authority_effect = "none"');
    for (const releaseRecord of [adr, activityReadme]) {
      const normalizedRecord = releaseRecord.replace(/\s+/gu, " ");
      expect(normalizedRecord).toContain("2026-08-12T22:27:04.266Z");
      expect(normalizedRecord).toContain("sha256:07ece86171ad085aaf61fc055030fc5642740a8deff450a39e5e091e96ef4ba9");
      expect(normalizedRecord).toContain("dpl_5V3urZxnbCpD28RTukVqYGTCbPqD");
      expect(normalizedRecord).toContain("8231c1efd62912c4c95487569a63ffb1e189c805");
      expect(normalizedRecord).toContain("two bound Approach rows for one Target");
      expect(normalizedRecord).toContain("pre-binding `9feb6975` reader");
      expect(normalizedRecord).toContain("authenticated");
      expect(normalizedRecord).toContain("forced-colors");
      expect(normalizedRecord).toContain("dpl_7KpFZumFChqPrNyDugwMeVQVsUiX");
      expect(normalizedRecord).toContain("2f6b11b847cf85651bd975f81da3237453bdbdb9");
      expect(normalizedRecord).toContain("sha256:3f73ed2ac1408d704ed12e2e74616001dc2c2039d07c3d7fbf9031e1e2da8b26");
      expect(normalizedRecord).toContain("sha256:36c2fb19749e1f2decd793228747973b21335b906d07488a73b020f8d4d075b0");
    }
    expect(threatModel).toContain("Exact implementation permission matrix");
    expect(threatModel).toContain("top-of-action default-off feature gate; current-offer guard");
    expect(migration).toContain("activity_approaches_target_binding_check");
    expect(migration).toContain("activity_approaches_authority_effect_check");
    expect(migration).toContain("source_approach.target_packet_root");
    expect(configuration).toContain("VELA_TARGET_BOUND_APPROACH_ENABLED");
    expect(configuration).toContain('if (value === "true")');
    expect(actions.indexOf("requireTargetBoundApproachWriteEnabled()"))
      .toBeLessThan(actions.indexOf("const scope = await mutationContext(form)", actions.indexOf("createTargetApproachAction")));
    expect(actions).toContain("requireCurrentTargetBinding(");
    expect(actions).not.toMatch(/targetRecordRoot:\s*text\(/u);
    expect(workbench).toContain("targetBoundApproachWritesEnabled: targetBoundApproachConfiguration().enabled");
    expect(workbench).toContain("if (enabled) return <TargetApproachForm");
    expect(liveProof).toContain("WHERE target_id IS NOT NULL");
    expect(liveProof).toContain("preEnableBoundApproaches !== 0");
    expect(liveProof).toContain('"cross-tenant Target-bound activity write"');
    expect(liveProof).toContain('"cross-tenant Target-bound activity read"');
    expect(liveProof).toContain("Target-bound create audit did not retain the exact request root once");
    expect(liveProof).toContain("Target-bound fork changed immutable provenance");
  });
});
