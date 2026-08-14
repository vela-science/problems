import { describe, expect, test } from "vitest";
import { LoroDoc } from "loro-crdt";
import { base64FromBytes, canvasNoteUpdate, mergedCanvasDocument, type CanvasCrdtUpdate } from "./workspace-crdt-model";

const update = (_id: string, bytes: Uint8Array): CanvasCrdtUpdate => ({
  updateBase64: base64FromBytes(bytes),
});

function peerUpdate(note: string): Uint8Array {
  const document = new LoroDoc();
  const from = document.oplogVersion();
  document.getText("canvas_note").update(note);
  return document.export({ mode: "update", from });
}

describe("Workspace canvas CRDT", () => {
  test("merges peer updates deterministically regardless of arrival order", () => {
    const alpha = update("a", peerUpdate("Alpha"));
    const beta = update("b", peerUpdate("Beta"));
    const forward = mergedCanvasDocument([alpha, beta]);
    const reverse = mergedCanvasDocument([beta, alpha]);
    expect(forward.getText("canvas_note").toString()).toBe(reverse.getText("canvas_note").toString());
    expect(forward.toJSON()).toEqual(reverse.toJSON());
  });

  test("exports only the new operation against retained Workspace updates", () => {
    const initial = update("a", peerUpdate("Initial note"));
    const delta = canvasNoteUpdate([initial], "Revised note");
    expect(delta.byteLength).toBeGreaterThan(0);
    const merged = mergedCanvasDocument([initial, update("b", delta)]);
    expect(merged.getText("canvas_note").toString()).toBe("Revised note");
  });
});
