import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ alias: vi.fn(), view: vi.fn(), notFound: vi.fn() }));

vi.mock("@vela/projection-data", () => ({
  problemPublicRouteForCanonicalPath: mocks.alias,
  problemResolutionConfig: { entities: [{
    entity_id: "problem:erdos:321",
    canonical_occurrence: { source_id: "source:erdos-problems", native_id: "erdos:321", native_kind: "problem", content_root: "sha256:source" },
  }] },
}));
vi.mock("@/components/vela/problem-page", () => ({
  ProblemPageView: (props: Record<string, unknown>) => { mocks.view(props); return <div>Reviewed Problem</div>; },
}));
vi.mock("next/navigation", () => ({ notFound: () => { mocks.notFound(); throw new Error("NOT_FOUND"); } }));

import ReviewedProblemAliasPage, { generateMetadata } from "./page";

describe("reviewed Problem aliases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.alias.mockReturnValue({
      canonical_path: "/problems/erdos-problems/321",
      entity_id: "problem:erdos:321",
      current_repository: "math",
      current_problem: "321",
    });
  });

  it("renders the reviewed Repository-independent alias as the canonical page", async () => {
    render(await ReviewedProblemAliasPage({ params: Promise.resolve({ namespace: "erdos-problems", problem: "321" }), searchParams: Promise.resolve({ mode: "work" }) }));
    expect(screen.getByText("Reviewed Problem")).toBeInTheDocument();
    expect(mocks.view).toHaveBeenCalledWith(expect.objectContaining({
      repository: "math",
      problem: "321",
      route: "/problems/erdos-problems/321",
      query: { mode: "work" },
      expectedSource: { sourceId: "source:erdos-problems", nativeId: "erdos:321", nativeKind: "problem", contentRoot: "sha256:source" },
    }));
    expect(await generateMetadata({ params: Promise.resolve({ namespace: "erdos-problems", problem: "321" }), searchParams: Promise.resolve({}) })).toMatchObject({ alternates: { canonical: "/problems/erdos-problems/321" } });
  });

  it("refuses malformed, unknown, or ambiguous aliases", async () => {
    await expect(ReviewedProblemAliasPage({ params: Promise.resolve({ namespace: "Erdos", problem: "321" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
    mocks.alias.mockReturnValue(null);
    await expect(ReviewedProblemAliasPage({ params: Promise.resolve({ namespace: "erdos-problems", problem: "999" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  });
});
