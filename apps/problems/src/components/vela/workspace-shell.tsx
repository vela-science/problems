"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useState, useSyncExternalStore } from "react";
import { ViewSidebarLeftIcon, ViewSidebarRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@vela/ui/components/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@vela/ui/components/resizable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@vela/ui/components/sheet";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspaceInspector } from "@/components/vela/workspace-inspector";
import { WorkspaceObjectTree } from "@/components/vela/workspace-object-tree";
import type {
  WorkspaceAnchorState,
  WorkspaceAuditEntry,
  WorkspaceInspectorTab,
  WorkspaceObject,
  WorkspaceDiscussionEntry,
} from "@/components/vela/workspace-types";

const WorkspaceCanvas = dynamic(
  () => import("@/components/vela/workspace-canvas").then((module) => module.WorkspaceCanvas),
  {
    ssr: false,
    loading: () => <div className="grid min-h-[32rem] place-items-center text-body text-muted-foreground">Preparing shared canvas…</div>,
  },
);

const mobileWorkspaceQuery = "(max-width: 1023px)";

function subscribeToMobileWorkspace(onStoreChange: () => void) {
  const query = window.matchMedia(mobileWorkspaceQuery);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function mobileWorkspaceSnapshot() {
  return window.matchMedia(mobileWorkspaceQuery).matches;
}

function serverMobileWorkspaceSnapshot() {
  return false;
}

export function WorkspaceShell({
  objects,
  selectedObject,
  inspectorTab,
  anchors,
  audit,
  discussion,
  toolbar,
  canvasNote,
  initialSurface = "object",
}: {
  objects: WorkspaceObject[];
  selectedObject: WorkspaceObject;
  inspectorTab: WorkspaceInspectorTab;
  anchors: WorkspaceAnchorState[];
  audit: WorkspaceAuditEntry[];
  discussion: WorkspaceDiscussionEntry[];
  toolbar: ReactNode;
  canvasNote?: ReactNode;
  initialSurface?: "canvas" | "object";
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mobileWorkspace = useSyncExternalStore(
    subscribeToMobileWorkspace,
    mobileWorkspaceSnapshot,
    serverMobileWorkspaceSnapshot,
  );
  const [mobilePanelsOpen, setMobilePanelsOpen] = useState(false);
  const [surface, setSurface] = useState<"canvas" | "object">(initialSurface);
  const hrefWith = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", "work");
    params.delete("mode");
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    return `?${params.toString()}`;
  };
  const hrefForObject = (objectId: string) => hrefWith({ object: objectId });
  const hrefForTab = (tab: WorkspaceInspectorTab) => hrefWith({ inspector: tab });
  const selectCanvasObject = (objectId: string) => {
    setSurface("object");
    /* Selecting an object from the canvas is the same navigation the object
       tree performs with a Link. `location.assign` discarded the application
       shell, the canvas, and the CRDT document to change one query parameter. */
    router.push(hrefForObject(objectId), { scroll: false });
  };

  const tree = () => (
    <WorkspaceObjectTree
      objects={objects}
      selectedId={selectedObject.id}
      hrefFor={hrefForObject}
      onNavigate={() => {
        setSurface("object");
        setMobilePanelsOpen(false);
      }}
    />
  );
  const inspector = () => (
    <WorkspaceInspector
      object={selectedObject}
      activeTab={inspectorTab}
      hrefForTab={hrefForTab}
      anchors={anchors}
      audit={audit}
      discussion={discussion}
    />
  );
  const surfaceTabs = (className?: string) => <Tabs value={surface} onValueChange={(value) => setSurface(value as "canvas" | "object")} className={className}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <p className="text-meta text-muted-foreground">Canvas, files, Research Blocks, and notes</p>
      <TabsList aria-label="Workspace surface">
        <TabsTrigger value="canvas">Canvas</TabsTrigger>
        <TabsTrigger value="object">Selected object</TabsTrigger>
      </TabsList>
    </div>
    <TabsContent value="canvas" className="m-0 min-w-0 overflow-hidden bg-muted/10 print:overflow-visible">
      {canvasNote}
      <WorkspaceCanvas objects={objects} selectedId={selectedObject.id} onSelect={selectCanvasObject} />
    </TabsContent>
    <TabsContent value="object" className="m-0 min-w-0">
      <section aria-label="Selected Workspace object" className="h-full min-w-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
        {selectedObject.content}
      </section>
    </TabsContent>
  </Tabs>;

  return (
    <section aria-labelledby="workspace-heading" className="mt-8 min-w-0">
      <div className="border-b pb-4">{toolbar}</div>
      {mobileWorkspace ? <div>
      <div className="flex items-center justify-between gap-3 border-b py-2">
        <Sheet open={mobilePanelsOpen} onOpenChange={setMobilePanelsOpen}>
          <SheetTrigger
            render={<Button type="button" variant="outline" size="sm" />}
          >
            <HugeiconsIcon icon={ViewSidebarLeftIcon} strokeWidth={1.8} aria-hidden data-icon="inline-start" />
            Workspace panels
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(92vw,28rem)] gap-0 p-0">
            <SheetHeader className="border-b pr-12">
              <SheetTitle>{selectedObject.label}</SheetTitle>
              <SheetDescription>Selected object details, activity, discussion, and Workspace objects.</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-[1.1] border-b">{inspector()}</div>
            <div className="min-h-0 flex-1">{tree()}</div>
          </SheetContent>
        </Sheet>
        <span className="min-w-0 truncate text-label">{selectedObject.label}</span>
        <HugeiconsIcon icon={ViewSidebarRightIcon} strokeWidth={1.8} aria-hidden className="size-4 text-muted-foreground" />
      </div>
        {surfaceTabs("min-w-0")}
      </div> : /* Print gets the selected object's full flow, not a 72vh clip:
          the fixed viewport height exists for the resizable screen layout and
          would truncate everything below the fold on paper. */
      <div className="mt-4 h-[min(72vh,56rem)] min-h-[42rem] overflow-hidden rounded-xl border bg-background max-lg:hidden print:h-auto print:min-h-0 print:overflow-visible print:rounded-none print:border-0">
          <ResizablePanelGroup
            id="scientific-workspace"
            orientation="horizontal"
            resizeTargetMinimumSize={{ coarse: 32, fine: 12 }}
          >
            <ResizablePanel id="workspace-tree" defaultSize="22%" minSize="14rem" maxSize="30%">
              <div className="h-full min-w-0 bg-muted/15">{tree()}</div>
            </ResizablePanel>
            <ResizableHandle withHandle aria-label="Resize Workspace object tree" />
            <ResizablePanel id="workspace-surface" defaultSize="53%" minSize="34%">
              <div className="h-full min-w-0 overflow-y-auto overscroll-contain">
                {surfaceTabs("min-h-full")}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle aria-label="Resize Workspace inspector" />
            <ResizablePanel id="workspace-inspector" defaultSize="25%" minSize="18rem" maxSize="34%">
              {inspector()}
            </ResizablePanel>
          </ResizablePanelGroup>
      </div>}
    </section>
  );
}
