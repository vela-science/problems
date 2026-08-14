import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { WorkspaceInspector } from "./workspace-inspector";
import type { WorkspaceObject } from "./workspace-types";

afterEach(cleanup);

describe("WorkspaceInspector activity", () => {
  test("shows only the audit entries scoped to the selected object", () => {
    const approach: WorkspaceObject = { id: "approach:a1", recordId: "a1", anchorRoot: "sha256:1", group: "work", kind: "approach", label: "Finite reduction", summary: "A direction", content: null };
    render(<WorkspaceInspector object={approach} activeTab="activity" hrefForTab={(tab) => `?inspector=${tab}`} anchors={[]} audit={[
      { sequence: "1", operation: "approach.create", requestRoot: "sha256:one", subjectKind: "approach", subjectId: "a1" },
      { sequence: "2", operation: "approach.create", requestRoot: "sha256:two", subjectKind: "approach", subjectId: "a2" },
    ]} discussion={[]} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText("#2")).not.toBeInTheDocument();
  });

  test("does not use a shared anchor as an object relation", () => {
    const approach: WorkspaceObject = {
      id: "approach:a1",
      recordId: "a1",
      anchorRoot: "sha256:current",
      group: "work",
      kind: "approach",
      label: "Finite reduction",
      summary: "A direction",
      content: null,
    };
    render(<WorkspaceInspector
      object={approach}
      activeTab="activity"
      hrefForTab={(tab) => `?inspector=${tab}`}
      anchors={[]}
      audit={[
        { sequence: "1", operation: "approach.create", requestRoot: "sha256:request-1", anchorRoot: "sha256:current", subjectKind: "approach", subjectId: "a1" },
        { sequence: "2", operation: "attempt.create", requestRoot: "sha256:request-2", anchorRoot: "sha256:current", subjectKind: "attempt", subjectId: "other" },
        { sequence: "3", operation: "approach.create", requestRoot: "sha256:request-3", anchorRoot: "sha256:current", subjectKind: "approach", subjectId: "other" },
      ]}
      discussion={[]}
    />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText("#2")).not.toBeInTheDocument();
    expect(screen.queryByText("#3")).not.toBeInTheDocument();
  });

  test("keeps historical unbound Overview records reachable and labels their anchor", () => {
    const overview: WorkspaceObject = {
      id: "workspace",
      anchorRoot: "sha256:current",
      group: "work",
      kind: "overview",
      label: "Overview",
      summary: "Current work",
      content: null,
    };
    const props = {
      object: overview,
      hrefForTab: (tab: "details" | "activity" | "discussion") => `?inspector=${tab}`,
      anchors: [
        { root: "sha256:current", state: "current" as const, fields: [] },
        { root: "sha256:old", state: "repository_advanced" as const, fields: ["projectionReleaseRoot"] },
      ],
      audit: [],
      discussion: [
        { id: "current-note", body: "Current note", kind: "note", visibility: "workspace", anchorRoot: "sha256:current", approachId: null, attemptId: null },
        { id: "old-note", body: "Historical note", kind: "note", visibility: "workspace", anchorRoot: "sha256:old", approachId: null, attemptId: null },
      ],
    };
    render(<WorkspaceInspector {...props} activeTab="discussion" />);
    expect(screen.getByText("Current note")).toBeInTheDocument();
    expect(screen.getByText("Historical note")).toBeInTheDocument();
    expect(screen.getAllByText("repository advanced").length).toBeGreaterThan(0);
  });
});
