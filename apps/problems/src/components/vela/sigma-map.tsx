"use client";

import { useEffect, useMemo } from "react";
import { MultiDirectedGraph } from "graphology";
import { SigmaContainer, useRegisterEvents } from "@react-sigma/core";
/* The instrument's stylesheet belongs to the instrument. In the root layout it
   was on every route, and this module is already loaded through `dynamic`, so
   the CSS now travels in the same lazy chunk as the map that needs it. */
import "@react-sigma/core/lib/style.css";
import { velaTokens } from "@vela/brand/tokens";
import { stateTones, type StatusTone } from "@vela/ui/vela/status-badge";
import type { GraphClientEdge, GraphClientNode } from "@/lib/graph-client";

/* A node's fill and the badge in the sheet that opens over it name the same
   state, so the tone is the badge's. A second table here had accepted teal and
   a passing check green, the two hues swapped. Only tone → token lives here,
   because Sigma paints literal colour rather than classes. */
const toneColors: Record<StatusTone, string> = {
  evidence: velaTokens["color-evidence"], progress: velaTokens["color-progress"],
  caution: velaTokens["color-caution"], conflict: velaTokens["color-conflict"],
  neutral: velaTokens["color-slate"],
};

/* `GraphClientNode.standing` is the projection's mixed column — a Proposal
   node carries a Proposal status in it, a verifier attachment a Verification
   outcome. The fill is therefore a state colour, not a standing colour, and is
   named for what it is. The tone comes from the badge either way, so a node and
   the sheet that opens over it cannot disagree. */
function stateColor(state: string): string {
  return toneColors[stateTones[state] ?? "neutral"];
}

function GraphEvents({ onSelect }: { onSelect: (id: string) => void }) {
  const registerEvents = useRegisterEvents();
  useEffect(() => registerEvents({ clickNode: ({ node }) => onSelect(node) }), [onSelect, registerEvents]);
  return null;
}

export function SigmaMap({ nodes, edges, selected, onSelect, ariaLabel }: {
  nodes: GraphClientNode[]; edges: GraphClientEdge[]; selected: string | null; onSelect: (id: string) => void;
  ariaLabel?: string;
}) {
  const graph = useMemo(() => {
    const next = new MultiDirectedGraph();
    for (const node of nodes) next.addNode(node.id, {
      label: node.id === selected || node.kind === "problem" ? node.label : undefined, x: node.x, y: node.y, size: node.id === selected ? 6 : node.kind === "problem" ? 3 : 1.15,
      color: node.id === selected ? velaTokens["color-stardust"] : stateColor(node.standing),
      borderColor: node.id === selected ? velaTokens["color-midnight"] : undefined,
    });
    for (const edge of edges) if (next.hasNode(edge.source) && next.hasNode(edge.target)) {
      const adjacent = selected && (edge.source === selected || edge.target === selected);
      next.addEdgeWithKey(edge.id, edge.source, edge.target, {
        size: adjacent ? 0.8 : 0.2,
        color: adjacent ? velaTokens["color-mist"] : velaTokens["color-fog"],
      });
    }
    return next;
  }, [edges, nodes, selected]);
  return (
    <div
      className="h-[min(68svh,52rem)] min-h-[34rem] w-full overflow-hidden"
      role="img"
      aria-label={ariaLabel ?? "Rooted repository graph; use the equivalent ledger for a complete keyboard-accessible view."}
    >
      <SigmaContainer graph={graph} className="h-full w-full" settings={{
        renderLabels: true, labelRenderedSizeThreshold: 2.5, labelDensity: 0.08,
        defaultNodeColor: velaTokens["color-slate"], defaultEdgeColor: velaTokens["color-fog"],
        enableEdgeEvents: false, hideEdgesOnMove: true, zIndex: true,
      }}>
        <GraphEvents onSelect={onSelect} />
      </SigmaContainer>
    </div>
  );
}
