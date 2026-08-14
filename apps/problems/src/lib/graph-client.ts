import type { GraphLens } from "@vela/projection-data/read-contracts";
import type { ObjectContextDirection, SiteObjectContext } from "@vela/projection-data";

export interface GraphClientNode {
  id: string; kind: string; label: string; plane: string | null; trust: string | null;
  standing: string; href: string | null; x: number; y: number;
}
export interface GraphClientEdge {
  id: string; source: string; target: string; relation: string; trust: string | null;
  inferred: boolean;
}
export interface GraphResponse {
  schema: "vela.projection-graph.v1"; root: string; repository: string; view: string;
  lens: GraphLens; total: number; next_cursor: string | null;
  nodes: GraphClientNode[]; edges: GraphClientEdge[];
  selected: (GraphClientNode & { content?: Record<string, unknown> }) | null;
  neighbor_total: number;
  neighbors: Array<GraphClientNode & {
    edge_id: string; source: string; target: string; direction: ObjectContextDirection;
    relation: string; outgoing: boolean; edge_trust: string | null;
    inferred: boolean; source_root: string | null; evidence: string | null;
  }>;
  object_context: SiteObjectContext | null;
}

const ledgerKindPriority = new Map([
  ["problem", 0],
  ["claim", 1],
  ["proposal", 2],
  ["verifier_attachment", 3],
  ["artifact", 4],
]);

export function orderGraphNodesForLedger(nodes: GraphClientNode[]): GraphClientNode[] {
  return [...nodes].sort((a, b) =>
    (ledgerKindPriority.get(a.kind) ?? 9) - (ledgerKindPriority.get(b.kind) ?? 9)
    || a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
}

export async function loadGraph(input: {
  root: string; repository: string; view: "canvas" | "ledger"; lens: GraphLens; kind?: string; relation?: string;
  trust?: string; standing?: string; q?: string; node?: string;
}): Promise<GraphResponse> {
  const params = new URLSearchParams({ root: input.root, repository: input.repository, view: input.view, lens: input.lens, limit: "5000" });
  for (const key of ["kind", "relation", "trust", "standing", "q", "node"] as const) if (input[key]) params.set(key, input[key]);
  const response = await fetch(`/api/graph?${params}`, { cache: "force-cache", credentials: "omit" });
  if (!response.ok) throw new Error(`graph projection returned HTTP ${response.status}`);
  if (response.headers.get("X-Vela-Projection-Root") !== input.root) throw new Error("graph response projection header is invalid");
  const value = await response.json() as Partial<GraphResponse>;
  if (value.schema !== "vela.projection-graph.v1" || value.root !== input.root || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) throw new Error("graph response identity is invalid");
  return value as GraphResponse;
}
