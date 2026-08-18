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

  test("keeps machine-readable tokens and the approved workspace grammar", () => {
    const design = docs["DESIGN.md"];
    expect(design.startsWith("---\nversion: beta\n")).toBe(true);
    const headings = [
      "## Overview",
      "## Visual identity",
      "## Shell and navigation",
      "## Page grammar",
      "## Component recipes",
      "## Interaction states",
      "## Accessibility and rendering",
      "## Do",
      "## Do not",
    ];
    let cursor = -1;
    for (const heading of headings) {
      const next = design.indexOf(heading);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
  });

  test("protects the approved familiar research-product direction", () => {
    const active = paths.map((path) => docs[path]).join("\n");
    expect(active).not.toMatch(/ships no Card/iu);
    expect(active).not.toMatch(/(?:never|must not|do not) use (?:a )?(?:card|chart)s?\b/iu);
    expect(active).toContain("Entire is the primary product reference");
    expect(active).toContain("Every route has one visually dominant object");
    expect(active).toContain("Charts and maps require a text or table equivalent");
    expect(active).toContain("Overview, Work, Results, Sources, and History");
  });
});
