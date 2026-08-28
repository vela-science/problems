import { describe, expect, it, vi } from "vitest";

vi.mock("@vela/projection-data", () => ({
  allRepositories: () => Promise.resolve([]),
  projectionManifest: () => Promise.resolve({ generated_at: "2026-08-13T00:00:00Z" }),
  allClaimRouteIds: () => Promise.resolve([]),
  allProblemRouteIds: () => Promise.resolve([
    { repository: "math", problem: "321" },
    { repository: "math", problem: "999" },
  ]),
  canonicalProblemPath: (repository: string, problem: string) => (
    repository === "math" ? `/problems/erdos-problems/${problem}` : null
  ),
  mathSourceRegistryRead: () => Promise.resolve({ sources: [] }),
  formalConjecturesCollection: { data: { items: [{ route_slug: "wikipedia-oppermann-conjecture" }] } },
}));

import sitemap from "./sitemap";

describe("public sitemap", () => {
  /* Every Problem, not only the reviewed ones — and one address each. The
     Repository-scoped record view is a different page about the same Problem,
     so publishing both asked a crawler to index two URLs for one record. */
  it("publishes one canonical address per Problem", async () => {
    const urls = (await sitemap()).map(({ url }) => url);
    expect(urls).toContain("https://problems.science/problems");
    expect(urls).toContain("https://problems.science/problems/erdos-problems");
    expect(urls).toContain("https://problems.science/problems/erdos-problems/321");
    expect(urls).toContain("https://problems.science/problems/erdos-problems/999");
    expect(urls).toContain("https://problems.science/problems/formal-conjectures");
    expect(urls).toContain("https://problems.science/problems/formal-conjectures/wikipedia-oppermann-conjecture");
    expect(urls).not.toContain("https://problems.science/p/math/321");
    expect(urls).not.toContain("https://problems.science/repositories/math/problems/321");
    /* `about` is not here: the page is gone. PRODUCT.md names vela.space as the
       editorial origin, and Problems must not carry a second editorial surface. */
    for (const route of ["privacy", "terms", "accessibility", "contact"]) {
      expect(urls).toContain(`https://problems.science/${route}`);
    }
    expect(urls).not.toContain("https://problems.science/about/endless-frontiers");
  });
});
