import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tokens = JSON.parse(readFileSync(resolve(root, "vela.tokens.json"), "utf8"));
const css = readFileSync(resolve(root, "generated/tokens.css"), "utf8");
const editorialFonts = readFileSync(resolve(root, "generated/fonts-editorial.css"), "utf8");
const productFonts = readFileSync(resolve(root, "generated/fonts-product.css"), "utf8");
const mark = readFileSync(resolve(root, "vela-mark-full.svg"), "utf8");
const micro = readFileSync(resolve(root, "vela-mark-micro.svg"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const required = {
  "--vela-color-midnight": tokens.color.brand.midnight.$value,
  "--vela-color-stardust": tokens.color.brand.stardust.$value,
  "--vela-color-light": tokens.color.brand.light.$value,
  "--vela-color-evidence": tokens.color.semantic.evidence.$value,
  "--vela-color-progress": tokens.color.semantic.progress.$value,
  "--vela-color-caution": tokens.color.semantic.caution.$value,
  "--vela-color-conflict": tokens.color.semantic.conflict.$value,
};

for (const [name, value] of Object.entries(required)) {
  assert(css.includes(`${name}: ${value};`), `${name} does not match the designer handoff`);
}
assert(mark.includes(tokens.color.brand.midnight.$value), "full mark midnight drift");
assert(mark.includes(tokens.color.brand.stardust.$value), "full mark stardust drift");
assert(micro.includes(tokens.color.brand.midnight.$value), "micro mark midnight drift");
assert(micro.includes(tokens.color.brand.stardust.$value), "micro mark stardust drift");
for (const family of ["Newsreader Text", "Newsreader Display", "Inter", "IBM Plex Mono"]) {
  assert(editorialFonts.includes(`font-family: "${family}"`), `missing editorial ${family} face`);
}
for (const family of ["Inter", "IBM Plex Mono"]) assert(productFonts.includes(`font-family: "${family}"`), `missing product ${family} face`);
for (const family of ["Newsreader Text", "Newsreader Display"]) assert(!productFonts.includes(family), `editorial font ${family} entered product profile`);
for (const rejected of ["Spectral", "Space Grotesk", "JetBrains Mono", "Geist", "Schibsted"]) {
  assert(!editorialFonts.includes(rejected) && !productFonts.includes(rejected), `rejected font ${rejected} remains in generated output`);
}
assert(tokens.font.display.$value.startsWith("Newsreader"), "editorial display role drift");
assert(tokens.font.sans.$value.startsWith("Inter"), "editorial sans role drift");
assert(tokens.font.mono.$value.startsWith("IBM Plex Mono"), "editorial mono role drift");

console.log(JSON.stringify({ ok: true, schema: "vela.brand-check.v1", tokens: required }));
