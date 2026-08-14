import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

/*
  The Problems's route contract, derived rather than listed.

  This held 27 hand-typed Next app-path patterns and asserted each was in the
  build manifest. That list was written once and never grew: the tree it
  described had reached 35 route files, so eight routes were covered by
  nothing — /account, /api/account, /auth/callback and /sign-in among them,
  which is the entire authenticated surface.

  The App Router already states which routes exist; it states it in the file
  tree, which is the only place that cannot disagree with itself. So the
  patterns come from there now, and the manifest is checked against them in
  both directions. Deleting a route file no longer fails this check — it
  cannot, since the file is the source — and that question moved to where it
  was always answered better: check-runtime-routes.mjs fetches the reader-
  facing URLs and asserts each renders, which is a stronger claim than "the
  build emitted a chunk for it".

  What this gains beyond coverage is the shadow check at the bottom. A page
  can build cleanly and still be unreachable, because vercel.json redirects
  its URL away before Next ever sees the request, and nothing here could
  previously notice.
*/

const app = resolve(import.meta.dirname, "..");
const next = resolve(app, ".next");
const appDirectory = resolve(app, "src/app");

async function filesBelow(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path));
    else files.push(path);
  }
  return files;
}

/* Next's metadata file conventions, which produce a route under a name that is
   not the file's own. Only the two this app has are mapped. A third arriving —
   `manifest.ts` is the likely one — is caught by the reverse direction below,
   which sees a built route no source file accounts for and stops: verified by
   putting `/manifest.webmanifest/route` into the manifest by hand, exit 1.
   Mapping a convention with no instance would instead cover it silently, on a
   guess nothing here can test. */
const metadataRoutes = new Map([
  ["robots", "robots.txt"],
  ["sitemap", "sitemap.xml"],
]);

const routeExtensions = /\.(?:tsx?|jsx?)$/u;

/*
  One source file to the app path Next builds it under.

  Next retains route groups `(name)` in its app-paths manifest even though they
  are URL-transparent, so they remain in this internal pattern. Parallel routes
  `@slot` and private folders `_name` change the mapping in ways this tree does
  not use and remain hard failures: a mapping that silently guesses is how a
  route ends up covered by a pattern that describes a different URL.
*/
function appPathFor(file) {
  const relative = file.slice(appDirectory.length + 1);
  const segments = relative.split("/");
  const basename = segments.pop().replace(routeExtensions, "");
  for (const segment of segments) {
    if (/^\([^)]+\)$/u.test(segment)) continue;
    if (/^[(@_]/u.test(segment)) {
      throw new Error(`${relative}: parallel routes, private folders and malformed route groups have no mapping here`);
    }
  }
  const leaf = basename === "page" || basename === "route"
    ? [basename]
    : [metadataRoutes.get(basename), "route"];
  return `/${[...segments, ...leaf].join("/")}`;
}

const sourceFiles = await filesBelow(appDirectory);
const routeFiles = sourceFiles.filter((file) => {
  if (!routeExtensions.test(file)) return false;
  const basename = file.split("/").pop().replace(routeExtensions, "");
  return basename === "page" || basename === "route" || metadataRoutes.has(basename);
});
const derivedPatterns = routeFiles.map(appPathFor).sort();

const appPaths = JSON.parse(await readFile(resolve(next, "server/app-paths-manifest.json"), "utf8"));
for (const pattern of derivedPatterns) {
  if (!(pattern in appPaths)) throw new Error(`${pattern}: source file exists but Next built no route for it`);
}

/* The other direction. Next synthesises `/_not-found` and `/_global-error`
   with no file behind them; anything else the build emits that the tree does
   not account for is output nothing owns. */
const unexplained = Object.keys(appPaths)
  .filter((pattern) => !pattern.startsWith("/_"))
  .filter((pattern) => !derivedPatterns.includes(pattern));
if (unexplained.length) throw new Error(`Next built routes with no source file: ${unexplained.join(", ")}`);

const serverFiles = await filesBelow(resolve(next, "server/app"));
const prebuiltPages = serverFiles.filter((path) => path.endsWith(".html"));
if (prebuiltPages.length >= 50) throw new Error(`Problems prebuilt ${prebuiltPages.length} pages; budget is fewer than 50`);

const publicAndClient = [
  ...await filesBelow(resolve(app, "public")),
  ...await filesBelow(resolve(next, "static")),
];
const forbidden = ["BEGIN PRIVATE KEY", ".vela/keys", "private_coordination", "CANOPUS_AUTH_TOKEN"];
for (const path of publicAndClient.filter((file) => /\.(?:html|js|json|txt|xml)$/u.test(file))) {
  const bytes = await readFile(path, "utf8");
  for (const value of forbidden) if (bytes.includes(value)) throw new Error(`${path}: contains forbidden custody material ${value}`);
  if (bytes.includes('"schema":"site.repository-bundle.v1"') || bytes.includes('"schema":"vela.projection-release.v1"')) throw new Error(`${path}: full repository projection entered browser delivery`);
}

const edge = JSON.parse(await readFile(resolve(app, "vercel.json"), "utf8"));
const rootRedirect = edge.redirects.find((entry) => entry.source === "/" && !entry.has);
if (rootRedirect) throw new Error("the Vela application Home route is shadowed by an unconditional root redirect");

/* Split a redirect source into segments without splitting inside a constrained
   parameter's regular expression. */
function sourceSegments(source) {
  const segments = [];
  let depth = 0;
  let current = "";
  for (const character of source) {
    if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    if (character === "/" && depth === 0) {
      if (current) segments.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  if (current) segments.push(current);
  return segments;
}

/* Reconstruct the regular expression a redirect source matches. */
function sourceRegExp(source) {
  const body = sourceSegments(source).map((segment) => {
    if (!segment.startsWith(":")) {
      return `/${segment.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`;
    }
    const constrained = /^:[A-Za-z0-9_]+\((.*)\)$/su.exec(segment);
    if (constrained) return `/(?:${constrained[1]})`;
    if (segment.endsWith("*")) return "(?:/[^?]*)?";
    if (segment.endsWith("?")) return "(?:/[^/]+)?";
    return "/[^/]+";
  }).join("");
  return new RegExp(`^${body || "/"}/?$`, "u");
}

/*
  Does this redirect swallow every URL the route serves?

  Not "does it match one of them" — a shadow is total. `/repositories/:slug/work`
  covers every slug, so it shadows a `work/page.tsx` completely. A redirect
  segment covers a route segment when it is an unconstrained `:param`, which
  takes any one segment, or when both are the same literal. It does not cover a
  `[...rest]` catch-all, which stands for one segment or twenty.

  A constrained parameter cannot be decided one segment at a time, so the route
  is instantiated into a concrete URL and the reconstructed pattern is run.
*/
function shadows(source, route) {
  const wanted = route.split("/").filter(Boolean);
  /* A `[...rest]` stands for one segment or twenty, so no fixed-arity redirect
     covers all of it, and a probe URL could not represent it honestly. */
  if (wanted.some((segment) => segment.startsWith("[..."))) return false;
  const probe = `/${wanted
    .map((segment) => (segment.startsWith("[") ? "shadow-probe" : segment))
    .join("/")}`;
  return sourceRegExp(source).test(probe);
}

/* Every current page must be reachable. Historical redirects may preserve old
   URLs, but no current route is allowed to exist only in `next dev`. */
const allowed = new Map();
const unconditional = edge.redirects.filter((entry) => !entry.has);
const shadowed = [];
for (const pattern of derivedPatterns) {
  const url = `/${pattern.split("/").slice(1, -1).join("/")}`;
  const redirect = unconditional.find((entry) => shadows(entry.source, url));
  if (!redirect) continue;
  if (allowed.get(pattern) === redirect.source) continue;
  shadowed.push(`${pattern} is unreachable: ${redirect.source} redirects to ${redirect.destination}`);
}
if (shadowed.length) throw new Error(shadowed.join("; "));

console.log(JSON.stringify({
  ok: true,
  schema: "vela.projection-route-contract.v3",
  route_patterns: derivedPatterns.length,
  shadowed_routes: allowed.size,
  prebuilt_pages: prebuiltPages.length,
}));
