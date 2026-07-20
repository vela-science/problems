import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const brandRootSchema = "vela.brand-root.v2";

const governedFiles = [
  "packages/brand/vela.tokens.json",
  "packages/brand/vela-mark-full.svg",
  "packages/brand/vela-mark-micro.svg",
  "packages/brand/generated/fonts-editorial.css",
  "packages/brand/generated/fonts-product.css",
  "packages/brand/licenses/FONT-SOURCE-MANIFEST.sha256",
  "packages/brand/licenses/FONT-WEB-MANIFEST.sha256",
  "packages/brand/fonts/source/newsreader-200-800-italic-latin.woff2",
  "packages/brand/fonts/source/newsreader-200-800-latin.woff2",
  "packages/brand/fonts/web/ibm-plex-mono-400-latin.woff2",
  "packages/brand/fonts/web/ibm-plex-mono-500-latin.woff2",
  "packages/brand/fonts/web/inter-300-700-latin.woff2",
  "packages/brand/fonts/web/newsreader-display-500-latin.woff2",
  "packages/brand/fonts/web/newsreader-display-italic-400-latin.woff2",
  "packages/brand/fonts/web/newsreader-text-400-latin.woff2",
  "packages/brand/fonts/web/newsreader-text-italic-400-latin.woff2",
];

export function computeBrandRoot(repositoryRoot: string): `sha256:${string}` {
  const hash = createHash("sha256");
  hash.update(`${brandRootSchema}\0`);
  for (const path of governedFiles) {
    const bytes = readFileSync(resolve(repositoryRoot, path));
    hash.update(`${path}\0${bytes.byteLength}\0`);
    hash.update(bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}

export function governedBrandFiles() {
  return [...governedFiles];
}
