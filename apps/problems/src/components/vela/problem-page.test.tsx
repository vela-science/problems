import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ state: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/scientific-state", () => ({ scientificProblemState: mocks.state }));
vi.mock("@/lib/auth", () => ({
  currentAccount: () => Promise.resolve(null),
  authConfiguration: () => ({ enabled: true }),
}));
vi.mock("next/navigation", () => ({ notFound: () => { mocks.notFound(); throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/vela/link-tabs", () => ({ LinkTabs: ({ tabs }: { tabs: Array<{ key: string; label: string }> }) => <nav>{tabs.map((tab) => <span key={tab.key}>{tab.label}</span>)}</nav> }));
vi.mock("@/components/vela/problem-summary", () => ({ ProblemAnswerStrip: () => <dl>Answer strip</dl> }));
vi.mock("@/components/vela/problem-state", () => ({
  ProblemState: ({ researchView }: { researchView: string }) => <section>Public tool: {researchView}</section>,
}));
vi.mock("@/components/vela/problem-workspace", () => ({ ProblemWorkspace: () => <section>Workspace surface</section> }));
vi.mock("@/components/vela/problem-overview-reference", () => ({
  ProblemReferenceHeader: ({ problemNumber, collectionName }: { problemNumber: string; collectionName: string }) => <header><h1>Exact Problem</h1><span>{collectionName}</span><span>#{problemNumber}</span></header>,
  ProblemReferenceTabs: ({ current }: { current: string }) => <nav aria-label="Problem sections">{["Overview", "Work", "Results", "Sources", "History"].map((label) => <span key={label} aria-current={current === label.toLowerCase() ? "page" : undefined}>{label}</span>)}</nav>,
  ProblemOverviewReference: () => <section>Overview surface</section>,
}));

import { ProblemPageView } from "./problem-page";
import { ProjectionReadError } from "@vela/projection-data/refusal";

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

  it("renders unsupported local projection drift as configuration guidance", async () => {
    mocks.state.mockRejectedValueOnce(new ProjectionReadError(
      "foreign_manifest",
      "Unsupported Problems projection",
    ));
    render(await ProblemPageView({
      repository: "math",
      problem: "321",
      collectionName: "Erdős Problems",
      route: "/problems/erdos-problems/321",
      query: {},
    }));
    expect(screen.getByRole("heading", { name: "Projection configuration needs attention" })).toBeInTheDocument();
    expect(screen.getByText(/VELA_PROJECTION_DATABASE_URL/u)).toBeInTheDocument();
    expect(screen.getByText(/will not reinterpret an older release/u)).toBeInTheDocument();
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

  it("defaults the bare URL to the reference Overview", async () => {
    render(await page({}));
    expect(screen.getByText("Overview surface")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.queryByText("Research")).toBeNull();
    expect(screen.queryByText("Contributions")).toBeNull();
  });

  /* The heading is now the question, so the page has to say which Problem the
     question belongs to. The breadcrumb is chrome: it scrolls away, it is
     absent from print, and a reader who lands deep needs the citable identity
     beside the statement, not only above it. */
  it("states its collection-qualified identity beside the question", async () => {
    render(await page({}));
    expect(screen.getByText("Erdős Problems")).toBeVisible();
    expect(screen.getByText("#321")).toBeVisible();
  });

  it.each([
    ["results", "contributions"],
    ["sources", "files"],
    ["history", "timeline"],
  ] as const)("serves the reference %s tab with the existing %s surface", async (view, surface) => {
    render(await page({ view }));
    expect(screen.getByText(`Public tool: ${surface}`)).toBeInTheDocument();
  });

  it("folds the retired Map address into Results", async () => {
    render(await page({ view: "map" }));
    expect(screen.getByText("Public tool: contributions")).toBeInTheDocument();
    expect(screen.getByText("Results")).toHaveAttribute("aria-current", "page");
  });

  it("maps the retired Work address to Workspace", async () => {
    render(await page({ view: "work" }));
    expect(screen.getByText("Workspace surface")).toBeInTheDocument();
  });

  /* Published links keep meaning what they meant: every retired address
     resolves to the section that absorbed it rather than 404ing or falling
     silently to the default. */
  it.each([
    ["evidence", "Public tool: contributions"],
    ["contributions", "Public tool: contributions"],
    ["files", "Public tool: files"],
    ["sources", "Public tool: files"],
    ["history", "Public tool: timeline"],
    ["record", "Public tool: timeline"],
    ["workspace", "Workspace surface"],
  ] as const)("resolves the retired view=%s address", async (view, expected) => {
    render(await page({ view }));
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("resolves the legacy mode=work address to the Work view", async () => {
    render(await page({ mode: "work" }));
    expect(screen.getByText("Workspace surface")).toBeInTheDocument();
  });

  it("resolves an unknown view to Overview rather than an empty page", async () => {
    render(await page({ view: "poem" }));
    expect(screen.getByText("Overview surface")).toBeInTheDocument();
  });

  /* The frame holds still across the tabs: one archetype for all five views,
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
