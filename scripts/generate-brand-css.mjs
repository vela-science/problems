import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tokens = JSON.parse(readFileSync(resolve(root, "brand/vela.tokens.json"), "utf8"));
const outputPath = resolve(root, "src/styles/brand.generated.css");
const values = [
  ["midnight", tokens.color.brand.midnight.$value],
  ["stardust", tokens.color.brand.stardust.$value],
  ["light", tokens.color.brand.light.$value],
  ["deep-space", tokens.color.neutral.deepSpace.$value],
  ["slate", tokens.color.neutral.slate.$value],
  ["mist", tokens.color.neutral.mist.$value],
  ["fog", tokens.color.neutral.fog.$value],
  ["evidence", tokens.color.semantic.evidence.$value],
  ["progress", tokens.color.semantic.progress.$value],
  ["caution", tokens.color.semantic.caution.$value],
  ["conflict", tokens.color.semantic.conflict.$value],
  ["link-light", tokens.color.semantic.linkOnLight.$value],
  ["link-dark", tokens.color.semantic.linkOnDark.$value],
];
const expected = [
  "/* Generated from brand/vela.tokens.json. Run `pnpm brand:generate`. */",
  ":root {",
  ...values.map(([name, value]) => `  --brand-${name}: ${value};`),
  "}",
  "",
].join("\n");

if (process.argv.includes("--check")) {
  const actual = readFileSync(outputPath, "utf8");
  if (actual !== expected) throw new Error("src/styles/brand.generated.css is stale; run pnpm brand:generate");
  console.log(JSON.stringify({ ok: true, schema: "vela.brand-generation.v1", tokens: values.length }));
} else {
  writeFileSync(outputPath, expected);
  console.log(JSON.stringify({ ok: true, schema: "vela.brand-generation.v1", output: "src/styles/brand.generated.css" }));
}
