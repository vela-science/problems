import { describe, expect, it } from "vitest";
import { accessibleGitHubRepositoryCount } from "./github-connections";

describe("GitHub connection summary", () => {
  it("does not call repositories from suspended installations accessible", () => {
    expect(accessibleGitHubRepositoryCount({
      installations: [
        { installationId: 1, suspended: false },
        { installationId: 2, suspended: true },
      ],
      repositories: [
        { installationId: 1 },
        { installationId: 2 },
      ],
    })).toBe(1);
  });
});
