import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url);
const dist = new URL("dist/", root);

const allowedRoutes = new Set([
  "/",
  "/404",
  "/case",
  "/catalog",
  "/constellations",
  "/discovery-engine",
  "/facility",
  "/gigafactories",
  "/gigafactories-for-science",
  "/stack",
  "/terafactories",
  "/vela",
  "/whitepaper",
]);
const requiredRoutes = new Set(allowedRoutes);
const requiredRedirects = new Map([
  ["/", "/constellations"],
]);
const forbiddenReferences = [
  "https://constellate.science",
  "https://www.constellate.science",
  "https://github.com/constellate-science",
  "https://vela-site.fly.dev",
  "https://app.constellate.science",
  "https://hub.constellate.science",
];

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

function routeFor(file) {
  const path = relative(dist.pathname, file).split(sep).join("/");
  if (path === "index.html") return "/";
  if (path === "404.html") return "/404";
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"/index.html".length)}`;
  return `/${path.slice(0, -".html".length)}`;
}

const files = await htmlFiles(dist.pathname);
const routes = new Set(files.map(routeFor));
const unexpected = [...routes].filter((route) => !allowedRoutes.has(route)).sort();
const missing = [...requiredRoutes].filter((route) => !routes.has(route)).sort();
const invalidRedirects = [];
const leaked = [];

for (const file of files) {
  const html = await readFile(file, "utf8");
  const route = routeFor(file);

  if (requiredRedirects.has(route)) {
    const destination = requiredRedirects.get(route);
    const refreshPattern = new RegExp(
      `<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=${destination.replaceAll("/", "\\/")}`,
      "i",
    );
    if (!refreshPattern.test(html)) {
      invalidRedirects.push(`${route} does not redirect to ${destination}`);
    }
  }

  for (const reference of forbiddenReferences) {
    if (html.includes(reference)) {
      leaked.push(`${routeFor(file)} contains ${JSON.stringify(reference)}`);
    }
  }
}

if (unexpected.length || missing.length || invalidRedirects.length || leaked.length) {
  if (unexpected.length) console.error(`Unexpected HTML routes: ${unexpected.join(", ")}`);
  if (missing.length) console.error(`Missing HTML routes: ${missing.join(", ")}`);
  if (invalidRedirects.length) console.error(`Invalid redirects:\n${invalidRedirects.join("\n")}`);
  if (leaked.length) console.error(`Unpublished route exposure:\n${leaked.join("\n")}`);
  process.exit(1);
}

console.log(`Public route allowlist passed: ${[...routes].sort().join(", ")}`);
