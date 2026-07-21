import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildSiteSearchIndex,
  observatoryProjectionManifest,
  observatoryRelease,
} from "../packages/frontier-data/src/index.ts";

const repository = resolve(import.meta.dirname, "..");
const observatory = resolve(repository, "apps/observatory");
const editorial = resolve(repository, "apps/www");

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function bytesBelow(directory) {
  return filesBelow(directory).reduce((sum, path) => sum + statSync(path).size, 0);
}

const prebuilt = filesBelow(resolve(observatory, ".next/server/app")).filter((path) => path.endsWith(".html"));
if (prebuilt.length >= 50) throw new Error(`Observatory prebuild has ${prebuilt.length} pages`);

const searchHtml = readFileSync(resolve(observatory, ".next/server/app/search.html"));
if (searchHtml.byteLength > 96 * 1024) throw new Error(`search HTML is ${searchHtml.byteLength} bytes`);
const [release, projectionManifest] = await Promise.all([
  observatoryRelease(),
  observatoryProjectionManifest(),
]);
const searchIndex = Buffer.from(JSON.stringify(buildSiteSearchIndex(release, projectionManifest.release_root)));
if (searchIndex.byteLength > 1.5 * 1024 * 1024) throw new Error(`search index is ${searchIndex.byteLength} bytes`);
const searchGzip = gzipSync(searchIndex).byteLength;
if (searchGzip > 250 * 1024) throw new Error(`search index gzip is ${searchGzip} bytes`);

const productFonts = readdirSync(resolve(observatory, "public/assets/fonts")).sort();
const editorialFonts = readdirSync(resolve(editorial, "public/assets/fonts")).sort();
const expectedProductFonts = ["ibm-plex-mono-400-latin.woff2", "ibm-plex-mono-500-latin.woff2", "inter-300-700-latin.woff2"];
if (JSON.stringify(productFonts) !== JSON.stringify(expectedProductFonts)) throw new Error("Observatory font delivery profile drift");
for (const rejected of ["spectral", "space-grotesk", "jetbrains", "newsreader-200-800"]) {
  if ([...productFonts, ...editorialFonts].some((name) => name.includes(rejected))) throw new Error(`rejected font ${rejected} entered delivery`);
}

const editorialBytes = bytesBelow(resolve(editorial, "dist"));
if (editorialBytes > 12 * 1024 * 1024) throw new Error(`editorial build is ${editorialBytes} bytes`);

const facilityHtml = readFileSync(resolve(editorial, "dist/facility/index.html"), "utf8");
const initialScripts = [...facilityHtml.matchAll(/src="([^"]+\.js)"/gu)].map((match) => resolve(editorial, "dist", match[1].replace(/^\//u, "")));
const facilityInitialGzip = initialScripts.reduce((sum, path) => sum + gzipSync(readFileSync(path)).byteLength, 0);
if (facilityInitialGzip > 75 * 1024) throw new Error(`facility initial JavaScript is ${facilityInitialGzip} bytes gzip`);

const browserFiles = [
  ...filesBelow(resolve(observatory, ".next/static")),
  ...filesBelow(resolve(observatory, "public")),
  ...filesBelow(resolve(observatory, ".next/server/app")).filter((path) => path.endsWith(".html")),
].filter((path) => /\.(?:html|js|json)$/u.test(path));
for (const path of browserFiles) {
  const content = readFileSync(path, "utf8");
  if (content.includes('"schema":"vela.observatory-release.v1"')) {
    throw new Error(`${path}: embeds the full frontier projection`);
  }
}

console.log(JSON.stringify({
  ok: true,
  schema: "vela.web-budgets.v1",
  observatory_prebuilt: prebuilt.length,
  search_html_bytes: searchHtml.byteLength,
  search_index_bytes: searchIndex.byteLength,
  search_index_gzip_bytes: searchGzip,
  editorial_bytes: editorialBytes,
  facility_initial_gzip_bytes: facilityInitialGzip,
}));
