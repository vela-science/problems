import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sqlStatements } from "../scripts/sql-statements.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");

describe("followed Problem discovery", () => {
  test("lists only follows in Workspaces this account still belongs to", () => {
    const migration = read("packages/activity-data/schema/followed-problems.sql");
    expect(sqlStatements(migration)).toHaveLength(4);
    expect(migration).toContain("CREATE OR REPLACE FUNCTION activity_api.list_followed_problems");
    /* The membership join is the tenant guard, exactly as in every other
       activity read. A follow in a Workspace this account was removed from
       stops being readable rather than surviving as an orphan. */
    expect(migration).toContain("JOIN activity.workspace_memberships m");
    expect(migration).toContain("m.workspace_id = f.workspace_id AND m.account_id = f.account_id");
    expect(migration).toContain("WHERE f.account_id = p_account_id");
    expect(migration).toContain("SECURITY DEFINER\nSET search_path = pg_catalog, activity");
    expect(migration).toContain("REVOKE ALL ON FUNCTION activity_api.list_followed_problems");
    expect(migration).toContain("TO vela_activity_app");
  });

  test("reads only, and keeps the earliest follow per Problem", () => {
    const migration = read("packages/activity-data/schema/followed-problems.sql");
    /* A watch answers "what changed since I started watching", so the anchor it
       compares against must be the first state this account saw. DISTINCT ON
       with an ascending created_at is what fixes that; ordering it the other way
       would silently re-baseline the watch on every later follow. */
    expect(migration).toContain("DISTINCT ON (a.repository_id, a.problem_id)");
    expect(migration).toContain("ORDER BY a.repository_id, a.problem_id, f.created_at\n");
    expect(migration).toContain("LANGUAGE sql\nSTABLE");
    /* No command, no notification record, no unread state: this fragment adds a
       read and nothing else. */
    expect(migration).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE)\b/u);
  });

  test("binds the application read and derives the watch from two exact states", () => {
    const activity = read("packages/activity-data/src/activity.ts");
    expect(activity).toContain("activity_api.list_followed_problems($1::uuid)");
    expect(activity).toContain("[accountId]");

    /* `following` stays exact-anchor only. The watch is built on top of that
       invariant, never by relaxing it: a release must not silently inherit a
       follow of a state the reader has not seen. */
    const contracts = read("packages/activity-data/src/contracts.ts");
    expect(contracts).toContain("return followedAnchorRoots.includes(currentAnchorRoot);");

    const watch = read("apps/problems/src/lib/problem-watch.ts");
    expect(watch).toContain("if (activity.following || !activity.followedAnchorRoots.length) return null;");
    expect(watch).toContain("earliest.projectionReleaseRoot");
    /* The watch reports reach and refuses the sentence a reader would most like
       it to say. Reaching Decision is a Repository accepting a Claim, and no
       watch may render that as a question being settled. Scoped to the
       sentences the module can emit, so the prose explaining the ban does not
       trip it. */
    const sentences = watch.slice(watch.indexOf("export function problemWatchSentence"));
    expect(sentences).toContain("Reach advanced to");
    expect(sentences).not.toMatch(/\b(solved|answered|resolved|proved|settled|complete)\b/iu);
  });
});

/* The applied-SQL half of this fragment's proof lives in `scripts/live-proof.mjs`
   as `followedProblemListProved`, run against the real Neon activity database by
   `bun run --filter @vela/activity-data db:live-proof`. It drives the function
   with two accounts and asserts the three properties this file can only read as
   text: one row per Problem, the earliest followed anchor, and no crossing of a
   tenant boundary. A second proof against a throwaway local PostgreSQL would
   assert the same things about a database nothing ships from. */
