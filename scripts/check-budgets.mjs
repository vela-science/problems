import { gzipSync } from "node:zlib";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { filesBelow } from "./fs.mjs";
import {
  allRepositories,
  projectionManifest as readProjectionManifest,
  graphRead,
  searchRead,
} from "../packages/projection-data/src/index.ts";
import { fontFileStem, rejectedFontFamilies, webFontProfiles } from "../packages/brand/src/fonts.ts";

const repository = resolve(import.meta.dirname, "..");
const problems = resolve(repository, "apps/problems");
const localEnvironment = resolve(problems, ".env.local");
if (!process.env.VELA_PROJECTION_DATABASE_URL && existsSync(localEnvironment)) {
  const localProjection = parseEnv(
    readFileSync(localEnvironment, "utf8"),
  ).VELA_PROJECTION_DATABASE_URL;
  if (localProjection) process.env.VELA_PROJECTION_DATABASE_URL = localProjection;
}
const scope = process.env.VELA_BUDGET_SCOPE ?? "all";
if (scope !== "all" && scope !== "problems") throw new Error(`unknown budget scope ${scope}`);

const prebuilt = filesBelow(resolve(problems, ".next/server/app")).filter((path) => path.endsWith(".html"));
/* A ceiling here IS meaningful — prerendering per-record pages would put
   thousands of files in the build — but it bounds a category error rather than
   a byte count, so it sits well above ordinary growth. */
if (prebuilt.length >= 500) throw new Error(`Vela app prebuild has ${prebuilt.length} pages; per-record and exact Problem routes must stay dynamic`);

/* Sizes are still measured and reported — a number in CI output is useful for
   noticing drift. None of them fails the build: a threshold picked once cannot
   tell a regression from a surface that grew because it now says more. The
   checks that DO fail are the ones naming a specific thing a careless change
   would break: three.js must not enter an initial chunk, no browser file may
   embed the full projection, /search must stay prerendered, and the font
   profile must contain exactly its two identifier faces. */
const searchHtml = readFileSync(resolve(problems, ".next/server/app/search.html"));
const projectionManifest = await readProjectionManifest();
const root = projectionManifest.release_root;
/* The heaviest canvas the release can actually serve, found by asking the
   release which Repositories it has.

   This named `erdos` outright. `graphRead` rejects a slug the release does not
   carry, so when the four topic repositories collapsed into one derived
   Repository this stopped measuring anything and started throwing "unknown
   repository" — failing `test:budgets` on a projection that was correct. A budget check may not
   hold an opinion about which records exist. */
const repositories = await allRepositories();
if (!repositories.length) throw new Error("the projection publishes no Repository to measure");
const searchResult = await searchRead({ root, limit: 250 });
const graphs = await Promise.all(repositories.map(async ({ slug }) => ({
  slug,
  payload: Buffer.from(JSON.stringify(
    await graphRead({ root, repository: slug, view: "canvas", lens: "all", limit: 5000 }),
  )),
})));
const heaviestGraph = graphs.reduce((a, b) => (b.payload.byteLength > a.payload.byteLength ? b : a));
const searchPayload = Buffer.from(JSON.stringify(searchResult));
const searchGzip = gzipSync(searchPayload).byteLength;
const graphPayload = heaviestGraph.payload;
const graphGzip = gzipSync(graphPayload).byteLength;

const productFonts = readdirSync(resolve(problems, "public/assets/fonts")).sort();
// Geist ships through Next's package integration. The Problems public font
// profile therefore contains only the identifier face it serves directly.
// The profile itself is @vela/brand's to declare — this asserts delivery
// matches it rather than restating filenames here.
if (JSON.stringify(productFonts) !== JSON.stringify([...webFontProfiles.product].sort())) {
  throw new Error("Problems font delivery profile drift");
}
/* Rejected faces, read from the one list that names them. This check looks at
   delivered FILES while check-brand.mjs looks at generated CSS families, so
   the filename form is derived from the family rather than spelled out again:
   the second spelling that used to live here had lost Schibsted, and a
   schibsted-*.woff2 would have shipped. */
for (const family of rejectedFontFamilies) {
  const stem = fontFileStem(family);
  if (productFonts.some((name) => name.startsWith(`${stem}-`))) {
    throw new Error(`rejected font ${family} entered delivery`);
  }
}

const browserFiles = [
  ...filesBelow(resolve(problems, ".next/static")),
  ...filesBelow(resolve(problems, "public")),
  ...filesBelow(resolve(problems, ".next/server/app")).filter((path) => path.endsWith(".html")),
].filter((path) => /\.(?:html|js|json)$/u.test(path));
for (const path of browserFiles) {
  const content = readFileSync(path, "utf8");
  if (content.includes('"schema":"vela.projection-release.v1"')) {
    throw new Error(`${path}: embeds the full repository projection`);
  }
}

console.log(JSON.stringify({
  ok: true,
  schema: "vela.web-budgets.v1",
  scope,
  problems_prebuilt: prebuilt.length,
  search_html_bytes: searchHtml.byteLength,
  search_response_bytes: searchPayload.byteLength,
  search_response_gzip_bytes: searchGzip,
  graph_canvas_repository: heaviestGraph.slug,
  graph_canvas_bytes: graphPayload.byteLength,
  graph_canvas_gzip_bytes: graphGzip,
}));
