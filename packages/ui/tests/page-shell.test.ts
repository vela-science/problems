import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("PageShell", () => {
  test("owns one route frame and preserves semantic element selection", () => {
    const source = readFileSync(new URL("../src/components/vela/page-shell.tsx", import.meta.url), "utf8");
    expect(source).toContain('className={cn("vela-page", className)}');
    expect(source).toContain("data-archetype={archetype}");
    expect(source).toContain("data-layout={layout}");
    expect(source).toContain('className={cn("vela-page-hero", density === "compact"');
    expect(source).toContain('data-density={density}');
    expect(source).toContain('<section className={cn("vela-page-section"');
    expect(source).toContain('<div className={cn("vela-page-section-head"');
  });
});
