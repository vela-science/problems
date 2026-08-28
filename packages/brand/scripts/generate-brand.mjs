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
  "color-water": tokens.color.brand.water.$value,
  "color-horizon": tokens.color.brand.horizon.$value,
  "color-cinnabar": tokens.color.brand.cinnabar.$value,
  "color-slate": tokens.color.neutral.slate.$value,
  "color-mist": tokens.color.neutral.mist.$value,
  "color-fog": tokens.color.neutral.fog.$value,
  "color-evidence": tokens.color.semantic.evidence.$value,
  "color-progress": tokens.color.semantic.progress.$value,
  "color-caution": tokens.color.semantic.caution.$value,
  "color-conflict": tokens.color.semantic.conflict.$value,
  "color-link-light": tokens.color.semantic.linkOnLight.$value,
  "color-link-dark": tokens.color.semantic.linkOnDark.$value,
  "color-light-evidence": tokens.color.context.light.evidence.$value,
  "color-light-progress": tokens.color.context.light.progress.$value,
  "color-light-caution": tokens.color.context.light.caution.$value,
  "color-light-conflict": tokens.color.context.light.conflict.$value,
  "color-light-direction": tokens.color.context.light.direction.$value,
  "color-dark-conflict": tokens.color.context.dark.conflict.$value,
  "font-display": tokens.font.display.$value,
  "font-body": tokens.font.body.$value,
  "font-editorial-display": tokens.font.editorialDisplay.$value,
  "font-editorial-body": tokens.font.editorialBody.$value,
  "font-sans": tokens.font.sans.$value,
  "font-mono": tokens.font.mono.$value,
};

const primitiveLines = Object.entries(primitives).map(([name, value]) => `  --vela-${name}: ${value};`);
const css = `/* Generated from @vela/brand/vela.tokens.json. Do not edit. */
:root {
${primitiveLines.join("\n")}


  --vela-direction: var(--vela-color-light-direction);
  color-scheme: light;
}

[data-theme="dark"],
.dark {
  --vela-direction: var(--vela-color-stardust);
  color-scheme: dark;
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

const registerFaces = `${monoFaces.trimEnd()}
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

const productFonts = `${profileBanner("product")}${registerFaces}`;
const editorialFonts = `${profileBanner("editorial")}${registerFaces}`;

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
