import { describe, expect, it } from "bun:test";
import { problemResolutionConfig, problemResolutionConfigRoot } from "./problem-resolution";
import {
  parseProblemPublicRoutes,
  problemPublicRouteForCanonicalPath,
  problemPublicRouteForLegacyPath,
  problemPublicRoutes,
  problemPublicRoutesRoot,
} from "./problem-public-routes";

describe("reviewed public Problem routes", () => {
  it("binds every durable alias to the exact reviewed resolver", () => {
    expect(problemPublicRoutes.resolver_root).toBe(problemResolutionConfigRoot);
    expect(problemPublicRoutes.routes).toHaveLength(6);
    expect(problemPublicRoutesRoot).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(problemPublicRouteForCanonicalPath("/problems/erdos-problems/321")).toMatchObject({
      entity_id: "problem:erdos:321",
      current_path: "/p/math/321",
    });
    expect(problemPublicRouteForLegacyPath("/p/math/321")?.canonical_path).toBe("/problems/erdos-problems/321");
    expect(problemPublicRouteForLegacyPath("/p/math/999")).toBeNull();
  });

  it("refuses resolver drift, duplicate paths, unknown entities, and malformed bindings", () => {
    const wrongRoot = structuredClone(problemPublicRoutes);
    wrongRoot.resolver_root = `sha256:${"0".repeat(64)}` as typeof wrongRoot.resolver_root;
    expect(() => parseProblemPublicRoutes(wrongRoot)).toThrow(/resolver root/u);

    const duplicate = structuredClone(problemPublicRoutes);
    duplicate.routes[1]!.canonical_path = duplicate.routes[0]!.canonical_path;
    expect(() => parseProblemPublicRoutes(duplicate)).toThrow(/drifts|duplicated/u);

    const unknown = structuredClone(problemPublicRoutes);
    unknown.routes[0]!.entity_id = "problem:erdos:999";
    expect(() => parseProblemPublicRoutes(unknown)).toThrow(/unknown resolver entity/u);

    const wrongBinding = structuredClone(problemPublicRoutes);
    wrongBinding.routes[0]!.current_path = "/p/math/999";
    expect(() => parseProblemPublicRoutes(wrongBinding)).toThrow(/invalid current Repository binding/u);

    const driftedResolution = structuredClone(problemResolutionConfig);
    driftedResolution.entities[0]!.problem_number = 999;
    expect(() => parseProblemPublicRoutes(problemPublicRoutes, driftedResolution, problemResolutionConfigRoot)).toThrow(/drifts/u);
  });
});

/* The invariant any canonical-route migration has to preserve.
 *
 * A reader's address for a Problem is its canonical path, and the legacy `/p/`
 * form is the address that already exists in links and bookmarks. Those two
 * must name the same Problem in both directions, whatever the route table
 * grows into: today six routes are entity-backed, and the open question is
 * whether the other 1,211 source-native Problems get canonical addresses by
 * being declared reviewed groupings (they have not been reviewed) or by
 * resolving through their canonical occurrence instead.
 *
 * Either way this has to keep holding, and it is what makes the eventual
 * `/p/…` redirect provably lossless rather than spot-checked. */
describe("canonical and legacy Problem addresses", () => {
  it("round-trip to each other for every published route", () => {
    for (const route of problemPublicRoutes.routes) {
      expect(problemPublicRouteForLegacyPath(route.current_path)?.canonical_path)
        .toBe(route.canonical_path);
      expect(problemPublicRouteForCanonicalPath(route.canonical_path)?.current_path)
        .toBe(route.current_path);
      for (const legacy of route.legacy_paths) {
        expect(problemPublicRouteForLegacyPath(legacy)?.canonical_path).toBe(route.canonical_path);
      }
    }
  });

  it("resolves no address it does not publish", () => {
    expect(problemPublicRouteForCanonicalPath("/problems/erdos-problems/999999")).toBeNull();
    expect(problemPublicRouteForLegacyPath("/p/math/999999")).toBeNull();
    expect(problemPublicRouteForCanonicalPath("/problems/not-a-namespace/1")).toBeNull();
  });
});
