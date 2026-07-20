import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tokens = JSON.parse(readFileSync(resolve(root, "vela.tokens.json"), "utf8"));
const css = readFileSync(resolve(root, "generated/tokens.css"), "utf8");
const fonts = readFileSync(resolve(root, "generated/fonts.css"), "utf8");
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
for (const family of ["Newsreader", "Inter", "IBM Plex Mono"]) {
  assert(fonts.includes(`font-family: "${family}"`), `missing shared ${family} face`);
}
for (const rejected of ["Spectral", "Space Grotesk", "JetBrains Mono", "Geist", "Schibsted"]) {
  assert(!fonts.includes(rejected), `rejected font ${rejected} remains in shared output`);
}

console.log(JSON.stringify({ ok: true, schema: "vela.brand-check.v1", tokens: required }));
