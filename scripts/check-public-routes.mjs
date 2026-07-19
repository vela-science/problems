import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url);
const dist = new URL("dist/", root);
const required = new Set(["/", "/404", "/case", "/constellations", "/discovery-engine", "/docs", "/docs/install", "/docs/produce", "/docs/quickstart", "/docs/review", "/essays", "/facility", "/frontiers", "/gigafactories-for-science", "/search", "/stack", "/whitepaper"]);
const redirects = new Map([["/catalog", "/essays"], ["/vela", "/"], ["/gigafactories", "/gigafactories-for-science"], ["/terafactories", "/gigafactories-for-science"]]);
const allowedDynamic = [/^\/frontiers\/[a-z0-9-]+$/u, /^\/frontiers\/[a-z0-9-]+\/(work|review|reproduce)$/u, /^\/frontiers\/[a-z0-9-]+\/findings\/[A-Za-z0-9_.:-]+$/u, /^\/frontiers\/erdos\/problems\/\d+$/u];
const forbiddenReferences = ["https://app.vela.space", "https://constellate.science", "https://www.constellate.science", "https://app.constellate.science", "https://hub.constellate.science", "0.800.9"];

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
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
const missing = [...required].filter((route) => !routes.has(route));
const unexpected = [...routes].filter((route) => !required.has(route) && !redirects.has(route) && !allowedDynamic.some((pattern) => pattern.test(route)));
const failures = [];

for (const file of files) {
  const html = await readFile(file, "utf8");
  const route = routeFor(file);
  if (redirects.has(route) && !html.includes(`url=${redirects.get(route)}`)) failures.push(`${route}: wrong redirect`);
  for (const reference of forbiddenReferences) if (html.includes(reference)) failures.push(`${route}: contains ${reference}`);
  if (!redirects.has(route) && !html.includes("https://www.vela.space")) failures.push(`${route}: missing canonical host`);
}

if (missing.length || unexpected.length || failures.length) {
  if (missing.length) console.error(`Missing routes: ${missing.join(", ")}`);
  if (unexpected.length) console.error(`Unexpected routes: ${unexpected.join(", ")}`);
  if (failures.length) console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, schema: "vela.web-route-contract.v1", html_routes: routes.size }));
