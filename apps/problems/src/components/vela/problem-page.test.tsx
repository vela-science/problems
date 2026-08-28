import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ state: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/scientific-state", () => ({ scientificProblemState: mocks.state }));
vi.mock("@/lib/frontier-timeline", () => ({ problemFrontierMovement: () => Promise.resolve(undefined) }));
vi.mock("@/lib/auth", () => ({
  currentAccount: () => Promise.resolve(null),
  authConfiguration: () => ({ enabled: true }),
}));
vi.mock("next/navigation", () => ({ notFound: () => { mocks.notFound(); throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/vela/problem-state", () => ({
  ProblemState: ({ researchView }: { researchView: string }) => <section>Public tool: {researchView}</section>,
}));
vi.mock("@/components/vela/problem-workspace", () => ({ ProblemWorkspace: () => <section>Workspace surface</section> }));
/* Server-only, like `@/lib/scientific-state` above, and given the same
   treatment. The agent interface has its own suites; this one is about which
   surface the route resolves to. */
vi.mock("@/webmcp/build-context", () => ({ buildWebMcpProblemContext: () => ({ schema: "vela.webmcp-problem-context.v1" }) }));
vi.mock("@/webmcp/register-tools", () => ({ RegisterProblemTools: () => null }));
vi.mock("@/components/vela/problem-overview-reference", () => ({
  ProblemReferenceHeader: ({ collectionName }: { collectionName: string }) => <header><h1>Exact Problem</h1><span>{collectionName}</span></header>,
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
    /* This fixture retains no prose statement, so the Problem's name is the
       title. Where a question IS retained it becomes the h1 instead — the
       science is the object, per DESIGN.md — and a page title is never an
       absence either way. */
    expect(screen.getByRole("heading", { level: 1, name: "Exact Problem" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /No written statement/u })).not.toBeInTheDocument();
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
    /* The surface the URL selects is the assertion. The section names now
       live in the rail, which this page does not render. */
    expect(screen.getByText("Overview surface")).toBeInTheDocument();
    expect(screen.queryByText("Research")).toBeNull();
    expect(screen.queryByText("Contributions")).toBeNull();
  });

  /* Naming the collection is the breadcrumb's job, and only its job.
   *
     It used to be a fact-rail heading — "Erdős Problems says" — beside three
     other state facts. The rail went with the redesign, and the slug that
     briefly replaced it (`erdos-problems/321`, above the title) said the same
     thing the breadcrumb directly above already said, with a switcher that can
     move between collections. Two renderings of one identity, a hand's width
     apart, is the redundancy this redesign exists to remove. `app-header`
     covers the breadcrumb; what this page owes is the Problem's own name. */
  it("names the Problem and leaves its collection to the breadcrumb", async () => {
    render(await page({}));
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.queryByText("erdos-problems/321")).not.toBeInTheDocument();
  });

  it.each([
    ["results", "contributions"],
    ["sources", "files"],
    ["history", "timeline"],
  ] as const)("serves the reference %s tab with the existing %s surface", async (view, surface) => {
    render(await page({ view }));
    expect(screen.getByText(`Public tool: ${surface}`)).toBeInTheDocument();
  });

  it("opens Work from the section's one name", async () => {
    render(await page({ view: "work" }));
    expect(screen.getByText("Workspace surface")).toBeInTheDocument();
  });

  /* The retired spellings are gone, and gone means Overview — the same place
     any other unrecognised value lands. A section that answered to seven names
     could never be pointed at from one. */
  it.each(["map", "evidence", "contributions", "files", "record", "timeline", "workspace"] as const)(
    "no longer answers to the retired view=%s address",
    async (view) => {
      render(await page({ view }));
      expect(screen.getByText("Overview surface")).toBeInTheDocument();
    },
  );

  it("resolves an unknown view to Overview rather than an empty page", async () => {
    render(await page({ view: "poem" }));
    expect(screen.getByText("Overview surface")).toBeInTheDocument();
  });

  /* The frame holds still across the tabs: one archetype for all five views,
     with only the layout widening for the Workspace. A tab switch must not
     repaint the page's ground or move the hero. */
  it("keeps one archetype across public and Workspace views", async () => {
    const { container: statePage } = render(await page({}));
    const { container: workPage } = render(await page({ view: "work" }));
    expect(statePage.querySelector("article")).toHaveAttribute("data-archetype", "problem");
    expect(workPage.querySelector("article")).toHaveAttribute("data-archetype", "problem");
    expect(workPage.querySelector("article")).toHaveAttribute("data-layout", "canvas");
  });
});
