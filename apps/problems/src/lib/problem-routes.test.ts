import { beforeEach, describe, expect, it, vi } from "vitest";

const canonical = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@vela/projection-data", () => ({ canonicalProblemPath: canonical }));

import { publicProblemPath, publicProblemWorkspacePath } from "./problem-routes";

describe("public Problem paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canonical.mockImplementation((repository: string, problem: string) => (
      repository === "math" && /^[1-9][0-9]*$/u.test(problem)
        ? `/problems/erdos-problems/${problem}`
        : null
    ));
  });

  /* Every Problem is addressed, not just the reviewed ones. This used to fall
     back to `/p/{repository}/{problem}` for 1,211 of 1,217 Problems, which is
     why the legacy path could never retire. */
  it("addresses every Problem canonically", () => {
    expect(publicProblemPath("math", "321")).toBe("/problems/erdos-problems/321");
    expect(publicProblemPath("math", "999")).toBe("/problems/erdos-problems/999");
    expect(publicProblemWorkspacePath("math", "321", "workspace one"))
      .toBe("/problems/erdos-problems/321?view=workspace&workspace=workspace+one");
  });

  /* Null so the caller refuses. Returning a path here would emit a link that
     resolves to nothing, which is worse than declining to link at all. */
  it("returns nothing for an address this release cannot compute", () => {
    expect(publicProblemPath("not-a-repository", "1")).toBeNull();
    expect(publicProblemPath("math", "not-a-number")).toBeNull();
    expect(publicProblemWorkspacePath("not-a-repository", "1")).toBeNull();
  });
});
