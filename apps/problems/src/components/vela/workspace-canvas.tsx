"use client";

import { useMemo } from "react";
import { SigmaMap } from "@/components/vela/sigma-map";
import type { WorkspaceObject } from "@/components/vela/workspace-types";
import { workspaceCanvasGraph } from "@/components/vela/workspace-canvas-model";

export function WorkspaceCanvas({
  objects,
  selectedId,
  onSelect,
}: {
  objects: WorkspaceObject[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { nodes, edges } = useMemo(() => workspaceCanvasGraph(objects), [objects]);

  if (!nodes.length) {
    return <div className="grid min-h-[32rem] place-items-center px-6 text-center text-body text-muted-foreground"><p className="max-w-prose">The shared canvas will fill as this Workspace gains Approaches, Attempts, code references, and Research Blocks.</p></div>;
  }

  return <SigmaMap
    nodes={nodes}
    edges={edges}
    selected={nodes.some((node) => node.id === selectedId) ? selectedId : null}
    onSelect={onSelect}
    ariaLabel="Shared Workspace canvas. Approaches, Attempts, code references, Research Blocks, and handoffs are also available in the keyboard-accessible object map."
  />;
}
