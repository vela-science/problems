import type { ReactNode } from "react";

export type WorkspaceObjectGroup = "work" | "outputs";

export type WorkspaceObjectKind =
  | "overview"
  | "approach"
  | "attempt"
  | "codebase"
  | "research-block"
  | "draft";

export type WorkspaceObject = {
  id: string;
  group: WorkspaceObjectGroup;
  kind: WorkspaceObjectKind;
  parentId?: string | null;
  label: string;
  summary: string;
  meta?: string;
  version?: number | null;
  recordId?: string | null;
  anchorRoot?: string | null;
  inspectorLabel?: string;
  inspectWorkspaceAnchors?: boolean;
  inspectorTabs?: WorkspaceInspectorTab[];
  content: ReactNode;
  detail?: ReactNode;
};

export type WorkspaceAuditEntry = {
  sequence: string;
  operation: string;
  requestRoot: string;
  anchorRoot?: string | null;
  subjectKind?: string | null;
  subjectId?: string | null;
};

export type WorkspaceDiscussionEntry = {
  id: string;
  body: string;
  kind: string;
  visibility: string;
  anchorRoot: string;
  approachId?: string | null;
  attemptId?: string | null;
};

export type WorkspaceAnchorState = {
  root: string;
  state: "current" | "repository_advanced" | "problem_changed" | "claim_changed" | "unavailable";
  fields: string[];
};

export type WorkspaceInspectorTab = "details" | "activity" | "discussion";
