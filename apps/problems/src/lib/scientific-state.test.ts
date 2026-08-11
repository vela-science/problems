import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const reads = vi.hoisted(() => ({
  manifest: vi.fn(),
  repository: vi.fn(),
  detail: vi.fn(),
  sourceRead: vi.fn(),
}));

vi.mock("@vela/observatory-data", () => ({
  observatoryProjectionManifest: reads.manifest,
  repositoryBySlug: reads.repository,
  problemDetail: reads.detail,
  mathSourceRegistryRead: reads.sourceRead,
}));

import { featuredProblems, scientificProblemState } from "./scientific-state";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;

describe("Problems scientific state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reads.manifest.mockResolvedValue({
      release_root: root("1"),
      generated_at: "2026-08-11T20:00:00Z",
      source_repositories: [{ repository_id: "repo:math", repository_root: root("2"), commit: "3".repeat(40), tree: "4".repeat(40) }],
    });
    reads.repository.mockResolvedValue({ status: { repository: { id: "repo:math", name: "Math" } } });
    reads.detail.mockResolvedValue({
      record: { node_id: "erdos:321", problem: "321", statement: "A statement" },
      claims: [{ id: `vcl_${"5".repeat(64)}`, root: root("6"), standing: "accepted" }],
      offers: [], reviews: [],
    });
    reads.sourceRead.mockResolvedValue({
      native_records: [{ native_id: "erdos:321", native_kind: "problem", row_root: root("7"), observation_root: root("8"), locators: [{ url: "https://example.test/problem" }] }],
    });
  });

  it("keeps the first workbench set fixed to five exact Problem pages", () => {
    expect(featuredProblems.map(({ repository, problem }) => `${repository}/${problem}`)).toEqual([
      "math/203", "math/264", "math/321", "math/521", "math/730",
    ]);
    expect(featuredProblems.find(({ problem }) => problem === "321")).toMatchObject({
      dossier: "erdos-321",
      dossierRepository: "math",
    });
  });

  it("composes an activity anchor only from exact Observatory reads", async () => {
    const state = await scientificProblemState("math", "321");
    expect(reads.sourceRead).toHaveBeenCalledWith(expect.objectContaining({ root: root("1"), nativeId: "erdos:321", nativeKind: "problem" }));
    expect(state?.anchor).toEqual({
      projectionReleaseRoot: root("1"),
      repositoryId: "repo:math",
      repositoryRoot: root("2"),
      sourceCommit: "3".repeat(40),
      sourceTree: "4".repeat(40),
      problemId: "erdos:321",
      problemRecordRoot: root("7"),
      sourceObservationRoot: root("8"),
      claimId: `vcl_${"5".repeat(64)}`,
      claimRoot: root("6"),
      claimStanding: "accepted",
    });
  });
});
