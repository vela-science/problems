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
  it("binds five durable aliases to the exact reviewed resolver", () => {
    expect(problemPublicRoutes.resolver_root).toBe(problemResolutionConfigRoot);
    expect(problemPublicRoutes.routes).toHaveLength(5);
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
