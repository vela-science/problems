import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ state: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/scientific-state", () => ({ scientificProblemState: mocks.state }));
vi.mock("@/lib/auth", () => ({
  currentAccount: () => Promise.resolve(null),
  authConfiguration: () => ({ enabled: true }),
}));
vi.mock("next/navigation", () => ({ notFound: () => { mocks.notFound(); throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/vela/mode-switcher", () => ({ ModeSwitcher: () => <nav>Problem mode</nav> }));
vi.mock("@/components/vela/problem-state", () => ({ ProblemState: () => <section>Exact current State</section> }));
vi.mock("@/components/vela/workbench", () => ({ Workbench: () => <section>Workspace</section> }));

import { ProblemPageView } from "./problem-page";

const exactState = {
  repositoryName: "Vela Math",
  problem: { source_id: "source:erdos-problems", node_id: "erdos:321", native_kind: "problem", statement: "Exact Problem" },
  source: {
    content_root: `sha256:${"a".repeat(64)}`,
    row_root: `sha256:${"c".repeat(64)}`,
    summary: "Exact Problem",
    title: "Exact Problem",
  },
};

describe("canonical Problem source binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.mockResolvedValue(exactState);
  });

  it("renders only when the current exact source identity and content root match", async () => {
    render(await ProblemPageView({
      repository: "math",
      problem: "321",
      route: "/problems/erdos-problems/321",
      query: {},
      expectedSource: {
        sourceId: "source:erdos-problems",
        nativeId: "erdos:321",
        nativeKind: "problem",
        contentRoot: `sha256:${"a".repeat(64)}`,
      },
    }));
    expect(screen.getByRole("heading", { level: 1, name: "Exact Problem" })).toBeInTheDocument();
  });

  it("refuses a canonical alias whose exact source bytes drift", async () => {
    await expect(ProblemPageView({
      repository: "math",
      problem: "321",
      route: "/problems/erdos-problems/321",
      query: {},
      expectedSource: {
        sourceId: "source:erdos-problems",
        nativeId: "erdos:321",
        nativeKind: "problem",
        contentRoot: `sha256:${"b".repeat(64)}`,
      },
    })).rejects.toThrow("NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
