import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ reviewed: vi.fn(), view: vi.fn(), notFound: vi.fn() }));

vi.mock("@vela/projection-data", () => ({
  canonicalProblemPath: (repository: string, problem: string) => (
    repository === "math" && /^[1-9][0-9]*$/u.test(problem) ? `/problems/erdos-problems/${problem}` : null
  ),
  repositoryForCanonicalProblemNamespace: (namespace: string) => (
    namespace === "erdos-problems" ? "math" : undefined
  ),
  problemPublicRouteForCanonicalPath: mocks.reviewed,
  problemResolutionConfig: { entities: [{
    entity_id: "problem:erdos:321",
    canonical_occurrence: { source_id: "source:erdos-problems", native_id: "erdos:321", native_kind: "problem", content_root: "sha256:source" },
  }] },
}));
vi.mock("@/components/vela/problem-page", () => ({
  ProblemPageView: (props: Record<string, unknown>) => { mocks.view(props); return <div>Problem</div>; },
}));
vi.mock("next/navigation", () => ({ notFound: () => { mocks.notFound(); throw new Error("NOT_FOUND"); } }));

import ProblemPage, { generateMetadata } from "./page";

const open = (namespace: string, problem: string, query: Record<string, string> = {}) =>
  ProblemPage({ params: Promise.resolve({ namespace, problem }), searchParams: Promise.resolve(query as never) });

describe("the canonical Problem address", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /* A reviewed Problem keeps the stronger guarantee: the record on screen is
     checked against the exact occurrence a reviewer pinned. */
  it("hands a reviewed Problem the occurrence its entity declares", async () => {
    mocks.reviewed.mockReturnValue({ entity_id: "problem:erdos:321" });
    render(await open("erdos-problems", "321", { mode: "work" }));
    expect(screen.getByText("Problem")).toBeInTheDocument();
    expect(mocks.view).toHaveBeenCalledWith(expect.objectContaining({
      repository: "math",
      problem: "321",
      route: "/problems/erdos-problems/321",
      expectedSource: { sourceId: "source:erdos-problems", nativeId: "erdos:321", nativeKind: "problem", contentRoot: "sha256:source" },
    }));
  });

  /* And the 1,211 that were never reviewed into an entity resolve too. They
     had no canonical address at all before, which is why the Repository-shaped
     path could not retire. Identity without review means no expectedSource:
     there is no pinned root to check against, and inventing one would assert a
     review nobody performed. */
  it("resolves a Problem with no reviewed entity, and pins nothing", async () => {
    mocks.reviewed.mockReturnValue(null);
    render(await open("erdos-problems", "999"));
    expect(mocks.view).toHaveBeenCalledWith(expect.objectContaining({
      repository: "math",
      problem: "999",
      route: "/problems/erdos-problems/999",
      expectedSource: undefined,
    }));
  });

  it("refuses a malformed or unknown address", async () => {
    await expect(open("Erdos", "321")).rejects.toThrow("NOT_FOUND");
    await expect(open("not-a-namespace", "321")).rejects.toThrow("NOT_FOUND");
    await expect(open("erdos-problems", "0")).rejects.toThrow("NOT_FOUND");
  });

  it("declares its own canonical address", async () => {
    mocks.reviewed.mockReturnValue(null);
    expect(await generateMetadata({ params: Promise.resolve({ namespace: "erdos-problems", problem: "999" }), searchParams: Promise.resolve({}) }))
      .toMatchObject({ alternates: { canonical: "/problems/erdos-problems/999" } });
  });
});
