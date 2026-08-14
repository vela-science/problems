import type { GraphClientEdge, GraphClientNode } from "@/lib/graph-client";
import type { WorkspaceObject, WorkspaceObjectGroup } from "@/components/vela/workspace-types";

const groupX: Record<WorkspaceObjectGroup, number> = {
  work: 0,
  outputs: 1,
};

const stateFor = (object: WorkspaceObject) => {
  if (object.kind === "research-block" || object.kind === "draft") return "retained";
  if (object.kind === "attempt") return "active";
  return "neutral";
};

export function workspaceCanvasGraph(objects: WorkspaceObject[]): {
  nodes: GraphClientNode[];
  edges: GraphClientEdge[];
} {
  const drawable = objects.filter((object) => object.kind !== "overview");
  const indexes = new Map<WorkspaceObjectGroup, number>();
  const counts = new Map<WorkspaceObjectGroup, number>();
  for (const object of drawable) counts.set(object.group, (counts.get(object.group) ?? 0) + 1);
  const nodes: GraphClientNode[] = drawable.map((object) => {
    const index = indexes.get(object.group) ?? 0;
    indexes.set(object.group, index + 1);
    const count = counts.get(object.group) ?? 1;
    return {
      id: object.id,
      kind: object.kind,
      label: object.label,
      plane: object.group,
      trust: null,
      standing: stateFor(object),
      href: null,
      x: groupX[object.group] * 2.6,
      y: (index - (count - 1) / 2) * 1.35,
    };
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges: GraphClientEdge[] = drawable.flatMap((object) => {
    if (!object.parentId || !ids.has(object.parentId)) return [];
    return [{
      id: `${object.parentId}->${object.id}`,
      source: object.parentId,
      target: object.id,
      relation: "workspace_parent",
      trust: null,
      inferred: false,
    }];
  });
  return { nodes, edges };
}
