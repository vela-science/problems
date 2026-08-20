import { describe, expect, it } from "vitest";
import { problemWorkbenchHandoff } from "./workbench-handoff";

const commit = "a".repeat(40);
const sourceLocator = `https://github.com/teorth/erdosproblems/blob/${commit}/data/problems.yaml`;

describe("Workbench Problem handoff", () => {
  it("carries one exact canonical Problem and full Git ref", () => {
    const value = problemWorkbenchHandoff({ basePath: "/problems/erdos-problems/321", repositorySlug: "math", sourceRevision: commit, sourceLocators: [sourceLocator] });
    const url = new URL(value!);
    expect(url.protocol).toBe("vela-workbench:");
    expect(url.host).toBe("continue");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      v: "1",
      problem: "https://problems.science/problems/erdos-problems/321",
      source: "https://github.com/teorth/erdosproblems.git",
      ref: commit,
      repository: "https://github.com/vela-science/math.git",
    });
  });

  it.each([
    ["symbolic ref", { basePath: "/problems/erdos-problems/321", repositorySlug: "math", sourceRevision: "main", sourceLocators: [sourceLocator] }],
    ["nested query", { basePath: "/problems/erdos-problems/321/work", repositorySlug: "math", sourceRevision: commit, sourceLocators: [sourceLocator] }],
    ["path traversal", { basePath: "/problems/erdos-problems/../321", repositorySlug: "math", sourceRevision: commit, sourceLocators: [sourceLocator] }],
    ["unknown Repository", { basePath: "/problems/erdos-problems/321", repositorySlug: "unknown", sourceRevision: commit, sourceLocators: [sourceLocator] }],
    ["mismatched source ref", { basePath: "/problems/erdos-problems/321", repositorySlug: "math", sourceRevision: commit, sourceLocators: [`https://github.com/teorth/erdosproblems/blob/${"b".repeat(40)}/data/problems.yaml`] }],
  ])("fails closed on %s", (_label, input) => {
    expect(problemWorkbenchHandoff(input)).toBeNull();
  });
});
