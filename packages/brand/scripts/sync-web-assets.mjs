import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFontFileNamingConvention,
  webFontProfiles,
} from "../src/fonts.ts";

const root = resolve(import.meta.dirname, "..");
const target = process.argv[2];
if (!target) throw new Error("usage: bun sync-web-assets.mjs TARGET_PUBLIC_DIRECTORY --profile editorial|product [--favicon]");

const profileIndex = process.argv.indexOf("--profile");
const profile = profileIndex >= 0 ? process.argv[profileIndex + 1] : null;
if (profile !== "editorial" && profile !== "product") {
  throw new Error("asset synchronization requires --profile editorial or --profile product");
}

/* The mirror is checked against what the package SHIPS, before it copies.
   What stood here instead compared the output directory to the same list that
   had just filled it, one statement earlier, after wiping it: it could only
   have failed if copyFileSync returned without writing, so it never failed and
   never could. The drift it was named for is on the other side. A face landing
   in fonts/web that no profile delivers is invisible until a page asks for it,
   and a profile naming a file the package does not ship only surfaces as a
   copy error with no mention of a profile. Both are one comparison. */
const shipped = readdirSync(resolve(root, "fonts/web")).filter((name) => name.endsWith(".woff2")).sort();
const declared = [...new Set(Object.values(webFontProfiles).flat())].sort();
if (JSON.stringify(shipped) !== JSON.stringify(declared)) {
  throw new Error(
    `font mirror drift: fonts/web ships [${shipped.join(", ")}], the profiles declare [${declared.join(", ")}]`,
  );
}
assertFontFileNamingConvention(shipped);

const output = resolve(process.cwd(), target);
const fontOutput = resolve(output, "assets/fonts");
rmSync(fontOutput, { recursive: true, force: true });
mkdirSync(fontOutput, { recursive: true });
for (const file of webFontProfiles[profile]) {
  copyFileSync(resolve(root, "fonts/web", file), resolve(fontOutput, file));
}

const delivered = readdirSync(fontOutput).sort();

const copied = ["assets/fonts"];
if (process.argv.includes("--favicon")) {
  copyFileSync(resolve(root, "marks/source/vela-symbol-favicon-16.svg"), resolve(output, "favicon.svg"));
  copied.push("favicon.svg");
}

console.log(JSON.stringify({ ok: true, schema: "vela.brand-asset-sync.v2", profile, output, copied, fonts: delivered }));
