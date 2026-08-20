"use client";

import Link from "next/link";
import { Activity01Icon, Note04Icon, ViewSidebarRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Badge } from "@vela/ui/components/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@vela/ui/components/empty";
import { cn } from "@vela/ui/lib/utils";
import type {
  WorkspaceAnchorState,
  WorkspaceAuditEntry,
  WorkspaceInspectorTab,
  WorkspaceObject,
  WorkspaceDiscussionEntry,
} from "@/components/vela/workspace-types";

const tabs: Array<{ id: WorkspaceInspectorTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "activity", label: "Activity" },
  { id: "discussion", label: "Discussion" },
];

const auditSubjectKinds = {
  approach: "approach",
  attempt: "attempt",
  "research-block": "artifact_ref",
  draft: "submission_draft",
} as const;

function EmptyInspector({ kind }: { kind: "activity" | "discussion" }) {
  const discussion = kind === "discussion";
  return (
    <Empty className="min-h-56 border-0 px-3">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon aria-hidden icon={discussion ? Note04Icon : Activity01Icon} strokeWidth={1.8} />
        </EmptyMedia>
        <EmptyTitle>{discussion ? "No discussion for this object" : "No activity for this object"}</EmptyTitle>
        <EmptyDescription>
          {discussion
            ? "Comments and notes appear here only when they are attached to this Workspace object."
            : "The append-only activity log has no command attached to this object."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function WorkspaceInspector({
  object,
  activeTab,
  hrefForTab,
  anchors,
  audit,
  discussion,
}: {
  object: WorkspaceObject;
  activeTab: WorkspaceInspectorTab;
  hrefForTab: (tab: WorkspaceInspectorTab) => string;
  anchors: WorkspaceAnchorState[];
  audit: WorkspaceAuditEntry[];
  discussion: WorkspaceDiscussionEntry[];
}) {
  const selectedAnchors = object.inspectWorkspaceAnchors === false
    ? []
    : object.anchorRoot
      ? anchors.filter((anchor) => anchor.root === object.anchorRoot)
      : anchors;
  const availableTabs = object.inspectorTabs ?? tabs.map((tab) => tab.id);
  const resolvedTab: WorkspaceInspectorTab = availableTabs.includes(activeTab) ? activeTab : "details";
  const activityEntries = audit.filter((event) => {
    if (object.kind === "overview") return true;
    const expectedSubjectKind = object.kind in auditSubjectKinds
      ? auditSubjectKinds[object.kind as keyof typeof auditSubjectKinds]
      : null;
    return Boolean(
      object.recordId
      && expectedSubjectKind
      && event.subjectKind === expectedSubjectKind
      && event.subjectId === object.recordId,
    );
  });
  const discussionEntries = discussion.filter((entry) => {
    if (object.kind === "overview") return !entry.approachId && !entry.attemptId;
    if (object.kind === "approach") {
      return entry.anchorRoot === object.anchorRoot && entry.approachId === object.recordId;
    }
    if (object.kind === "attempt") {
      return entry.anchorRoot === object.anchorRoot && entry.attemptId === object.recordId;
    }
    return false;
  });
  const anchorLabel = (root: string | null | undefined) => {
    if (!root) return "unanchored";
    const anchor = anchors.find((entry) => entry.root === root);
    return anchor?.state === "current"
      ? "current anchor"
      : (anchor?.state ?? "unavailable").replaceAll("_", " ");
  };

  return (
    <aside aria-label="Workspace inspector" className="flex h-full min-h-0 flex-col bg-muted/20">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 text-meta text-muted-foreground">
          <HugeiconsIcon icon={ViewSidebarRightIcon} strokeWidth={1.8} aria-hidden className="size-4" />
          Inspector
        </div>
        <p className="mt-1 truncate text-label text-foreground" title={object.label}>{object.label}</p>
      </div>
      <nav
        aria-label="Inspector sections"
        /* `grid-flow-col auto-cols-fr` divides the row evenly however many
           sections are available, so the count is not re-derived as a ternary
           over track classes. These stay links with `aria-current`, not a
           `Tabs` tablist: each section is its own URL, and a control that
           changes the address is navigation. */
        className="grid auto-cols-fr grid-flow-col border-b p-1"
      >
        {tabs.filter((tab) => availableTabs.includes(tab.id)).map((tab) => (
          <Link
            key={tab.id}
            href={hrefForTab(tab.id)}
            scroll={false}
            prefetch={false}
            aria-current={resolvedTab === tab.id ? "page" : undefined}
            className={cn(
              "rounded-md px-2 py-1.5 text-center text-meta transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              resolvedTab === tab.id
                ? "bg-background font-medium text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {resolvedTab === "details" ? (
          <div className="space-y-5">
            <div>
              <Badge variant="secondary">{object.inspectorLabel ?? "activity only"}</Badge>
              <p className="mt-3 text-body text-muted-foreground">{object.summary}</p>
            </div>
            {object.version ? (
              <Alert>
                <AlertTitle>Version {object.version}</AlertTitle>
                <AlertDescription>
                  Updates use optimistic concurrency. If another edit advances this record, the command is refused so you can reload the latest version before retrying.
                </AlertDescription>
              </Alert>
            ) : null}
            {selectedAnchors.length ? (
              <section aria-labelledby="workspace-anchor-heading">
                <h3 id="workspace-anchor-heading" className="text-eyebrow text-muted-foreground">
                  Scientific anchor
                </h3>
                <ul className="mt-2 divide-y">
                  {selectedAnchors.map((anchor) => (
                    <li key={anchor.root} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={anchor.state === "current" ? "outline" : "secondary"}>
                          {anchor.state.replaceAll("_", " ")}
                        </Badge>
                        <span className="font-mono text-micro text-muted-foreground">{anchor.root.slice(0, 18)}…</span>
                      </div>
                      {anchor.fields.length ? (
                        <p className="mt-2 text-meta text-muted-foreground">
                          Changed: {anchor.fields.join(", ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {object.detail ? <div className="border-t pt-4">{object.detail}</div> : null}
          </div>
        ) : null}

        {resolvedTab === "activity" ? (
          activityEntries.length ? (
            <ol className="divide-y" aria-label="Object activity">
              {activityEntries.map((event) => (
                <li key={`${event.sequence}:${event.requestRoot}`} className="py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 flex-wrap items-center gap-2 text-label">{event.operation.replaceAll(".", " ")}{object.kind === "overview" ? <Badge variant={anchorLabel(event.anchorRoot) === "current anchor" ? "outline" : "secondary"}>{anchorLabel(event.anchorRoot)}</Badge> : null}</span>
                    <span className="font-mono text-micro tabular-nums text-muted-foreground">#{event.sequence}</span>
                  </div>
                  <p className="mt-1 break-all font-mono text-micro text-muted-foreground">{event.requestRoot}</p>
                </li>
              ))}
            </ol>
          ) : <EmptyInspector kind="activity" />
        ) : null}

        {resolvedTab === "discussion" ? (
          discussionEntries.length ? (
            <ul className="divide-y" aria-label="Object discussion">
              {discussionEntries.map((entry) => (
                <li key={entry.id} className="py-3 first:pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{entry.kind}</Badge>
                    <Badge variant="secondary">{entry.visibility}</Badge>
                    {object.kind === "overview" ? <Badge variant={anchorLabel(entry.anchorRoot) === "current anchor" ? "outline" : "secondary"}>{anchorLabel(entry.anchorRoot)}</Badge> : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-body">{entry.body}</p>
                </li>
              ))}
            </ul>
          ) : <EmptyInspector kind="discussion" />
        ) : null}
      </div>
    </aside>
  );
}
