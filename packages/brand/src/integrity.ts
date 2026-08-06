import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const brandRootSchema = "vela.brand-root.v2";

const governedFiles = [
  "packages/brand/vela.tokens.json",
  "packages/brand/marks/source/vela-symbol-full.svg",
  "packages/brand/marks/source/vela-symbol-compact.svg",
  "packages/brand/marks/source/vela-symbol-micro.svg",
  "packages/brand/marks/source/vela-symbol-favicon-16.svg",
  "packages/brand/marks/source/vela-wordmark.svg",
  "packages/brand/marks/source/vela-lockup-horizontal.svg",
  "packages/brand/marks/source/vela-lockup-stacked.svg",
  "packages/brand/marks/exports/MANIFEST.json",
  "packages/brand/marks/exports/MANIFEST.sha256",
  "packages/brand/generated/fonts-editorial.css",
  "packages/brand/generated/fonts-product.css",
  "packages/brand/licenses/FONT-WEB-MANIFEST.sha256",
  "packages/brand/fonts/web/gambetta-300-700-latin.woff2",
  "packages/brand/fonts/web/gambetta-italic-300-700-latin.woff2",
  "packages/brand/fonts/web/ibm-plex-mono-400-latin.woff2",
  "packages/brand/fonts/web/ibm-plex-mono-500-latin.woff2",
  "packages/brand/fonts/web/switzer-100-900-latin.woff2",
  "packages/brand/fonts/web/switzer-italic-100-900-latin.woff2",
  "packages/brand/fonts/web/zodiak-100-900-latin.woff2",
  "packages/brand/fonts/web/zodiak-italic-100-900-latin.woff2",
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
