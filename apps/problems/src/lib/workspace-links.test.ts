import { describe, expect, it, vi } from "vitest";
import type { ProblemDiscovery } from "@/lib/scientific-state";

vi.mock("server-only", () => ({}));
vi.mock("@vela/projection-data", () => ({
  slugForRepositoryId: (id: string) => id === "repo-math" ? "math" : undefined,
}));

import { workspaceProblemLinks } from "@/lib/workspace-links";

const release = `sha256:${"1".repeat(64)}` as const;
const workspace = {
  id: "workspace-1",
  problemContexts: [{
    projectionReleaseRoot: release,
    repositoryId: "repo-math",
    problemId: "erdos:321",
    anchorRoot: `sha256:${"2".repeat(64)}`,
    capturedAt: "2026-08-19T00:00:00.000Z",
  }],
};
const problem = {
  releaseRoot: release,
  repository: "math",
  problem: "321",
  canonicalPath: "/problems/erdos-problems/321",
  collection: { key: "erdos-problems", name: "Erdős Problems" },
  record: { node_id: "erdos:321", label: "Erdős problem 321" },
} as ProblemDiscovery;

describe("My Work Problem links", () => {
  it("opens only an exact Repository and Problem match", () => {
    expect(workspaceProblemLinks(workspace, [problem])).toEqual([expect.objectContaining({
      state: "current",
      label: "Erdős Problems · Erdős problem 321",
      href: "/problems/erdos-problems/321?view=work&workspace=workspace-1",
    })]);
  });

  it("marks earlier release context without hiding the current Problem route", () => {
    const earlier = structuredClone(workspace);
    earlier.problemContexts[0]!.projectionReleaseRoot = `sha256:${"3".repeat(64)}`;
    expect(workspaceProblemLinks(earlier, [problem])[0]).toMatchObject({
      state: "earlier-release",
      href: "/problems/erdos-problems/321?view=work&workspace=workspace-1",
    });
  });

  it("fails closed on unknown repositories, identities, or duplicate matches", () => {
    expect(workspaceProblemLinks({ ...workspace, problemContexts: [{ ...workspace.problemContexts[0]!, repositoryId: "unknown" }] }, [problem])[0])
      .toMatchObject({ state: "unavailable", href: null });
    expect(workspaceProblemLinks(workspace, [{ ...problem, record: { ...problem.record, node_id: "erdos:94" } }])[0])
      .toMatchObject({ state: "unavailable", href: null });
    expect(workspaceProblemLinks(workspace, [problem, { ...problem }])[0])
      .toMatchObject({ state: "unavailable", href: null });
  });
});
