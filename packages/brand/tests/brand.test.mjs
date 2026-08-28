import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { rejectedFontFamilies } from "../src/fonts.ts";

const root = resolve(import.meta.dirname, "..");
const tokens = JSON.parse(readFileSync(resolve(root, "vela.tokens.json"), "utf8"));
const css = readFileSync(resolve(root, "generated/tokens.css"), "utf8");
const editorialFonts = readFileSync(resolve(root, "generated/fonts-editorial.css"), "utf8");
const productFonts = readFileSync(resolve(root, "generated/fonts-product.css"), "utf8");
const exportManifest = JSON.parse(readFileSync(resolve(root, "marks/exports/MANIFEST.json"), "utf8"));

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = hex.match(/[0-9a-f]{2}/giu).map((part) => channel(Number.parseInt(part, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

test("locked brand values survive DTCG generation", () => {
  assert.match(css, /--vela-color-midnight: #081224;/u);
  assert.match(css, /--vela-color-stardust: #C9A664;/u);
  assert.match(css, /--vela-color-light: #F7F6F2;/u);
  assert.match(css, /--vela-color-water: #4E7499;/u);
  assert.match(css, /--vela-color-horizon: #E6D39A;/u);
  assert.match(css, /--vela-color-cinnabar: #A24739;/u);
  assert.equal(tokens.font.display.$value.split(",")[0], "Zodiak");
  assert.equal(tokens.font.body.$value.split(",")[0], "Gambetta");
  assert.equal(tokens.font.editorialDisplay.$value, '"Iowan Old Style", Baskerville, "Times New Roman", serif');
  assert.equal(tokens.font.editorialBody.$value, '"Iowan Old Style", Baskerville, "Times New Roman", serif');
  assert.match(css, /--vela-font-editorial-display: "Iowan Old Style", Baskerville, "Times New Roman", serif;/u);
  assert.equal(tokens.font.sans.$value.split(",")[0], "Switzer");
  assert.equal(tokens.font.mono.$value.split(",")[0], "IBM Plex Mono");
});

test("primary foreground pairs pass WCAG AA", () => {
  assert.ok(contrast("#F7F6F2", "#081224") >= 7);
  assert.ok(contrast("#F7F6F2", "#111827") >= 7);
  assert.ok(contrast("#081224", "#F7F6F2") >= 7);
  assert.ok(contrast(tokens.color.context.dark.conflict.$value, "#081224") >= 4.5);
  /* The brand owns its two canvases and the status hues tuned for them; it no
     longer owns surfaces. `surfaceInset`, `surfaceRaised` and `textMuted` were
     part of a semantic layer that `@vela/ui`'s theme.css defined a second time
     and, importing later, always won — so this asserted contrast against values
     the product never painted. The surviving canvas is asserted here; the live
     surfaces are guarded in `check:design-system` and measured against every
     rendered text node in the route sweep. */
  for (const status of ["evidence", "progress", "caution", "conflict"]) {
    assert.ok(contrast(tokens.color.context.light[status].$value, "#F7F6F2") >= 4.5);
  }
  assert.match(editorialFonts, /font-family: "Gambetta";[\s\S]*?gambetta-300-700-latin\.woff2/u);
  assert.match(editorialFonts, /font-family: "Gambetta";[\s\S]*?gambetta-italic-300-700-latin\.woff2/u);
  assert.match(editorialFonts, /font-family: "Zodiak";[\s\S]*?zodiak-100-900-latin\.woff2/u);
  assert.match(editorialFonts, /font-family: "Zodiak";[\s\S]*?zodiak-italic-100-900-latin\.woff2/u);
  assert.match(editorialFonts, /font-family: "Switzer";[\s\S]*?switzer-100-900-latin\.woff2/u);
  assert.match(productFonts, /font-family: "Zodiak";[\s\S]*?zodiak-100-900-latin\.woff2/u);
  assert.match(productFonts, /font-family: "Gambetta";[\s\S]*?gambetta-300-700-latin\.woff2/u);
  assert.match(productFonts, /font-family: "Switzer";[\s\S]*?switzer-100-900-latin\.woff2/u);
  // No rejected face may appear in either profile. This named two of the six,
  // Newsreader and Inter, which made it a third partial copy of a list that
  // already existed twice; the list is `../src/fonts.ts`'s to declare.
  for (const rejected of rejectedFontFamilies) {
    assert.doesNotMatch(editorialFonts, new RegExp(rejected, "u"));
    assert.doesNotMatch(productFonts, new RegExp(rejected, "u"));
  }
});

test("status semantics are never represented as an unlabelled palette", () => {
  for (const name of ["evidence", "progress", "caution", "conflict"]) {
    assert.match(css, new RegExp(`--vela-color-${name}:`));
  }
  /* The forced-colors block moved out with the semantic layer: it set only
     `--vela-focus` and the two border tokens, all three now gone, while the
     live rule lives in `@vela/ui`'s foundation.css and is asserted by
     `check:design-system`. */
});

test("identity masters and deterministic delivery exports are complete", () => {
  const expectedSources = [
    "source/vela-lockup-horizontal.svg",
    "source/vela-lockup-stacked.svg",
    "source/vela-symbol-compact.svg",
    "source/vela-symbol-favicon-16.svg",
    "source/vela-symbol-full.svg",
    "source/vela-symbol-micro.svg",
    "source/vela-wordmark.svg",
  ];
  assert.equal(exportManifest.schema, "vela.brand-export-manifest.v1");
  assert.deepEqual(exportManifest.sources.map(({ path }) => path).sort(), expectedSources);
  assert.ok(exportManifest.exports.length >= 90);
  const sourceHashes = Object.fromEntries(exportManifest.sources.map(({ path, sha256 }) => [path, sha256]));
  assert.notEqual(sourceHashes["source/vela-symbol-compact.svg"], sourceHashes["source/vela-symbol-micro.svg"]);
  for (const source of exportManifest.sources) {
    assert.match(source.sha256, /^[0-9a-f]{64}$/u);
    assert.ok(source.bytes > 0);
  }
});
