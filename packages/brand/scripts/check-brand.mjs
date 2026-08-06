import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { editorialFontFamilies, rejectedFontFamilies } from "../src/fonts.ts";

const root = resolve(import.meta.dirname, "..");
const tokens = JSON.parse(readFileSync(resolve(root, "vela.tokens.json"), "utf8"));
const css = readFileSync(resolve(root, "generated/tokens.css"), "utf8");
const editorialFonts = readFileSync(resolve(root, "generated/fonts-editorial.css"), "utf8");
const productFonts = readFileSync(resolve(root, "generated/fonts-product.css"), "utf8");
const sourceRoot = resolve(root, "marks/source");
const exportRoot = resolve(root, "marks/exports");
const masterNames = [
  "vela-symbol-full",
  "vela-symbol-compact",
  "vela-symbol-micro",
  "vela-symbol-favicon-16",
  "vela-wordmark",
  "vela-lockup-horizontal",
  "vela-lockup-stacked",
];
const masters = new Map(
  masterNames.map((name) => [name, readFileSync(resolve(sourceRoot, `${name}.svg`), "utf8")]),
);
const manifestBytes = readFileSync(resolve(exportRoot, "MANIFEST.json"));
const manifest = JSON.parse(manifestBytes);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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
for (const [name, svg] of masters) {
  assert(svg.startsWith("<svg"), `${name} is not a standalone SVG master`);
  assert(svg.includes("viewBox="), `${name} has no viewBox`);
  assert(!/<text\b/iu.test(svg), `${name} contains live text`);
  assert(!/<(?:linear|radial)Gradient\b/iu.test(svg), `${name} contains a gradient`);
  assert(!/(?:filter|mask|clipPath)=/iu.test(svg), `${name} contains fragile SVG effects`);
  assert(svg.includes(tokens.color.brand.midnight.$value), `${name} midnight drift`);
}
for (const name of ["vela-symbol-full", "vela-symbol-compact", "vela-symbol-micro", "vela-symbol-favicon-16"]) {
  assert(masters.get(name).includes(tokens.color.brand.stardust.$value), `${name} stardust drift`);
}
assert(
  sha256(masters.get("vela-symbol-compact")) !== sha256(masters.get("vela-symbol-micro")),
  "compact and micro masters must be optically distinct",
);
assert(manifest.schema === "vela.brand-export-manifest.v1", "brand export manifest schema drift");
for (const entry of manifest.sources) {
  const bytes = readFileSync(resolve(root, "marks", entry.path));
  assert(bytes.byteLength === entry.bytes, `${entry.path} byte length drift`);
  assert(sha256(bytes) === entry.sha256, `${entry.path} source hash drift`);
}
for (const entry of manifest.exports) {
  const bytes = readFileSync(resolve(root, "marks", entry.path));
  assert(bytes.byteLength === entry.bytes, `${entry.path} byte length drift`);
  assert(sha256(bytes) === entry.sha256, `${entry.path} export hash drift`);
}
const recordedManifestHash = readFileSync(resolve(exportRoot, "MANIFEST.sha256"), "utf8").split(/\s+/u)[0];
assert(sha256(manifestBytes) === recordedManifestHash, "brand export manifest hash drift");

for (const size of [16, 20, 32, 48]) {
  const image = sharp(resolve(exportRoot, "png", `favicon-${size}.png`));
  const metadata = await image.metadata();
  assert(metadata.width === size && metadata.height === size, `favicon-${size} geometry drift`);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let visible = 0;
  for (let offset = 3; offset < data.length; offset += info.channels) {
    if (data[offset] > 0) visible += 1;
  }
  assert(visible >= Math.floor(size * size * 0.12), `favicon-${size} lost too much visible geometry`);
}
for (const family of editorialFontFamilies) {
  assert(editorialFonts.includes(`font-family: "${family}"`), `missing editorial ${family} face`);
}
assert(productFonts.includes('font-family: "IBM Plex Mono"'), "missing product IBM Plex Mono face");
for (const family of ["Gambetta", "Zodiak", "Switzer"]) assert(!productFonts.includes(family), `editorial font ${family} entered product profile`);
/* The rejected list is `packages/brand/src/fonts.ts`'s to declare. It used to
   be written out here and again, in filename spellings, in
   `scripts/check-budgets.mjs`, and the two had already drifted apart. */
for (const rejected of rejectedFontFamilies) {
  assert(!editorialFonts.includes(rejected) && !productFonts.includes(rejected), `rejected font ${rejected} remains in generated output`);
}
assert(tokens.font.display.$value.startsWith("Zodiak"), "editorial display role drift");
assert(tokens.font.body.$value.startsWith("Gambetta"), "editorial body role drift");
assert(tokens.font.sans.$value.startsWith("Switzer"), "editorial sans role drift");
assert(tokens.font.mono.$value.startsWith("IBM Plex Mono"), "editorial mono role drift");

console.log(JSON.stringify({
  ok: true,
  schema: "vela.brand-check.v2",
  tokens: required,
  masters: masterNames.length,
  exports: manifest.exports.length,
  manifest_sha256: sha256(manifestBytes),
}));
