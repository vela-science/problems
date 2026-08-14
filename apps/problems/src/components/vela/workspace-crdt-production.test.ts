import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(name: string) {
  return readFileSync(resolve(import.meta.dirname, name), "utf8");
}

describe("Workspace CRDT production boundary", () => {
  it("keeps the Loro WASM runtime out of server rendering", () => {
    const boundary = source("workspace-crdt-note.tsx");
    const client = source("workspace-crdt-note-client.tsx");

    expect(boundary).toContain("ssr: false");
    expect(boundary).toContain('import("@/components/vela/workspace-crdt-note-client")');
    expect(boundary).not.toContain('from "loro-crdt"');
    expect(boundary).not.toContain("mergedCanvasDocument");
    expect(client).toContain('from "@/components/vela/workspace-crdt-model"');
  });
});
