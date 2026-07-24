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
      "apps/www/src/components/Mark.astro": "<style>a { color: var(--gold-ink); }</style>\n",
    });
    expect(inspectTokenReferences(root).unresolved).toEqual([]);
  });

  test("reports a reference that is never defined", () => {
    const root = fixture({
      "apps/www/src/components/Mast.astro": "<style>a { color: var(--gold-1); }</style>\n",
    });
    const report = inspectTokenReferences(root);
    expect(report.unresolved).toHaveLength(1);
    expect(report.unresolved[0]).toMatchObject({
      file: "apps/www/src/components/Mast.astro",
      line: 1,
      name: "--gold-1",
    });
  });

  test("accepts an undefined property when the use site carries a fallback", () => {
    const root = fixture({
      "apps/www/src/components/Rail.astro": "<style>i { transform: scaleY(var(--rail-progress, 0)); }</style>\n",
    });
    expect(inspectTokenReferences(root).unresolved).toEqual([]);
  });

  test("treats a property written from script as defined", () => {
    const root = fixture({
      "apps/www/src/components/Wake.astro":
        '<style>path { offset-distance: var(--wake-progress); }</style>\n' +
        '<script>el.style.setProperty("--wake-progress", String(p));</script>\n',
    });
    expect(inspectTokenReferences(root).unresolved).toEqual([]);
  });

  test("treats a JSX style-object property as defined", () => {
    const root = fixture({
      "apps/observatory/src/components/ui/sidebar.tsx":
        'export const S = () => <div style={{ "--sidebar-width": W } as React.CSSProperties} className="w-(--sidebar-width)">{null}</div>;\n' +
        "const x = `calc(var(--sidebar-width) * -1)`;\n",
    });
    expect(inspectTokenReferences(root).unresolved).toEqual([]);
  });

  test("assert throws and names every unresolved site", () => {
    const root = fixture({
      "apps/www/src/pages/manifesto.astro": "<style>h1 { font-family: var(--font-serif); }</style>\n",
    });
    expect(() => assertTokenReferences(root)).toThrow(/--font-serif/u);
  });
});
