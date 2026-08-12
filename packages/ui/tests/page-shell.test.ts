import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("PageShell", () => {
  test("owns one route frame and preserves semantic element selection", () => {
    const source = readFileSync(new URL("../src/components/vela/page-shell.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../src/components/vela/page-shell.module.css", import.meta.url), "utf8");
    expect(source).toContain('className={cn("vela-page", styles.page, className)}');
    expect(source).toContain("data-archetype={archetype}");
    expect(source).toContain("data-layout={layout}");
    expect(source).toContain('"vela-page-hero",');
    expect(source).toContain('density === "compact" && ["vela-page-hero-compact", styles.heroCompact]');
    expect(source).toContain('data-density={density}');
    expect(source).toContain('const Component = as ?? "section"');
    expect(source).toContain('<Component className={cn("vela-page-section"');
    expect(source).toContain('<div className={cn("vela-page-section-head"');
    expect(styles).toContain('max-width: var(--vela-page-max)');
    expect(styles).toContain('.page[data-layout="reading"]');
    expect(styles).toContain('@media print');
  });
});
