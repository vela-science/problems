import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { GraphClientNode, GraphResponse } from "@/lib/graph-client";
import { RepositoryGraph } from "./repository-graph";
import { loadGraph } from "@/lib/graph-client";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/graph",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => navigation.params,
}));

vi.mock("@/lib/graph-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/graph-client")>(),
  loadGraph: vi.fn(),
}));

function node(overrides: Partial<GraphClientNode>): GraphClientNode {
  return { id: "vcl_1", kind: "claim", label: "A claim", plane: null, trust: null, standing: "accepted", href: null, x: 0, y: 0, ...overrides };
}

const nodes = [
  node({}),
  node({ id: "proposal:1", kind: "proposal", label: "A proposal", standing: "withdrawn" }),
  node({ id: "verifier:1", kind: "verifier_attachment", label: "An attachment", standing: "verified" }),
  node({ id: "artifact:1", kind: "artifact", label: "An artifact", standing: "recorded" }),
];

describe("RepositoryGraph ledger", () => {
  beforeEach(() => {
    navigation.params = new URLSearchParams();
    window.history.replaceState(null, "", "/graph");
    vi.mocked(loadGraph).mockReset();
    vi.mocked(loadGraph).mockResolvedValue({
      schema: "vela.projection-graph.v1", root: "sha256:test", repository: "erdos", view: "ledger",
      lens: "research", total: nodes.length, next_cursor: null, nodes, edges: [],
      selected: null, neighbor_total: 0, neighbors: [], object_context: null,
    } satisfies GraphResponse);
  });

  test("heads the mixed state column for what its values have in common, not one axis", async () => {
    navigation.params = new URLSearchParams("view=records");
    const view = render(<RepositoryGraph root="sha256:test" initialRepository="erdos" repositories={["erdos"]} />);

    await waitFor(() => expect(screen.getByRole("columnheader", { name: "State" })).toBeVisible());
    expect(screen.queryByRole("columnheader", { name: "Standing" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Standing" })).toBeNull();
    await userEvent.click(screen.getByRole("combobox", { name: "State" }));

    expect(await screen.findByRole("group", { name: "Proposed change status" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Check outcome" })).toBeVisible();
    /* "All states", not the bare word "all": both controllers draw this select
       from one component now, and search already spelled the escape hatch out. */
    expect(screen.getByRole("option", { name: "All states" })).toBeVisible();
    view.unmount();
  });

  test("opens as a human-labelled map instead of a protocol ledger", async () => {
    const longAssertion = "At a retained exact commit, this very long internal assertion explains every binding and resolver detail before a reader knows what object it is.";
    vi.mocked(loadGraph).mockResolvedValueOnce({
      schema: "vela.projection-graph.v1", root: "sha256:test", repository: "erdos", view: "ledger",
      lens: "research", total: 1, next_cursor: null,
      nodes: [node({ id: "claim:1", kind: "claim", label: longAssertion, standing: "accepted" })], edges: [],
      selected: null, neighbor_total: 0, neighbors: [], object_context: null,
    } satisfies GraphResponse);

    render(<RepositoryGraph root="sha256:test" initialRepository="erdos" repositories={["erdos"]} />);

    expect(await screen.findByRole("tab", { name: "Map", selected: true })).toBeVisible();
    /* The row leads with what makes it different from the row above it. The
       title used to prepend the standing — "Superseded Result" — while a badge
       on the same row read "standing · superseded", so the map's entry list
       opened on three rows sharing a title, a badge, and the first line of one
       commit sentence. The state has one channel now, and the title has the
       identity. */
    expect(screen.getByText(longAssertion)).toHaveClass("line-clamp-2");
    expect(screen.getByText("Result")).toBeVisible();
    expect(screen.queryByText("Accepted Result")).toBeNull();
    expect(screen.getAllByText(/accepted/iu)).toHaveLength(1);
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("names the axis each row's state belongs to", async () => {
    navigation.params = new URLSearchParams("view=records");
    const view = render(<RepositoryGraph root="sha256:test" initialRepository="erdos" repositories={["erdos"]} />);

    const table = await screen.findByRole("table");
    const rows = within(table);
    /* A Proposal status and a Verification outcome share this column with a
       Claim standing; each says which vocabulary its word came from. */
    expect(rows.getByText("standing · accepted")).toBeVisible();
    expect(rows.getByText("proposal · withdrawn")).toBeVisible();
    expect(rows.getByText("verification · verified")).toBeVisible();
    /* The Artifact row read "standing · recorded", which named the Claim
       vocabulary for a word that vocabulary does not contain — every Artifact
       and Problem node in the projection carries `recorded`. A word on no
       declared axis is printed bare and its badge claims no axis. */
    expect(rows.getByText("recorded")).toBeVisible();
    expect(rows.queryByText("standing · recorded")).toBeNull();
    expect(rows.getByText("recorded").closest("[data-axis]")).toBeNull();
    expect(rows.getByText("proposal · withdrawn").closest("[data-axis]")).toHaveAttribute("data-axis", "proposal");
    expect(rows.queryByText("vcl_1")).toBeNull();
    view.unmount();
  });

  test("keeps rooted artifact identifiers behind technical detail", async () => {
    navigation.params = new URLSearchParams("view=records&node=claim%3A1");
    const artifactRoot = "2db17099b421ef43d4892ddedcdd7b1bfecfbcb6cca0134f7f561bcd8df7b0c1";
    vi.mocked(loadGraph).mockResolvedValueOnce({
      schema: "vela.projection-graph.v1", root: "sha256:test", repository: "erdos", view: "canvas",
      lens: "research", total: 2, next_cursor: null,
      nodes: [node({ id: "claim:1" }), node({ id: "artifact:1", kind: "artifact", label: artifactRoot, standing: "recorded" })],
      edges: [], selected: node({ id: "claim:1" }), neighbor_total: 1,
      neighbors: [{ ...node({ id: "artifact:1", kind: "artifact", label: artifactRoot, standing: "recorded" }), edge_id: "edge:1", source: "claim:1", target: "artifact:1", direction: "outgoing", relation: "supports", outgoing: true, edge_trust: null, inferred: false, source_root: null, evidence: null }],
      object_context: null,
    } satisfies GraphResponse);

    render(<RepositoryGraph root="sha256:test" initialRepository="erdos" repositories={["erdos"]} />);

    expect(await screen.findByRole("heading", { name: "Direct relationships" })).toBeVisible();
    expect(screen.getAllByText("Research artifact").length).toBeGreaterThan(0);
    expect(screen.queryByText(artifactRoot)).toBeNull();
  });
});
