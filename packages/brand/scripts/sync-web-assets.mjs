import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = process.argv[2];
if (!target) throw new Error("usage: bun sync-web-assets.mjs TARGET_PUBLIC_DIRECTORY --profile editorial|product [--favicon]");

const profileIndex = process.argv.indexOf("--profile");
const profile = profileIndex >= 0 ? process.argv[profileIndex + 1] : null;
if (profile !== "editorial" && profile !== "product") {
  throw new Error("asset synchronization requires --profile editorial or --profile product");
}

const profileFonts = {
  product: [
    "ibm-plex-mono-400-latin.woff2",
    "ibm-plex-mono-500-latin.woff2",
    "inter-300-700-latin.woff2",
  ],
  editorial: [
    "ibm-plex-mono-400-latin.woff2",
    "ibm-plex-mono-500-latin.woff2",
    "inter-300-700-latin.woff2",
    "newsreader-display-500-latin.woff2",
    "newsreader-display-italic-400-latin.woff2",
    "newsreader-text-400-latin.woff2",
    "newsreader-text-italic-400-latin.woff2",
  ],
};

const output = resolve(process.cwd(), target);
const fontOutput = resolve(output, "assets/fonts");
rmSync(fontOutput, { recursive: true, force: true });
mkdirSync(fontOutput, { recursive: true });
for (const file of profileFonts[profile]) {
  copyFileSync(resolve(root, "fonts/web", file), resolve(fontOutput, file));
}

const delivered = readdirSync(fontOutput).sort();
if (JSON.stringify(delivered) !== JSON.stringify(profileFonts[profile].toSorted())) {
  throw new Error(`font mirror drift for ${profile}`);
}

const copied = ["assets/fonts"];
if (process.argv.includes("--favicon")) {
  copyFileSync(resolve(root, "vela-mark-micro.svg"), resolve(output, "favicon.svg"));
  copied.push("favicon.svg");
}

console.log(JSON.stringify({ ok: true, schema: "vela.brand-asset-sync.v2", profile, output, copied, fonts: delivered }));
