import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { assertTokenReferences, inspectTokenReferences } from "./token-references.mjs";

const roots: string[] = [];

function fixture(files: Record<string, string>) {
  const root = mkdtempSync(resolve(tmpdir(), "vela-web-tokens-"));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    const target = resolve(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("custom property references", () => {
  test("resolves a reference against a definition in another file", () => {
    const root = fixture({
      "apps/www/src/styles/tokens.css": ":root { --gold-ink: oklch(46.8% 0.102 82); }\n",
      "apps/www/src/components/mark.tsx": "export const M = () => <a style={{ color: \"var(--gold-ink)\" }} />;\n",
    });
    expect(inspectTokenReferences(root).unresolved).toEqual([]);
  });

  test("reports a reference that is never defined", () => {
    const root = fixture({
      "apps/www/src/components/mast.tsx": "export const M = () => <a style={{ color: \"var(--gold-1)\" }} />;\n",
    });
    const report = inspectTokenReferences(root);
    expect(report.unresolved).toHaveLength(1);
    expect(report.unresolved[0]).toMatchObject({
      file: "apps/www/src/components/mast.tsx",
      line: 1,
      name: "--gold-1",
    });
  });

  test("accepts an undefined property when the use site carries a fallback", () => {
    const root = fixture({
      "apps/www/src/components/rail.tsx": "export const R = () => <i style={{ transform: \"scaleY(var(--rail-progress, 0))\" }} />;\n",
    });
    expect(inspectTokenReferences(root).unresolved).toEqual([]);
  });

  test("treats a property written from script as defined", () => {
    const root = fixture({
      "apps/www/src/components/wake.tsx":
        'const style = { offsetDistance: "var(--wake-progress)" };\n' +
        'el.style.setProperty("--wake-progress", String(p));\n',
    });
    expect(inspectTokenReferences(root).unresolved).toEqual([]);
  });

  test("treats a JSX style-object property as defined", () => {
    const root = fixture({
      "apps/problems/src/components/ui/sidebar.tsx":
        'export const S = () => <div style={{ "--sidebar-width": W } as React.CSSProperties} className="w-(--sidebar-width)">{null}</div>;\n' +
        "const x = `calc(var(--sidebar-width) * -1)`;\n",
    });
    expect(inspectTokenReferences(root).unresolved).toEqual([]);
  });

  test("assert throws and names every unresolved site", () => {
    const root = fixture({
      "apps/www/src/app/manifesto/page.tsx": "export default () => <h1 style={{ fontFamily: \"var(--font-serif)\" }} />;\n",
    });
    expect(() => assertTokenReferences(root)).toThrow(/--font-serif/u);
  });
});
