import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ alias: vi.fn(), redirect: vi.fn(), view: vi.fn(), notFound: vi.fn() }));
vi.mock("@vela/projection-data", () => ({ problemPublicRouteForLegacyPath: mocks.alias }));
vi.mock("@/components/vela/problem-page", () => ({ ProblemPageView: (props: Record<string, unknown>) => { mocks.view(props); return <div>Legacy exact Problem</div>; } }));
vi.mock("next/navigation", () => ({
  permanentRedirect: (href: string) => { mocks.redirect(href); throw new Error(`REDIRECT ${href}`); },
  notFound: () => { mocks.notFound(); throw new Error("NOT_FOUND"); },
}));

import LegacyProblemPage from "./page";

describe("legacy Repository Problem routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("permanently redirects a reviewed old route and preserves URL-backed mode", async () => {
    mocks.alias.mockReturnValue({ canonical_path: "/problems/erdos-problems/321" });
    await expect(LegacyProblemPage({ params: Promise.resolve({ repository: "math", problem: "321" }), searchParams: Promise.resolve({ mode: "work", tracking: "drop-me" } as never) })).rejects.toThrow("REDIRECT /problems/erdos-problems/321?mode=work");
  });

  it("keeps an unreviewed exact route renderable", async () => {
    mocks.alias.mockReturnValue(null);
    render(await LegacyProblemPage({ params: Promise.resolve({ repository: "math", problem: "999" }), searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Legacy exact Problem")).toBeInTheDocument();
    expect(mocks.view).toHaveBeenCalledWith(expect.objectContaining({ repository: "math", problem: "999", route: "/p/math/999" }));
  });
});
