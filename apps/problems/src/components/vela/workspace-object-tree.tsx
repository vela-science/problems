"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity01Icon,
  FileCheckIcon,
  FileExportIcon,
  GitForkIcon,
  SourceCodeIcon,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@vela/ui/lib/utils";
import type {
  WorkspaceObject,
  WorkspaceObjectGroup,
  WorkspaceObjectKind,
} from "@/components/vela/workspace-types";

const groups: Array<{ id: WorkspaceObjectGroup; label: string }> = [
  { id: "work", label: "Approaches and Attempts" },
  { id: "outputs", label: "Code and contributions" },
];

const icons = {
  overview: WorkIcon,
  approach: GitForkIcon,
  attempt: Activity01Icon,
  codebase: SourceCodeIcon,
  "research-block": FileCheckIcon,
  draft: FileExportIcon,
} satisfies Record<WorkspaceObjectKind, typeof WorkIcon>;

function ObjectLink({
  object,
  selected,
  href,
  onNavigate,
}: {
  object: WorkspaceObject;
  selected: boolean;
  href: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      onClick={onNavigate}
      aria-current={selected ? "page" : undefined}
      title={object.label}
      className={cn(
        "group flex min-h-10 min-w-0 items-start gap-2 rounded-md px-2 py-2 text-left text-meta transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        selected
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted/55 hover:text-foreground",
      )}
    >
      <HugeiconsIcon
        icon={icons[object.kind]}
        strokeWidth={1.8}
        aria-hidden
        className="mt-0.5 size-4 shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-current">{object.label}</span>
        {object.meta ? (
          <span className="mt-0.5 block truncate text-micro text-muted-foreground">
            {object.meta}
          </span>
        ) : null}
      </span>
      {object.version ? (
        <span className="font-mono text-micro tabular-nums text-muted-foreground">
          v{object.version}
        </span>
      ) : null}
    </Link>
  );
}

export function WorkspaceObjectTree({
  objects,
  selectedId,
  hrefFor,
  onNavigate,
}: {
  objects: WorkspaceObject[];
  selectedId: string;
  hrefFor: (objectId: string) => string;
  onNavigate?: () => void;
}) {
  const overview = objects.find((object) => object.kind === "overview");
  const objectById = new Map(objects.map((object) => [object.id, object]));
  const sameGroupParent = (object: WorkspaceObject) => {
    const parent = object.parentId ? objectById.get(object.parentId) : undefined;
    return parent?.group === object.group ? parent : undefined;
  };
  const crossGroupParent = (object: WorkspaceObject) => {
    const parent = object.parentId ? objectById.get(object.parentId) : undefined;
    return parent && parent.group !== object.group ? parent : undefined;
  };
  const objectChildren = (object: WorkspaceObject) => objects.filter(
    (candidate) => candidate.group === object.group && candidate.parentId === object.id,
  );
  const renderObject = (object: WorkspaceObject, depth = 0): ReactNode => {
    const children = objectChildren(object);
    const relatedParent = crossGroupParent(object);
    const relatedParentKind = relatedParent?.kind.replace("-", " ");
    return (
      <li
        key={object.id}
        data-workspace-object={object.id}
        data-parent-id={object.parentId ?? undefined}
      >
        <ObjectLink object={object} selected={object.id === selectedId} href={hrefFor(object.id)} onNavigate={onNavigate} />
        {relatedParent ? (
          <Link
            href={hrefFor(relatedParent.id)}
            scroll={false}
            prefetch={false}
            onClick={onNavigate}
            aria-label={`Bound to ${relatedParentKind} ${relatedParent.label}`}
            data-workspace-parent-relation={relatedParent.id}
            className="ml-8 mt-0.5 block w-fit max-w-[calc(100%-2rem)] truncate rounded-sm px-1 text-micro text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            Bound to {relatedParentKind} · {relatedParent.label}
          </Link>
        ) : null}
        {children.length ? (
          <ul
            aria-label={`Children for ${object.label}`}
            className={cn("mt-0.5 grid gap-0.5", depth === 0 ? "ml-5" : "ml-4")}
          >
            {children.map((child) => renderObject(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };
  return (
    <nav
      aria-label="Workspace objects"
      className="h-full overflow-y-auto overscroll-contain px-2 py-3"
      data-workspace-object-tree
    >
      {overview ? <Link href={hrefFor(overview.id)} scroll={false} prefetch={false} onClick={onNavigate} aria-current={overview.id === selectedId ? "page" : undefined} className={cn("mb-4 flex min-h-10 items-center gap-2 rounded-md px-2 py-2 text-meta transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", overview.id === selectedId ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted/55 hover:text-foreground")}><HugeiconsIcon icon={icons.overview} strokeWidth={1.8} aria-hidden className="size-4" /><span className="min-w-0 truncate">Overview</span></Link> : null}
      {groups.map((group) => {
        const entries = objects.filter((object) => object.group === group.id && object.kind !== "overview");
        const roots = entries.filter((object) => !sameGroupParent(object));
        if (!roots.length) return null;
        return (
          <section key={group.id} aria-labelledby={`workspace-group-${group.id}`} className="not-first:mt-5">
            <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
              <h3
                id={`workspace-group-${group.id}`}
                className="text-eyebrow text-muted-foreground"
              >
                {group.label}
              </h3>
              <span
                aria-label={`${group.label} object count`}
                className="font-mono text-micro tabular-nums text-muted-foreground"
              >
                {entries.length}
              </span>
            </div>
            <ul className="grid gap-0.5">
              {roots.map((object) => renderObject(object))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
