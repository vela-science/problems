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
  "color-light-surface-inset": tokens.color.context.light.surfaceInset.$value,
  "color-light-surface-raised": tokens.color.context.light.surfaceRaised.$value,
  "color-light-text-secondary": tokens.color.context.light.textSecondary.$value,
  "color-light-text-muted": tokens.color.context.light.textMuted.$value,
  "color-light-evidence": tokens.color.context.light.evidence.$value,
  "color-light-progress": tokens.color.context.light.progress.$value,
  "color-light-caution": tokens.color.context.light.caution.$value,
  "color-light-conflict": tokens.color.context.light.conflict.$value,
  "color-light-border-subtle": tokens.color.context.light.borderSubtle.$value,
  "color-light-border-strong": tokens.color.context.light.borderStrong.$value,
  "color-light-direction": tokens.color.context.light.direction.$value,
  "color-dark-surface-inset": tokens.color.context.dark.surfaceInset.$value,
  "color-dark-surface-emphasis": tokens.color.context.dark.surfaceEmphasis.$value,
  "color-dark-text-secondary": tokens.color.context.dark.textSecondary.$value,
  "color-dark-border-subtle": tokens.color.context.dark.borderSubtle.$value,
  "color-dark-border-strong": tokens.color.context.dark.borderStrong.$value,
  "color-dark-conflict": tokens.color.context.dark.conflict.$value,
  "font-display": tokens.font.display.$value,
  "font-body": tokens.font.body.$value,
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
  --vela-surface-inset: var(--vela-color-light-surface-inset);
  --vela-surface-raised: var(--vela-color-light-surface-raised);
  --vela-surface-emphasis: var(--vela-color-midnight);
  --vela-text-primary: var(--vela-color-midnight);
  --vela-text-secondary: var(--vela-color-light-text-secondary);
  --vela-text-muted: var(--vela-color-light-text-muted);
  --vela-text-inverse: var(--vela-color-light);
  --vela-border-subtle: var(--vela-color-light-border-subtle);
  --vela-border-strong: var(--vela-color-light-border-strong);
  --vela-focus: var(--vela-color-stardust);
  --vela-direction: var(--vela-color-light-direction);
  --vela-status-evidence: var(--vela-color-light-evidence);
  --vela-status-progress: var(--vela-color-light-progress);
  --vela-status-caution: var(--vela-color-light-caution);
  --vela-status-conflict: var(--vela-color-light-conflict);
  --vela-selection: color-mix(in srgb, var(--vela-color-stardust) 24%, transparent);
  color-scheme: light;
}

[data-theme="dark"],
.dark {
  --vela-surface-canvas: var(--vela-color-midnight);
  --vela-surface-inset: var(--vela-color-dark-surface-inset);
  --vela-surface-raised: var(--vela-color-deep-space);
  --vela-surface-emphasis: var(--vela-color-dark-surface-emphasis);
  --vela-text-primary: var(--vela-color-light);
  --vela-text-secondary: var(--vela-color-dark-text-secondary);
  --vela-text-muted: var(--vela-color-mist);
  --vela-text-inverse: var(--vela-color-midnight);
  --vela-border-subtle: var(--vela-color-dark-border-subtle);
  --vela-border-strong: var(--vela-color-dark-border-strong);
  --vela-focus: var(--vela-color-stardust);
  --vela-direction: var(--vela-color-stardust);
  --vela-status-evidence: var(--vela-color-evidence);
  --vela-status-progress: var(--vela-color-progress);
  --vela-status-caution: var(--vela-color-caution);
  --vela-status-conflict: var(--vela-color-dark-conflict);
  --vela-selection: color-mix(in srgb, var(--vela-color-stardust) 24%, transparent);
  color-scheme: dark;
}

@media (forced-colors: active) {
  :root,
  [data-theme="dark"],
  .dark {
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

/* The product type scale ships as its own generated stylesheet rather than as
   lines in packages/ui/src/styles/product.css. The design-system gate caps
   authored CSS at 180 lines to stop route presentation accumulating there;
   a scale derived from vela.tokens.json is generated, not authored, and
   belongs with the tokens it comes from. Roles are named so none collides
   with a Tailwind default size (xs/sm/base/lg/...), and the block is only
   imported by the product profile so the editorial register keeps its own. */
const textRoles = Object.entries(tokens.text);
const productType = `/* Generated from @vela/brand/vela.tokens.json. Do not edit. */
@theme {
${textRoles.map(([role, spec]) => (
  [
    `  --text-${role}: ${spec.size.$value};`,
    `  --text-${role}--line-height: ${spec.leading.$value};`,
    `  --text-${role}--font-weight: ${spec.weight.$value};`,
    spec.tracking.$value === "0" ? null : `  --text-${role}--letter-spacing: ${spec.tracking.$value};`,
  ].filter(Boolean).join("\n")
)).join("\n")}
}
`;

/* The banner is per-file, not part of the shared face block: both profiles
   serve the mono faces, so a banner baked into `monoFaces` labelled the
   editorial stylesheet as the product profile. */
const profileBanner = (profile) => `/* Vela ${profile} delivery profile. */\n`;

const monoFaces = `@font-face {
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
`;

const productFonts = `${profileBanner("product")}${monoFaces}`;

const editorialFonts = `${profileBanner("editorial")}${monoFaces.trimEnd()}
@font-face {
  font-family: "Switzer";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("/assets/fonts/switzer-100-900-latin.woff2") format("woff2");
}
@font-face {
  font-family: "Switzer";
  font-style: italic;
  font-weight: 100 900;
  font-display: optional;
  src: url("/assets/fonts/switzer-italic-100-900-latin.woff2") format("woff2");
}
@font-face {
  font-family: "Gambetta";
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url("/assets/fonts/gambetta-300-700-latin.woff2") format("woff2");
}
@font-face {
  font-family: "Gambetta";
  font-style: italic;
  font-weight: 300 700;
  font-display: optional;
  src: url("/assets/fonts/gambetta-italic-300-700-latin.woff2") format("woff2");
}
@font-face {
  font-family: "Zodiak";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("/assets/fonts/zodiak-100-900-latin.woff2") format("woff2");
}
@font-face {
  font-family: "Zodiak";
  font-style: italic;
  font-weight: 100 900;
  font-display: optional;
  src: url("/assets/fonts/zodiak-italic-100-900-latin.woff2") format("woff2");
}
`;

const outputs = new Map([
  [resolve(root, "generated/tokens.css"), css],
  [resolve(root, "generated/tokens.ts"), ts],
  [resolve(root, "generated/fonts-product.css"), productFonts],
  [resolve(root, "generated/fonts-editorial.css"), editorialFonts],
  [resolve(root, "generated/type-product.css"), productType],
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
