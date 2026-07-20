import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tokens = JSON.parse(readFileSync(resolve(root, "vela.tokens.json"), "utf8"));
const check = process.argv.includes("--check");

const primitives = {
  "color-midnight": tokens.color.brand.midnight.$value,
  "color-deep-space": tokens.color.neutral.deepSpace.$value,
  "color-stardust": tokens.color.brand.stardust.$value,
  "color-light": tokens.color.brand.light.$value,
  "color-slate": tokens.color.neutral.slate.$value,
  "color-mist": tokens.color.neutral.mist.$value,
  "color-fog": tokens.color.neutral.fog.$value,
  "color-evidence": tokens.color.semantic.evidence.$value,
  "color-progress": tokens.color.semantic.progress.$value,
  "color-caution": tokens.color.semantic.caution.$value,
  "color-conflict": tokens.color.semantic.conflict.$value,
  "color-link-light": tokens.color.semantic.linkOnLight.$value,
  "color-link-dark": tokens.color.semantic.linkOnDark.$value,
  "font-display": tokens.font.display.$value,
  "font-sans": tokens.font.sans.$value,
  "font-mono": tokens.font.mono.$value,
  ...Object.fromEntries(Object.entries(tokens.space).map(([name, token]) => [`space-${name}`, token.$value])),
  ...Object.fromEntries(Object.entries(tokens.radius).map(([name, token]) => [`radius-${name}`, token.$value])),
  ...Object.fromEntries(Object.entries(tokens.motion).map(([name, token]) => [`motion-${name}`, token.$value])),
  ...Object.fromEntries(Object.entries(tokens.easing).map(([name, token]) => [`ease-${name}`, token.$value])),
};

const primitiveLines = Object.entries(primitives).map(([name, value]) => `  --vela-${name}: ${value};`);
const css = `/* Generated from @vela/brand/vela.tokens.json. Do not edit. */
:root {
${primitiveLines.join("\n")}

  /* Transitional aliases for the released editorial CSS. Product code uses
     the semantic --vela-* layer above. */
  --brand-midnight: var(--vela-color-midnight);
  --brand-deep-space: var(--vela-color-deep-space);
  --brand-stardust: var(--vela-color-stardust);
  --brand-light: var(--vela-color-light);
  --brand-evidence: var(--vela-color-evidence);
  --brand-progress: var(--vela-color-progress);
  --brand-caution: var(--vela-color-caution);
  --brand-conflict: var(--vela-color-conflict);

  --vela-surface-canvas: var(--vela-color-light);
  --vela-surface-inset: #EEEDE7;
  --vela-surface-raised: #FFFFFF;
  --vela-surface-emphasis: var(--vela-color-midnight);
  --vela-text-primary: var(--vela-color-midnight);
  --vela-text-secondary: #4B5565;
  --vela-text-muted: #6D7480;
  --vela-text-inverse: var(--vela-color-light);
  --vela-border-subtle: #D9DBDF;
  --vela-border-strong: #B8BDC5;
  --vela-focus: var(--vela-color-stardust);
  --vela-direction: #8C6B20;
  --vela-selection: color-mix(in srgb, var(--vela-color-stardust) 24%, transparent);
  color-scheme: light;
}

[data-theme="dark"] {
  --vela-surface-canvas: var(--vela-color-midnight);
  --vela-surface-inset: #0B1629;
  --vela-surface-raised: var(--vela-color-deep-space);
  --vela-surface-emphasis: #050C18;
  --vela-text-primary: var(--vela-color-light);
  --vela-text-secondary: #C5CAD2;
  --vela-text-muted: var(--vela-color-mist);
  --vela-text-inverse: var(--vela-color-midnight);
  --vela-border-subtle: #263247;
  --vela-border-strong: #3A465A;
  --vela-focus: var(--vela-color-stardust);
  --vela-direction: var(--vela-color-stardust);
  --vela-selection: color-mix(in srgb, var(--vela-color-stardust) 24%, transparent);
  color-scheme: dark;
}

@media (forced-colors: active) {
  :root,
  [data-theme="dark"] {
    --vela-focus: Highlight;
    --vela-border-subtle: CanvasText;
    --vela-border-strong: CanvasText;
  }
}
`;

const ts = `/* Generated from @vela/brand/vela.tokens.json. Do not edit. */
export const velaTokens = ${JSON.stringify(primitives, null, 2)} as const;
export type VelaTokenName = keyof typeof velaTokens;
`;

const fonts = `/* Shared self-hosted Vela font faces. */
@font-face {
  font-family: "IBM Plex Mono";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/assets/fonts/ibm-plex-mono-400-latin.woff2") format("woff2");
}
@font-face {
  font-family: "IBM Plex Mono";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/assets/fonts/ibm-plex-mono-500-latin.woff2") format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url("/assets/fonts/inter-300-700-latin.woff2") format("woff2");
}
@font-face {
  font-family: "Newsreader";
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url("/assets/fonts/newsreader-200-800-latin.woff2") format("woff2");
}
@font-face {
  font-family: "Newsreader";
  font-style: italic;
  font-weight: 200 800;
  font-display: swap;
  src: url("/assets/fonts/newsreader-200-800-italic-latin.woff2") format("woff2");
}
`;

const outputs = new Map([
  [resolve(root, "generated/tokens.css"), css],
  [resolve(root, "generated/tokens.ts"), ts],
  [resolve(root, "generated/fonts.css"), fonts],
]);

for (const [path, expected] of outputs) {
  if (check) {
    const actual = readFileSync(path, "utf8");
    if (actual !== expected) throw new Error(`${path} is stale; run bun run --filter @vela/brand build`);
  } else {
    writeFileSync(path, expected);
  }
}

console.log(JSON.stringify({
  ok: true,
  schema: "vela.brand-generation.v2",
  mode: check ? "check" : "write",
  token_count: Object.keys(primitives).length,
  outputs: outputs.size,
}));
