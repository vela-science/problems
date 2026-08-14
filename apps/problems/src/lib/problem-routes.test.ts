import { beforeEach, describe, expect, it, vi } from "vitest";

const lookup = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@vela/projection-data", () => ({ problemPublicRouteForLegacyPath: lookup }));

import { publicProblemPath, publicProblemWorkspacePath } from "./problem-routes";

describe("public Problem paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookup.mockImplementation((path: string) => path === "/p/math/321"
      ? { canonical_path: "/problems/erdos-problems/321" }
      : null);
  });

  it("uses reviewed canonical routes and leaves unreviewed Repository routes durable", () => {
    expect(publicProblemPath("math", "321")).toBe("/problems/erdos-problems/321");
    expect(publicProblemPath("math", "999")).toBe("/p/math/999");
    expect(publicProblemWorkspacePath("math", "321", "workspace one")).toBe("/problems/erdos-problems/321?mode=work&workspace=workspace+one");
  });
});
