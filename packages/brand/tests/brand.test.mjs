import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const tokens = JSON.parse(readFileSync(resolve(root, "vela.tokens.json"), "utf8"));
const css = readFileSync(resolve(root, "generated/tokens.css"), "utf8");
const fonts = readFileSync(resolve(root, "generated/fonts.css"), "utf8");

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
  assert.equal(tokens.font.display.$value.split(",")[0], "Newsreader");
  assert.equal(tokens.font.sans.$value.split(",")[0], "Inter");
  assert.equal(tokens.font.mono.$value.split(",")[0], "IBM Plex Mono");
});

test("primary foreground pairs pass WCAG AA", () => {
  assert.ok(contrast("#F7F6F2", "#081224") >= 7);
  assert.ok(contrast("#F7F6F2", "#111827") >= 7);
  assert.ok(contrast("#081224", "#F7F6F2") >= 7);
  assert.ok(contrast(tokens.color.context.dark.conflict.$value, "#081224") >= 4.5);
  for (const surface of ["#F7F6F2", tokens.color.context.light.surfaceInset.$value, tokens.color.context.light.surfaceRaised.$value]) {
    assert.ok(contrast(tokens.color.context.light.textMuted.$value, surface) >= 4.5);
    for (const status of ["evidence", "progress", "caution", "conflict"]) {
      assert.ok(contrast(tokens.color.context.light[status].$value, surface) >= 4.5);
    }
  }
  assert.notEqual(tokens.color.context.light.surfaceRaised.$value.toLowerCase(), "#ffffff");
  assert.match(fonts, /font-family: "Newsreader Text";[\s\S]*?newsreader-text-400-latin\.woff2/u);
  assert.match(fonts, /font-family: "Newsreader Text";[\s\S]*?newsreader-text-italic-400-latin\.woff2/u);
  assert.match(fonts, /font-family: "Newsreader Display";[\s\S]*?newsreader-display-500-latin\.woff2/u);
  assert.match(fonts, /font-family: "Newsreader Display";[\s\S]*?newsreader-display-italic-400-latin\.woff2/u);
});

test("status semantics are never represented as an unlabelled palette", () => {
  for (const name of ["evidence", "progress", "caution", "conflict"]) {
    assert.match(css, new RegExp(`--vela-color-${name}:`));
  }
  assert.match(css, /@media \(forced-colors: active\)/u);
});
