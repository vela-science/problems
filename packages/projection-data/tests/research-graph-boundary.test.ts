import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/read-contracts.ts", import.meta.url), "utf8");

describe("exact research graph boundary", () => {
  test("filters inferred relationships in neighbor, canvas, and relation queries", () => {
    expect(source.match(/'research' OR (?:e\.)?inferred = false/gu)).toHaveLength(3);
    expect(source).toContain('input.lens === "research"');
    expect(source).toContain('neighborRecords.some((neighbor) => neighbor.inferred)');
    expect(source).toContain('edgeRecords.some((edge) => edge.inferred)');
  });
});
