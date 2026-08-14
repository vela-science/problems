"use client";

import dynamic from "next/dynamic";
import type { CanvasCrdtUpdate } from "@/components/vela/workspace-crdt-model";

export type CanvasScope = {
  repository: string;
  problem: string;
  workspaceId: string;
  expectedAnchorRoot: string;
};

export type WorkspaceCrdtNoteProps = {
  updates: CanvasCrdtUpdate[];
  scope: CanvasScope;
  action: (formData: FormData) => Promise<void>;
};

const WorkspaceCrdtNoteClient = dynamic(
  () => import("@/components/vela/workspace-crdt-note-client")
    .then((module) => module.WorkspaceCrdtNoteClient),
  {
    ssr: false,
    loading: () => <section aria-labelledby="canvas-note-loading-heading" className="border-b bg-background px-5 py-4 sm:px-6">
      <h3 id="canvas-note-loading-heading" className="text-subtitle">Shared canvas note</h3>
      <p className="mt-1 text-meta text-muted-foreground" role="status">Loading the local collaboration document…</p>
    </section>,
  },
);

export function WorkspaceCrdtNote(props: WorkspaceCrdtNoteProps) {
  return <WorkspaceCrdtNoteClient {...props} />;
}
