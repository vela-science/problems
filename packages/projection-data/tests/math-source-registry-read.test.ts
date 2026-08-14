import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  decodeMathSourceRegistryCursor,
  encodeMathSourceRegistryCursor,
} from "../src/index";

describe("Math Source Registry keyset reads", () => {
  test("round-trips typed opaque cursors", () => {
    const values = [
      "source:oeis",
      `sha256:${"a".repeat(64)}`,
      "sequence_entry",
      "A000045",
    ];
    const cursor = encodeMathSourceRegistryCursor("native", values);
    expect(cursor).not.toContain("source:oeis");
    expect(
      decodeMathSourceRegistryCursor(cursor, "native", values.length),
    ).toEqual(values);
    expect(() => (
      decodeMathSourceRegistryCursor(cursor, "binding", values.length)
    )).toThrow("invalid Math Source Registry binding cursor");
    expect(() => (
      decodeMathSourceRegistryCursor("not-a-cursor", "native", values.length)
    )).toThrow("invalid Math Source Registry native cursor");
  });

  test("uses tuple keysets and contains no offset pagination", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../src/index.ts"),
      "utf8",
    );
    const start = source.indexOf("export async function mathSourceRegistryRead");
    const end = source.indexOf("\nfunction repositoryFromRows", start);
    const implementation = source.slice(start, end);
    expect(implementation).not.toMatch(/\bOFFSET\b/u);
    expect(implementation).toContain(
      "native_record.observation_root,\n             native_record.native_kind,\n             native_record.native_id",
    );
    expect(implementation).toContain(
      "ORDER BY repository_id, source_id, observation_root, binding_id",
    );
    expect(implementation).toContain("limit + 1");
  });

  test("keeps native lookup root-bound, indexed, and binding-aware", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../src/index.ts"),
      "utf8",
    );
    const start = source.indexOf("export async function mathSourceRegistryRead");
    const end = source.indexOf("\nfunction repositoryFromRows", start);
    const implementation = source.slice(start, end);

    expect(implementation).toContain("release_source.release_root = $1");
    expect(implementation).toContain("native_record.native_id = $3");
    expect(implementation).toContain("native_record.native_kind = $5");
    expect(implementation).toContain(
      "native_record.search_document @@ websearch_to_tsquery('simple', $4)",
    );
    expect(implementation).toContain(
      "binding.native_id = native_record.native_id",
    );
    expect(implementation).toContain("binding.repository_id = $6");
  });
});
