import { LoroDoc } from "loro-crdt";

export type CanvasCrdtUpdate = { updateBase64: string };

export function bytesFromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

export async function sha256Root(bytes: Uint8Array): Promise<`sha256:${string}`> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function mergedCanvasDocument(updates: readonly CanvasCrdtUpdate[]): LoroDoc {
  const document = new LoroDoc();
  for (const update of updates) document.import(bytesFromBase64(update.updateBase64));
  return document;
}

export function canvasNoteUpdate(updates: readonly CanvasCrdtUpdate[], note: string): Uint8Array {
  const document = mergedCanvasDocument(updates);
  const from = document.oplogVersion();
  document.getText("canvas_note").update(note);
  return document.export({ mode: "update", from });
}
