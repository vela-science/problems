import type { HashRoot } from "./canonical";
import { describe, expect, test } from "bun:test";
import { compareExactRepositoryRevisions, type RepositoryRevision } from "./index";

const root = (digit: string): HashRoot => `sha256:${digit.repeat(64)}`;

function revision(overrides: Partial<RepositoryRevision> = {}): RepositoryRevision {
  const gitCommit = overrides.git_commit ?? "1".repeat(40);
  const repositoryRoot: HashRoot | null = overrides.repository_root === undefined ? root("1") : overrides.repository_root;
  const replayState = overrides.replay_state ?? "verified";
  return {
    git_commit: gitCommit,
    parent_commit: null,
    git_tree: "2".repeat(40),
    source_repository_id: "123e4567-e89b-42d3-a456-426614174000",
    source_index_root: repositoryRoot ?? root("9"),
    repository_root: repositoryRoot,
    replay_state: replayState,
    revision_root: root("3"),
    record: {
      schema: "vela.projection-revision.v1",
      authority_effect: "none",
      identity: {
        repository_id: "123e4567-e89b-42d3-a456-426614174000",
        git_commit: gitCommit,
        git_tree: "2".repeat(40),
        repository_root: repositoryRoot,
      },
      reader: {
        version: "vela 0.972.1",
        binary_root: root("4"),
        projection_schema: "vela.repository-projection.v1",
        projection_root: root("5"),
      },
      replay: replayState === "verified"
        ? { state: "verified", integrity: "strict_pass", blocker_codes: [] }
        : { state: "unavailable", integrity: "blocked", blocker_codes: ["unsupported"] },
      state: replayState === "verified"
        ? { accepted_claim_ids: [], unassessed_claim_ids: [] }
        : null,
      source_index_root: repositoryRoot ?? root("9"),
      nonclaims: [
        "A Git commit is not a Vela Decision.",
        "This read projection has no authority effect.",
      ],
    },
    ...overrides,
  };
}

describe("exact Repository revision comparison", () => {
  test("derives a rooted typed delta without claiming authority", () => {
    const before = revision();
    before.record.state = {
      accepted_claim_ids: ["vcl_retained"],
      unassessed_claim_ids: ["vcl_added"],
    };
    const after = revision({
      git_commit: "5".repeat(40),
      repository_root: root("5"),
      revision_root: root("6"),
    });
    after.record.state = {
      accepted_claim_ids: ["vcl_added", "vcl_retained"],
      unassessed_claim_ids: [],
    };
    const comparison = compareExactRepositoryRevisions(before, after);
    expect(comparison).toMatchObject({
      schema: "vela.projection-semantic-delta.v1",
      authority_effect: "none",
      accepted: { added: ["vcl_added"], removed: [], before: 1, after: 2 },
      unassessed: { added: [], removed: ["vcl_added"], before: 1, after: 0 },
    });
    expect(comparison.comparison_root).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(comparison.nonclaims.join(" ")).toContain("does not make a Decision");
  });

  test("refuses unavailable states and Repository identity changes", () => {
    expect(() => compareExactRepositoryRevisions(
      revision({ replay_state: "unavailable", repository_root: null }),
      revision(),
    )).toThrow("two strict-replayed revisions");
    const otherRepository = revision({ source_repository_id: "another-repository" });
    otherRepository.record.identity.repository_id = "another-repository";
    expect(() => compareExactRepositoryRevisions(revision(), otherRepository))
      .toThrow("Repository identity boundary");
  });

  test("refuses inner identity, root, and replay-state drift", () => {
    const identityDrift = revision();
    identityDrift.record.identity.git_commit = "7".repeat(40);
    expect(() => compareExactRepositoryRevisions(identityDrift, revision()))
      .toThrow("identity binding drift");

    const sourceRootDrift = revision();
    sourceRootDrift.record.source_index_root = root("8");
    expect(() => compareExactRepositoryRevisions(sourceRootDrift, revision()))
      .toThrow("identity binding drift");

    const stateDrift = revision();
    stateDrift.record.state = null;
    expect(() => compareExactRepositoryRevisions(stateDrift, revision()))
      .toThrow("replay binding drift");
  });
});
