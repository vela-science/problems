import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const paths = [
  "PRODUCT.md",
  "DESIGN.md",
  "apps/problems/PRODUCT.md",
  "apps/problems/DESIGN.md",
] as const;

const docs = Object.fromEntries(
  paths.map((path) => [path, readFileSync(resolve(root, path), "utf8")]),
) as Record<(typeof paths)[number], string>;

describe("active product and design contracts", () => {
  test("stay on the current product and Submission contract", () => {
    const active = paths.map((path) => docs[path]).join("\n");
    expect(active).not.toContain("vela.submission.v2");
    expect(active).not.toContain("Submission v2");
    expect(active).toContain("Submission v3");
    expect(active).toContain("1,217 Erdős Problems");
  });

  test("keeps the Google DESIGN.md section order and machine tokens", () => {
    const design = docs["DESIGN.md"];
    expect(design.startsWith("---\nversion: alpha\n")).toBe(true);
    const headings = [
      "## Overview",
      "## Colors",
      "## Typography",
      "## Layout",
      "## Elevation & Depth",
      "## Shapes",
      "## Components",
      "## Do's and Don'ts",
    ];
    let cursor = -1;
    for (const heading of headings) {
      const next = design.indexOf(heading);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
  });

  test("protects a positive visual system instead of blanket bans", () => {
    const active = paths.map((path) => docs[path]).join("\n");
    expect(active).not.toMatch(/ships no Card/iu);
    expect(active).not.toMatch(/(?:never|must not|do not) use (?:a )?(?:card|chart)s?\b/iu);
    expect(active).toContain("Cards, panels, tiles, rows, canvases, tables, and charts are all valid.");
    expect(active).toContain("Every chart has a visible title");
  });
});
