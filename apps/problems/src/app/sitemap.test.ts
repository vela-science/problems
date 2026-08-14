import { describe, expect, it, vi } from "vitest";

vi.mock("@vela/projection-data", () => ({
  allRepositories: () => Promise.resolve([]),
  projectionManifest: () => Promise.resolve({ generated_at: "2026-08-13T00:00:00Z" }),
  allClaimRouteIds: () => Promise.resolve([]),
  allProblemRouteIds: () => Promise.resolve([]),
  mathSourceRegistryRead: () => Promise.resolve({ sources: [] }),
  problemPublicRoutes: {
    routes: [{ canonical_path: "/problems/erdos-problems/321" }],
  },
}));

import sitemap from "./sitemap";

describe("public sitemap", () => {
  it("publishes reviewed canonical Problem routes without advertising legacy Repository aliases", async () => {
    const urls = (await sitemap()).map(({ url }) => url);
    expect(urls).toContain("https://problems.science/problems/erdos-problems/321");
    expect(urls).not.toContain("https://problems.science/p/math/321");
  });
});
