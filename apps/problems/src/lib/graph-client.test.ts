import { afterEach, describe, expect, test, vi } from "vitest";
import { loadGraph, orderGraphNodesForLedger, type GraphClientNode } from "./graph-client";

const root = `sha256:${"a".repeat(64)}`;

afterEach(() => vi.unstubAllGlobals());

describe("root-bound graph projection", () => {
  test("orders the record view by scientific object kind and natural identifier", () => {
    const node = (id: string, kind: string): GraphClientNode => ({ id, kind, label: id, plane: null, trust: null, standing: "recorded", href: null, x: 0, y: 0 });
    expect(orderGraphNodesForLedger([
      node("va_1", "artifact"),
      node("erdos:10", "problem"),
      node("vcl_2", "claim"),
      node("erdos:2", "problem"),
      node("vpr_1", "proposal"),
    ]).map(({ id }) => id)).toEqual(["erdos:2", "erdos:10", "vcl_2", "vpr_1", "va_1"]);
  });

  test("requests the complete exact-root canvas with URL filters", async () => {
    const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(() => Promise.resolve(new Response(JSON.stringify({
      schema: "vela.projection-graph.v1",
      root,
      repository: "erdos",
      view: "canvas",
      lens: "research",
      total: 1,
      next_cursor: null,
      nodes: [],
      edges: [],
      selected: null,
      neighbor_total: 0,
      neighbors: [],
    }), { headers: { "X-Vela-Projection-Root": root } })));
    vi.stubGlobal("fetch", fetch);

    await loadGraph({ root, repository: "erdos", view: "canvas", lens: "research", kind: "problem", node: "erdos:1" });

    const href = String(fetch.mock.calls[0][0]);
    const params = new URL(href, "https://problems.science").searchParams;
    expect(params.get("root")).toBe(root);
    expect(params.get("repository")).toBe("erdos");
    expect(params.get("view")).toBe("canvas");
    expect(params.get("limit")).toBe("5000");
    expect(params.get("kind")).toBe("problem");
    expect(params.get("node")).toBe("erdos:1");
    expect(fetch).toHaveBeenCalledWith(href, expect.objectContaining({ cache: "force-cache", credentials: "omit" }));
  });

  test("fails closed when the response root drifts", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      schema: "vela.projection-graph.v1", root, nodes: [], edges: [],
    }), { headers: { "X-Vela-Projection-Root": `sha256:${"b".repeat(64)}` } }))));
    await expect(loadGraph({ root, repository: "erdos", view: "canvas", lens: "all" })).rejects.toThrow("projection header is invalid");
  });

  test("refuses inferred relationships in the exact research lens", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      schema: "vela.projection-graph.v1", root, repository: "erdos", view: "canvas", lens: "research",
      total: 2, next_cursor: null, nodes: [], selected: null, neighbor_total: 0, neighbors: [],
      edges: [{ id: "edge:1", source: "problem:1", target: "claim:1", relation: "similar", trust: null, inferred: true }],
    }), { headers: { "X-Vela-Projection-Root": root } }))));

    await expect(loadGraph({ root, repository: "erdos", view: "canvas", lens: "research" }))
      .rejects.toThrow("research map returned an inferred relationship");
  });
});
