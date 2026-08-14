import { renderToStaticMarkup } from "react-dom/server";
import type { RepositoryRevision } from "@vela/projection-data";
import { describe, expect, test, vi } from "vitest";

const BEFORE_COMMIT = "1".repeat(40);
const AFTER_COMMIT = "2".repeat(40);
const BLOCKED_COMMIT = "3".repeat(40);

function revision(
  commit: string,
  accepted: string[],
  unassessed: string[],
  overrides: Partial<RepositoryRevision> = {},
): RepositoryRevision {
  const verified = overrides.replay_state !== "unavailable";
  return {
    git_commit: commit,
    parent_commit: commit === BEFORE_COMMIT ? null : BEFORE_COMMIT,
    git_tree: commit.replaceAll("2", "a").replaceAll("3", "b"),
    source_repository_id: "vela-science/math",
    source_index_root: `sha256:${"c".repeat(64)}`,
    repository_root: verified ? `sha256:${commit[0]!.repeat(64)}` : null,
    replay_state: verified ? "verified" : "unavailable",
    revision_root: `sha256:${commit[0]!.repeat(64)}`,
    record: {
      schema: "vela.projection-revision.v1",
      authority_effect: "none",
      identity: {
        repository_id: "vela-science/math",
        git_commit: commit,
        git_tree: commit.replaceAll("2", "a").replaceAll("3", "b"),
        repository_root: verified ? `sha256:${commit[0]!.repeat(64)}` : null,
      },
      reader: {
        version: "vela 0.972.1",
        binary_root: `sha256:${"d".repeat(64)}`,
        projection_schema: "vela.repository-projection.v1",
        projection_root: `sha256:${"e".repeat(64)}`,
      },
      replay: verified
        ? { state: "verified", integrity: "strict_pass", blocker_codes: [] }
        : { state: "unavailable", integrity: "not_initialized", blocker_codes: ["not_initialized"] },
      state: verified ? { accepted_claim_ids: accepted, unassessed_claim_ids: unassessed } : null,
      source_index_root: `sha256:${"c".repeat(64)}`,
      nonclaims: [
        "This derived revision does not make a Decision.",
        "Git publication alone does not change Standing.",
      ],
    },
    ...overrides,
  };
}

const REVISIONS = new Map([
  [BEFORE_COMMIT, revision(BEFORE_COMMIT, ["vcl_stable"], ["vcl_review"])],
  [AFTER_COMMIT, revision(AFTER_COMMIT, ["vcl_added", "vcl_stable"], [])],
  [BLOCKED_COMMIT, revision(BLOCKED_COMMIT, [], [], { replay_state: "unavailable" })],
]);

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

vi.mock("@vela/projection-data", async (importOriginal) => ({
  ...await importOriginal<typeof import("@vela/projection-data")>(),
  repositoryBySlug: async (slug: string) => slug === "math" ? {
    slug: "math",
    status: { repository: { name: "Math" } },
    source: { commit: AFTER_COMMIT },
    reviews: [],
  } : undefined,
  revisionForRepository: async (_slug: string, commit: string) => REVISIONS.get(commit) ?? null,
}));

import RevisionComparePage from "./page";

async function render(from?: string, to?: string) {
  return renderToStaticMarkup(await RevisionComparePage({
    params: Promise.resolve({ slug: "math" }),
    searchParams: Promise.resolve({ from, to }),
  } as never));
}

describe("the exact Repository revision comparison", () => {
  test("requires two complete Git commits in the URL", async () => {
    const html = await render("short", AFTER_COMMIT);
    expect(html).toContain("Choose two revisions from State history");
    expect(html).toContain("The comparison URL binds both complete Git commits.");
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  test("shows a rooted semantic delta without implying authority", async () => {
    const html = await render(BEFORE_COMMIT, AFTER_COMMIT);
    expect(html).toContain("Compare exact revisions");
    expect(html).toContain("Semantic delta");
    expect(html).toContain("complete over both replayed Claim sets");
    expect(html).toContain("vcl_added");
    expect(html).toContain("vcl_review");
    expect(html).toContain("1 → 2");
    expect(html).toContain("1 → 0");
    expect(html).toContain("does not make a Decision or change Standing");
    expect(html).toContain("Git publication alone does not establish acceptance");
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  test("refuses to describe an unreplayable Git state as an exact comparison", async () => {
    const html = await render(BLOCKED_COMMIT, AFTER_COMMIT);
    expect(html).toContain("Comparison unavailable");
    expect(html).toContain("could not strictly replay both states");
    expect(html).toContain("not presented as an exact semantic comparison");
    expect(html).not.toContain("Semantic delta");
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  test("does not invent a revision outside the rooted projection", async () => {
    await expect(render("4".repeat(40), AFTER_COMMIT)).rejects.toThrow("NOT_FOUND");
  });
});
