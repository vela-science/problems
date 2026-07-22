import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  observatoryProjectionManifest,
  graphRead,
  searchRead,
} from "../packages/frontier-data/src/index.ts";

const repository = resolve(import.meta.dirname, "..");
const observatory = resolve(repository, "apps/observatory");
const editorial = resolve(repository, "apps/www");
const scope = process.env.VELA_BUDGET_SCOPE ?? "all";
if (scope !== "all" && scope !== "observatory") throw new Error(`unknown budget scope ${scope}`);

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
const projectionManifest = await observatoryProjectionManifest();
const [searchResult, graphResult] = await Promise.all([
  searchRead({ root: projectionManifest.release_root, limit: 250 }),
  graphRead({ root: projectionManifest.release_root, frontier: "erdos", view: "canvas", lens: "all", limit: 5000 }),
]);
const searchPayload = Buffer.from(JSON.stringify(searchResult));
const searchGzip = gzipSync(searchPayload).byteLength;
if (searchGzip > 250 * 1024) throw new Error(`search response gzip is ${searchGzip} bytes`);
const graphPayload = Buffer.from(JSON.stringify(graphResult));
const graphGzip = gzipSync(graphPayload).byteLength;
if (graphGzip > 500 * 1024) throw new Error(`graph canvas gzip is ${graphGzip} bytes`);

const productFonts = readdirSync(resolve(observatory, "public/assets/fonts")).sort();
const editorialFonts = readdirSync(resolve(editorial, "public/assets/fonts")).sort();
// Geist ships through Next's package integration. The Observatory's mirrored
// public font profile therefore contains only the identifier face it serves
// directly; Inter remains an editorial delivery asset.
const expectedProductFonts = ["ibm-plex-mono-400-latin.woff2", "ibm-plex-mono-500-latin.woff2"];
if (JSON.stringify(productFonts) !== JSON.stringify(expectedProductFonts)) throw new Error("Observatory font delivery profile drift");
for (const rejected of ["spectral", "space-grotesk", "jetbrains", "newsreader-200-800"]) {
  if ([...productFonts, ...editorialFonts].some((name) => name.includes(rejected))) throw new Error(`rejected font ${rejected} entered delivery`);
}

let editorialBytes = null;
let editorialTotalBytes = null;
let editorialSocialMasterBytes = null;
let facilityInitialGzip = null;
if (scope === "all") {
  const socialMasters = [
    resolve(editorial, "dist/og-image.png"),
    resolve(editorial, "dist/images/brand/vela-landing-social.jpg"),
    resolve(editorial, "dist/images/constellations/frontier-map-og.png"),
  ];
  editorialTotalBytes = bytesBelow(resolve(editorial, "dist"));
  editorialSocialMasterBytes = socialMasters.reduce((sum, path) => sum + statSync(path).size, 0);
  editorialBytes = editorialTotalBytes - editorialSocialMasterBytes;
  if (editorialBytes > 12 * 1024 * 1024) throw new Error(`editorial build is ${editorialBytes} bytes`);

  const facilityHtml = readFileSync(resolve(editorial, "dist/facility/index.html"), "utf8");
  const initialScripts = [...facilityHtml.matchAll(/src="([^"]+\.js)"/gu)].map((match) => resolve(editorial, "dist", match[1].replace(/^\//u, "")));
  facilityInitialGzip = initialScripts.reduce((sum, path) => sum + gzipSync(readFileSync(path)).byteLength, 0);
  if (facilityInitialGzip > 75 * 1024) throw new Error(`facility initial JavaScript is ${facilityInitialGzip} bytes gzip`);
}

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
  scope,
  observatory_prebuilt: prebuilt.length,
  search_html_bytes: searchHtml.byteLength,
  search_response_bytes: searchPayload.byteLength,
  search_response_gzip_bytes: searchGzip,
  graph_canvas_bytes: graphPayload.byteLength,
  graph_canvas_gzip_bytes: graphGzip,
  editorial_bytes: editorialBytes,
  editorial_total_bytes: editorialTotalBytes,
  editorial_social_master_bytes: editorialSocialMasterBytes,
  facility_initial_gzip_bytes: facilityInitialGzip,
}));
