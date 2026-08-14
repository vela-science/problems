import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

/* Selecting a canvas object routes rather than reloading the document, so the
   shell holds a router. jsdom mounts no app router; the rest of the module is
   real. */
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/navigation")>(),
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
}));

import { WorkspaceObjectTree } from "./workspace-object-tree";
import { WorkspaceShell } from "./workspace-shell";
import type { WorkspaceObject } from "./workspace-types";

afterEach(cleanup);

const object = (input: Pick<WorkspaceObject, "id" | "kind" | "group" | "label"> & Partial<WorkspaceObject>): WorkspaceObject => ({
  summary: input.label,
  content: null,
  ...input,
});

describe("WorkspaceObjectTree", () => {
  test("nests each Attempt beneath its real parent Approach", () => {
    const objects = [
      object({ id: "workspace", kind: "overview", group: "work", label: "Overview" }),
      object({ id: "approach:a1", kind: "approach", group: "work", label: "Finite reduction" }),
      object({ id: "attempt:t1", parentId: "approach:a1", kind: "attempt", group: "work", label: "Check n < 100" }),
    ];
    const { container } = render(
      <WorkspaceObjectTree objects={objects} selectedId="attempt:t1" hrefFor={(id) => `?object=${id}`} />,
    );

    const approach = container.querySelector('[data-workspace-object="approach:a1"]');
    const attempt = container.querySelector('[data-workspace-object="attempt:t1"]');
    expect(approach).not.toBeNull();
    expect(attempt).not.toBeNull();
    expect(approach?.contains(attempt)).toBe(true);
    expect(attempt).toHaveAttribute("data-parent-id", "approach:a1");
    expect(container.querySelector('[aria-label="Children for Finite reduction"]')).not.toBeNull();
  });

  test("renders the selected interactive surface exactly once", () => {
    const objects = [object({ id: "workspace", kind: "overview", group: "work", label: "Overview", content: <label htmlFor="single-workspace-control">Control<input id="single-workspace-control" /></label> })];
    const { container } = render(
      <WorkspaceShell objects={objects} selectedObject={objects[0]!} inspectorTab="details" anchors={[]} audit={[]} discussion={[]} toolbar={null} />,
    );
    expect(container.querySelectorAll("#single-workspace-control")).toHaveLength(1);
  });

  test("opens the selected-object surface when an object is chosen from the tree", () => {
    const objects = [
      object({ id: "workspace", kind: "overview", group: "work", label: "Overview", content: <p>Overview content</p> }),
      object({ id: "codebase:math", kind: "codebase", group: "outputs", label: "Math codebase", content: <p>Codebase content</p> }),
    ];
    const { getByRole } = render(
      <WorkspaceShell
        objects={objects}
        selectedObject={objects[0]!}
        inspectorTab="details"
        anchors={[]}
        audit={[]}
        discussion={[]}
        toolbar={null}
        initialSurface="canvas"
      />,
    );

    expect(getByRole("tab", { name: "Canvas" })).toHaveAttribute("aria-selected", "true");
    const codebase = getByRole("link", { name: /Math codebase/u });
    codebase.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(codebase);
    expect(getByRole("tab", { name: "Selected object" })).toHaveAttribute("aria-selected", "true");
  });

  test.each([
    ["Overview", "overview", "work"],
    ["Approach", "approach", "work"],
    ["Attempt", "attempt", "work"],
    ["Codebase", "codebase", "outputs"],
    ["Artifact", "research-block", "outputs"],
    ["Draft", "draft", "outputs"],
  ] as const)("keeps one page main when the selected object is %s", (label, kind, group) => {
    const selected = object({
      id: `${kind}:selected`,
      kind,
      group,
      label,
      content: <h2>{label} content</h2>,
    });
    const { container, getByRole } = render(
      <main id="main-content">
        <WorkspaceShell
          objects={[selected]}
          selectedObject={selected}
          inspectorTab="details"
          anchors={[]}
          audit={[]}
          discussion={[]}
          toolbar={null}
        />
      </main>,
    );

    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(getByRole("main")).toHaveAttribute("id", "main-content");
    expect(getByRole("region", { name: "Selected Workspace object" })).toHaveClass(
      "h-full",
      "overflow-y-auto",
      "overscroll-contain",
    );
    expect(getByRole("navigation", { name: "Workspace objects" })).toBeInTheDocument();
    expect(getByRole("complementary", { name: "Workspace inspector" })).toBeInTheDocument();
  });
});
