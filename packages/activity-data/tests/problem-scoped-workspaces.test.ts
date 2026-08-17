import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sqlStatements } from "../scripts/sql-statements.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");

describe("problem-scoped Workspace discovery", () => {
  test("lists only member Workspaces anchored to the exact Repository and Problem", () => {
    const migration = read("packages/activity-data/schema/problem-workspaces.sql");
    expect(sqlStatements(migration)).toHaveLength(4);
    expect(migration).toContain("CREATE OR REPLACE FUNCTION activity_api.list_problem_workspaces");
    expect(migration).toContain("m.account_id = p_account_id");
    expect(migration).toContain("a.workspace_id = w.id");
    expect(migration).toContain("a.repository_id = p_repository_id");
    expect(migration).toContain("a.problem_id = p_problem_id");
    expect(migration).toContain("SECURITY DEFINER\nSET search_path = pg_catalog, activity");
    expect(migration).toContain("REVOKE ALL ON FUNCTION activity_api.list_problem_workspaces");
    expect(migration).toContain("TO vela_activity_app");
  });

  test("binds the application query and Workspace selection to the current Problem", () => {
    const activity = read("packages/activity-data/src/activity.ts");
    const workspace = read("apps/problems/src/components/vela/problem-workspace.tsx");
    expect(activity).toContain("activity_api.list_problem_workspaces($1::uuid, $2, $3)");
    expect(activity).toContain("[accountId, repositoryId, problemId]");
    expect(workspace).toContain("listProblemWorkspaces(");
    expect(workspace).toContain("state.anchor.repositoryId");
    expect(workspace).toContain("state.anchor.problemId");
    expect(workspace).not.toContain("const workspaces = await listWorkspaces(account.id)");
  });
});
