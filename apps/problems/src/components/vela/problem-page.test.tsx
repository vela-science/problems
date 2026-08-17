import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ state: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/scientific-state", () => ({ scientificProblemState: mocks.state }));
vi.mock("@/lib/auth", () => ({
  currentAccount: () => Promise.resolve(null),
  authConfiguration: () => ({ enabled: true }),
}));
vi.mock("next/navigation", () => ({ notFound: () => { mocks.notFound(); throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/vela/link-tabs", () => ({ LinkTabs: () => <nav>Problem views</nav> }));
vi.mock("@/components/vela/problem-summary", () => ({ ProblemAnswerStrip: () => <dl>Answer strip</dl> }));
vi.mock("@/components/vela/problem-state", () => ({
  ProblemState: ({ view }: { view: string }) => <section>Public view: {view}</section>,
}));
vi.mock("@/components/vela/problem-workspace", () => ({ ProblemWorkspace: () => <section>Workspace surface</section> }));

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
      collectionName: "Erdős Problems",
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
      collectionName: "Erdős Problems",
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

describe("Problem view addressing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.mockResolvedValue(exactState);
  });

  const page = (query: Record<string, string>) => ProblemPageView({
    repository: "math",
    problem: "321",
    collectionName: "Erdős Problems",
    route: "/problems/erdos-problems/321",
    query,
  });

  it("defaults the bare URL to the Overview", async () => {
    render(await page({}));
    expect(screen.getByText("Public view: overview")).toBeInTheDocument();
  });

  it.each(["evidence", "history"] as const)("serves %s as its own address", async (view) => {
    render(await page({ view }));
    expect(screen.getByText(`Public view: ${view}`)).toBeInTheDocument();
  });

  it("serves Work as the fourth view", async () => {
    render(await page({ view: "work" }));
    expect(screen.getByText("Workspace surface")).toBeInTheDocument();
  });

  /* Published links keep meaning what they meant: every retired address
     resolves to the section that absorbed it rather than 404ing or falling
     silently to the default. */
  it.each([
    ["sources", "Public view: evidence"],
    ["record", "Public view: history"],
    ["workspace", "Workspace surface"],
  ] as const)("resolves the retired view=%s address", async (view, expected) => {
    render(await page({ view }));
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("resolves the legacy mode=work address to the Work view", async () => {
    render(await page({ mode: "work" }));
    expect(screen.getByText("Workspace surface")).toBeInTheDocument();
  });

  it("resolves an unknown view to the Overview rather than an empty page", async () => {
    render(await page({ view: "poem" }));
    expect(screen.getByText("Public view: overview")).toBeInTheDocument();
  });

  /* The frame holds still across the tabs: one archetype for all four views,
     with only the layout widening for the Workspace. A tab switch must not
     repaint the page's ground or move the hero. */
  it("keeps one archetype across public and Workspace views", async () => {
    const { container: statePage } = render(await page({}));
    const { container: workPage } = render(await page({ view: "workspace" }));
    expect(statePage.querySelector("article")).toHaveAttribute("data-archetype", "problem");
    expect(workPage.querySelector("article")).toHaveAttribute("data-archetype", "problem");
    expect(workPage.querySelector("article")).toHaveAttribute("data-layout", "canvas");
  });
});
