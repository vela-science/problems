"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Label } from "@vela/ui/components/label";
import { Textarea } from "@vela/ui/components/textarea";
import {
  base64FromBytes,
  canvasNoteUpdate,
  mergedCanvasDocument,
  sha256Root,
} from "@/components/vela/workspace-crdt-model";
import type { WorkspaceCrdtNoteProps } from "@/components/vela/workspace-crdt-note";

export function WorkspaceCrdtNoteClient({
  updates,
  scope,
  action,
}: WorkspaceCrdtNoteProps) {
  const router = useRouter();
  const document = useMemo(() => mergedCanvasDocument(updates), [updates]);
  const initialNote = document.getText("canvas_note").toString();
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  return <section aria-labelledby="canvas-note-heading" className="border-b bg-background px-5 py-4 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 id="canvas-note-heading" className="text-subtitle">Shared canvas note</h3>
          <Badge variant="outline">Loro CRDT</Badge>
          <Badge variant="secondary">authority none</Badge>
        </div>
        <p className="mt-1 max-w-2xl text-meta text-muted-foreground">A mergeable scratch layer for framing the shared work. Updates are append-only Workspace activity; they are not a Claim, Verification, Decision, Git commit, or Standing.</p>
      </div>
      <span className="font-mono text-micro text-muted-foreground">{updates.length} {updates.length === 1 ? "update" : "updates"}</span>
    </div>
    <form className="mt-4 grid gap-3" action={async (formData) => {
      setSaving(true);
      setSaved(false);
      try {
        const bytes = canvasNoteUpdate(updates, note);
        if (!bytes.length) return;
        formData.set("repository", scope.repository);
        formData.set("problem", scope.problem);
        formData.set("workspaceId", scope.workspaceId);
        formData.set("expectedAnchorRoot", scope.expectedAnchorRoot);
        formData.set("idempotencyKey", crypto.randomUUID());
        formData.set("updateBase64", base64FromBytes(bytes));
        formData.set("updateRoot", await sha256Root(bytes));
        await action(formData);
        setSaved(true);
        router.refresh();
      } finally {
        setSaving(false);
      }
    }}>
      <Label htmlFor="workspace-canvas-note">Working note</Label>
      <Textarea id="workspace-canvas-note" value={note} onChange={(event) => { setNote(event.target.value); setSaved(false); }} placeholder="Frame the question, list unresolved assumptions, or leave context for the next person or agent." className="min-h-24 resize-y" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-micro text-muted-foreground">Save creates one rooted CRDT update. Reloading or syncing can import peer updates in any order.</p>
        <div className="flex items-center gap-3">
          {saved ? <span className="text-meta text-muted-foreground" role="status">Saved</span> : null}
          <Button type="submit" size="sm" disabled={saving || note === initialNote}>{saving ? "Saving…" : "Save canvas note"}</Button>
        </div>
      </div>
    </form>
  </section>;
}
