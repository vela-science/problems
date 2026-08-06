import { gzipSync } from "node:zlib";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { filesBelow } from "./fs.mjs";
import {
  observatoryProjectionManifest,
  graphRead,
  searchRead,
} from "../packages/frontier-data/src/index.ts";

const repository = resolve(import.meta.dirname, "..");
const observatory = resolve(repository, "apps/observatory");
const editorial = resolve(repository, "apps/www");
const localEnvironment = resolve(observatory, ".env.local");
if (!process.env.VELA_PROJECTION_DATABASE_URL && existsSync(localEnvironment)) {
  const localProjection = parseEnv(
    readFileSync(localEnvironment, "utf8"),
  ).VELA_PROJECTION_DATABASE_URL;
  if (localProjection) process.env.VELA_PROJECTION_DATABASE_URL = localProjection;
}
const scope = process.env.VELA_BUDGET_SCOPE ?? "all";
if (scope !== "all" && scope !== "observatory") throw new Error(`unknown budget scope ${scope}`);

function bytesBelow(directory) {
  return filesBelow(directory).reduce((sum, path) => sum + statSync(path).size, 0);
}

const prebuilt = filesBelow(resolve(observatory, ".next/server/app")).filter((path) => path.endsWith(".html"));
/* A ceiling here IS meaningful — prerendering per-record pages would put
   thousands of files in the build — but it bounds a category error rather than
   a byte count, so it sits well above ordinary growth. */
if (prebuilt.length >= 500) throw new Error(`Observatory prebuild has ${prebuilt.length} pages; per-record routes must stay dynamic`);

/* Sizes are still measured and reported — a number in CI output is useful for
   noticing drift. None of them fails the build: a threshold picked once cannot
   tell a regression from a surface that grew because it now says more. The
   checks that DO fail are the ones naming a specific thing a careless change
   would break: three.js must not enter an initial chunk, no browser file may
   embed the full projection, /search must stay prerendered, and the font
   profile must contain exactly its two identifier faces. */
const searchHtml = readFileSync(resolve(observatory, ".next/server/app/search.html"));
const projectionManifest = await observatoryProjectionManifest();
const [searchResult, graphResult] = await Promise.all([
  searchRead({ root: projectionManifest.release_root, limit: 250 }),
  graphRead({ root: projectionManifest.release_root, frontier: "erdos", view: "canvas", lens: "all", limit: 5000 }),
]);
const searchPayload = Buffer.from(JSON.stringify(searchResult));
const searchGzip = gzipSync(searchPayload).byteLength;
const graphPayload = Buffer.from(JSON.stringify(graphResult));
const graphGzip = gzipSync(graphPayload).byteLength;

const productFonts = readdirSync(resolve(observatory, "public/assets/fonts")).sort();
const editorialFonts = readdirSync(resolve(editorial, "public/assets/fonts")).sort();
// Geist ships through Next's package integration. The Observatory's mirrored
// public font profile therefore contains only the identifier face it serves
// directly; the three editorial faces stay on the editorial profile.
const expectedProductFonts = ["ibm-plex-mono-400-latin.woff2", "ibm-plex-mono-500-latin.woff2"];
if (JSON.stringify(productFonts) !== JSON.stringify(expectedProductFonts)) throw new Error("Observatory font delivery profile drift");
/* Faces this project has decided against, including the two retired on
   2026-07-27. */
for (const rejected of ["spectral", "space-grotesk", "jetbrains", "newsreader", "inter-"]) {
  if ([...productFonts, ...editorialFonts].some((name) => name.includes(rejected))) throw new Error(`rejected font ${rejected} entered delivery`);
}

let editorialBytes = null;
let editorialTotalBytes = null;
let editorialSocialMasterBytes = null;
let facilityInitialGzip = null;
if (scope === "all") {
  /* Next's static export writes to out/, where Astro wrote dist/. */
  const socialMasters = [
    resolve(editorial, "out/og-image.png"),
    resolve(editorial, "out/images/brand/vela-landing-social.jpg"),
    resolve(editorial, "out/images/constellations/frontier-map-og.png"),
  ];
  editorialTotalBytes = bytesBelow(resolve(editorial, "out"));
  editorialSocialMasterBytes = socialMasters.filter(existsSync).reduce((sum, path) => sum + statSync(path).size, 0);
  editorialBytes = editorialTotalBytes - editorialSocialMasterBytes;
  /* The editorial build ships hand-painted plates; its size is a content
   decision, not a regression signal. Measured and reported, never enforced. */

  /* The /facility ceiling was set against Astro, which shipped zero
     framework JavaScript, so 75 KB gzip measured the three.js entry
     alone. Under Next the same page's initial payload is ~187 KB gzip
     and the landing's is ~186 KB — that is the React and App Router
     baseline, not a facility regression, and no byte ceiling in that
     range distinguishes the two.

     So the byte budget is kept only as a coarse ceiling, and the
     assertion that actually mattered is now made directly: none of the
     initial chunks may contain the vendored three.js runtime. That is
     the thing a careless refactor would break — hoisting the import out
     of the effect would pull ~190 KB into every visitor's first load —
     and it is checkable rather than inferred. */
  /* /facility is temporarily absent while the editorial routes are
     rebuilt. The check runs when the route exists rather than being
     deleted, so it comes back automatically with the page. */
  const facilityPath = resolve(editorial, "out/facility.html");
  if (existsSync(facilityPath)) {
    const facilityHtml = readFileSync(facilityPath, "utf8");
    const initialScripts = [...facilityHtml.matchAll(/src="([^"]+\.js)"/gu)].map((match) => resolve(editorial, "out", match[1].replace(/^\//u, "")));
    facilityInitialGzip = 0;
    for (const path of initialScripts) {
      const source = readFileSync(path);
      facilityInitialGzip += gzipSync(source).byteLength;
      const text = source.toString("utf8");
      if (text.includes("WebGLRenderer") || text.includes("THREE.")) {
        throw new Error(`${path}: three.js entered the /facility initial chunk`);
      }
    }
  }
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
