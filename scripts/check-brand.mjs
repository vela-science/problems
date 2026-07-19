import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tokens = JSON.parse(readFileSync(resolve(root, "brand/vela.tokens.json"), "utf8"));
const css = readFileSync(resolve(root, "src/styles/brand.generated.css"), "utf8");
const mark = readFileSync(resolve(root, "brand/vela-mark-full.svg"), "utf8");
const micro = readFileSync(resolve(root, "brand/vela-mark-micro.svg"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const required = {
  "--brand-midnight": tokens.color.brand.midnight.$value,
  "--brand-stardust": tokens.color.brand.stardust.$value,
  "--brand-light": tokens.color.brand.light.$value,
  "--brand-evidence": tokens.color.semantic.evidence.$value,
  "--brand-progress": tokens.color.semantic.progress.$value,
  "--brand-caution": tokens.color.semantic.caution.$value,
  "--brand-conflict": tokens.color.semantic.conflict.$value,
};

for (const [name, value] of Object.entries(required)) {
  assert(css.includes(`${name}: ${value};`), `${name} does not match the designer handoff`);
}
assert(mark.includes(tokens.color.brand.midnight.$value), "full mark midnight drift");
assert(mark.includes(tokens.color.brand.stardust.$value), "full mark stardust drift");
assert(micro.includes(tokens.color.brand.midnight.$value), "micro mark midnight drift");
assert(micro.includes(tokens.color.brand.stardust.$value), "micro mark stardust drift");
const packageJson = readFileSync(resolve(root, "package.json"), "utf8");
assert(!packageJson.toLowerCase().includes("tailwind"), "Tailwind must not be a web dependency");

console.log(JSON.stringify({ ok: true, schema: "vela.brand-check.v1", tokens: required }));
