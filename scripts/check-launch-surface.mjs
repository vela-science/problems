import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const expectedPages = [
  "src/pages/discovery-engine.astro",
  "src/pages/index.astro",
  "src/pages/terafactories.astro",
];

const expectedEssays = [
  "src/content/essays/constellations/index.mdx",
  "src/content/essays/discovery-engine/index.mdx",
  "src/content/essays/terafactories/index.mdx",
];

const expectedSitemap = [
  "https://constellate.science/",
  "https://constellate.science/discovery-engine",
  "https://constellate.science/terafactories",
];

const expectedDistPages = [
  "dist/discovery-engine/index.html",
  "dist/index.html",
  "dist/terafactories/index.html",
];

const bannedRouteStrings = [
  "/coal" + "ition",
  "/prim" + "itives",
  "/ter" + "rafactories",
  "/giga" + "factories-for-science",
  "src/pages/coal" + "ition.astro",
  "src/pages/prim" + "itives.astro",
  "src/content/essays/giga" + "factories-for-science",
];

const scanRoots = ["README.md", "astro.config.mjs", "public", "src", "docs"];
const ignoredDirs = new Set([".git", "node_modules", "dist", ".astro"]);
const textExtensions = new Set([
  ".astro",
  ".css",
  ".js",
  ".json",
  ".md",
  ".mdx",
  ".mjs",
  ".ts",
  ".txt",
  ".xml",
  ".yml",
]);

const failures = [];

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

function assertExact(label, actual, expected) {
  const a = [...actual].sort();
  const e = [...expected].sort();
  if (JSON.stringify(a) !== JSON.stringify(e)) {
    failures.push(`${label} mismatch\nactual: ${JSON.stringify(a)}\nexpected: ${JSON.stringify(e)}`);
  }
}

const pageFiles = listFiles(path.join(root, "src/pages"))
  .filter((file) => file.endsWith(".astro"))
  .map(relative);
assertExact("public page files", pageFiles, expectedPages);

const essayFiles = listFiles(path.join(root, "src/content/essays"))
  .filter((file) => file.endsWith("index.mdx"))
  .map(relative);
assertExact("essay source files", essayFiles, expectedEssays);

const sitemapXml = readFileSync(path.join(root, "public/sitemap.xml"), "utf8");
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assertExact("sitemap URLs", urls, expectedSitemap);

if (existsSync(path.join(root, "dist"))) {
  const distPages = listFiles(path.join(root, "dist"))
    .filter((file) => file.endsWith("index.html"))
    .map(relative);
  assertExact("built dist pages", distPages, expectedDistPages);
}

for (const scanRoot of scanRoots) {
  const fullRoot = path.join(root, scanRoot);
  const files = statSync(fullRoot).isDirectory() ? listFiles(fullRoot) : [fullRoot];
  for (const file of files) {
    if (!textExtensions.has(path.extname(file))) continue;
    const rel = relative(file);
    if (rel === "scripts/check-launch-surface.mjs") continue;
    const text = readFileSync(file, "utf8");
    for (const banned of bannedRouteStrings) {
      if (text.includes(banned)) {
        failures.push(`legacy route/source reference found: ${banned} in ${rel}`);
      }
    }
  }
}

if (failures.length) {
  console.error("Launch surface check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Launch surface check passed: three public pages, three essay sources, three sitemap URLs.");
