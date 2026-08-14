import { describe, expect, test } from "vitest";
import type { WorkspaceObject } from "./workspace-types";
import { workspaceCanvasGraph } from "./workspace-canvas-model";

const object = (input: Pick<WorkspaceObject, "id" | "kind" | "group" | "label"> & Partial<WorkspaceObject>): WorkspaceObject => ({
  summary: input.label,
  content: null,
  ...input,
});

describe("Workspace canvas", () => {
  test("projects the exact typed Workspace lineage without turning the overview into a scientific node", () => {
    const graph = workspaceCanvasGraph([
      object({ id: "workspace", kind: "overview", group: "work", label: "Overview" }),
      object({ id: "approach:one", kind: "approach", group: "work", label: "Approach" }),
      object({ id: "attempt:one", parentId: "approach:one", kind: "attempt", group: "work", label: "Attempt" }),
      object({ id: "codebase:math", kind: "codebase", group: "outputs", label: "Codebase" }),
      object({ id: "artifact:one", parentId: "attempt:one", kind: "research-block", group: "outputs", label: "Research Block" }),
    ]);

    expect(graph.nodes.map(({ id }) => id)).toEqual([
      "approach:one",
      "attempt:one",
      "codebase:math",
      "artifact:one",
    ]);
    expect(graph.edges).toEqual([
      expect.objectContaining({ source: "approach:one", target: "attempt:one", inferred: false }),
      expect.objectContaining({ source: "attempt:one", target: "artifact:one", inferred: false }),
    ]);
    expect(graph.nodes.find(({ id }) => id === "approach:one")?.x).toBeLessThan(
      graph.nodes.find(({ id }) => id === "artifact:one")!.x,
    );
  });
});
