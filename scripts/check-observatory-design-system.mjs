import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const app = join(root, "apps/observatory");
const source = join(app, "src");
const ui = join(root, "packages/ui");
const failures = [];

const registry = spawnSync("bunx", ["shadcn@4.13.1", "diff"], { cwd: ui, encoding: "utf8" });
const registryOutput = `${registry.stdout ?? ""}\n${registry.stderr ?? ""}`.trim();
if (registry.status !== 0 || !registryOutput.includes("No updates found.")) {
  failures.push(`official shadcn registry drift:\n${registryOutput}`);
}

const cssPath = join(source, "app/globals.css");
const css = readFileSync(cssPath, "utf8");
const cssLines = css.split(/\r?\n/u).length;
const themePath = join(ui, "src/styles/product.css");
const theme = readFileSync(themePath, "utf8");
const themeLines = theme.split(/\r?\n/u).length;
const authoredCssLines = cssLines + themeLines;
if (authoredCssLines > 180) failures.push(`Observatory global and theme CSS total ${authoredCssLines} lines; limit is 180`);
if (!theme.includes("--radius:")) failures.push("@vela/ui product.css is missing the shadcn base radius token");
if (!theme.includes(".dark {")) failures.push("@vela/ui product.css is missing the shadcn dark-theme selector");
if (!theme.includes('@source "../components";')) {
  failures.push("@vela/ui product.css must declare its workspace component source for Tailwind v4");
}

const components = JSON.parse(readFileSync(join(app, "components.json"), "utf8"));
if (components.$schema !== "https://ui.shadcn.com/schema.json") {
  failures.push("components.json must use the official shadcn project schema");
}
if (components.style !== "base-nova") {
  failures.push(`components.json must use base-nova, found ${components.style}`);
}
if (components.rsc !== true || components.tsx !== true) {
  failures.push("components.json must generate TypeScript React Server Components");
}
if (
  components.tailwind?.config !== ""
  || components.tailwind?.css !== "../../packages/ui/src/styles/product.css"
  || components.tailwind?.baseColor !== "neutral"
  || components.tailwind?.cssVariables !== true
) {
  failures.push("components.json must retain the official Tailwind v4 neutral variable contract");
}
if (components.iconLibrary !== "hugeicons") failures.push(`components.json must use the shadcn Hugeicons registry adapter, found ${components.iconLibrary}`);
for (const [alias, expected] of Object.entries({
  components: "@/components",
  utils: "@vela/ui/lib/utils",
  ui: "@vela/ui/components",
  lib: "@/lib",
  hooks: "@/hooks",
})) {
  if (components.aliases?.[alias] !== expected) {
    failures.push(`components.json alias ${alias} must be ${expected}`);
  }
}
const packageManifest = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
if (packageManifest.dependencies?.["lucide-react"]) failures.push("lucide-react remains installed beside the selected Hugeicons registry family");
if (packageManifest.dependencies?.["@vela/ui"] !== "workspace:*") failures.push("Observatory must consume the canonical @vela/ui workspace");
const itemSource = readFileSync(join(ui, "src/components/ui/item.tsx"), "utf8");
if (!/data-slot="item-content"[\s\S]{0,220}"flex min-w-0 flex-1/u.test(itemSource)) {
  failures.push("shadcn ItemContent must retain min-w-0 so long scientific identifiers cannot clip mobile records");
}

const forbiddenFiles = [
  "components/vela/command-step.tsx",
  "components/vela/repository-nav.tsx",
  "components/vela/global-review-ledger.tsx",
  "components/vela/object-header.tsx",
  "components/vela/provenance-trail.tsx",
  "components/vela/review-ledger.tsx",
  "components/vela/root-disclosure.tsx",
  "components/vela/status-distribution.tsx",
  "components/vela/summary-card.tsx",
  "components/vela/work-ledger.tsx",
  "components/ui/breadcrumb.tsx",
  "components/ui/card.tsx",
  "components/ui/combobox.tsx",
  "components/ui/progress.tsx",
];
for (const file of forbiddenFiles) if (existsSync(join(source, file))) failures.push(`forbidden legacy presentation component exists: ${file}`);
if (existsSync(join(source, "components/ui"))) failures.push("Observatory retains an app-local shadcn primitive directory");
for (const file of ["status-badge.tsx", "exact-value.tsx", "copy-button.tsx", "scientific-text.tsx"]) {
  if (existsSync(join(source, "components/vela", file))) failures.push(`Observatory duplicates shared Vela UI: ${file}`);
}

const forbiddenSelectors = [
  /\.summary-card\b/u,
  /\.object-header\b/u,
  /\.provenance-trail\b/u,
  /\.review-dashboard\b/u,
  /\.workbench-grid\b/u,
  /\.entity-table\b/u,
  /\.command-step\b/u,
  /\.data-id\b/u,
  /\.root-value\b/u,
  /\.page-frame\b/u,
  /\.scientific-text\b/u,
  /\.math-(?:inline|display)\b/u,
];
for (const selector of forbiddenSelectors) if (selector.test(css)) failures.push(`forbidden route presentation selector remains: ${selector}`);

function filesAt(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesAt(path) : /\.(?:ts|tsx)$/u.test(entry.name) ? [path] : [];
  });
}

for (const file of filesAt(source)) {
  const text = readFileSync(file, "utf8");
  const label = relative(root, file);
  /* The retired icon family and the retired presentation components used to be
     matched here too, by `from "lucide-react"` and a path substring. Both are
     now `no-restricted-imports` entries in eslint.bans.mjs. The regex missed a
     multi-line import — the exact shape `bunx shadcn add` writes — and neither
     saw `await import(...)`; ESLint reads the tree and sees both. What stays
     below is the text this file is really about: markup, palette literals and
     navigation, none of which is a module. */
  if (/<select\b/u.test(text)) failures.push(`${label}: raw select bypasses the installed shadcn Select`);
  if (/\b(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|green|blue|amber|yellow|white|black)(?:-|\/|\b)/u.test(text)) failures.push(`${label}: uses a raw palette color outside the theme contract`);
  if (/window\.location\.(?:href\s*=|replace\()/u.test(text)) failures.push(`${label}: performs internal navigation outside Next router semantics`);
}

if (failures.length) {
  console.error(["Observatory design-system check failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exit(1);
}

console.log(`Observatory design system verified: shared @vela/ui source catalog clean; Hugeicons only; authored CSS ${authoredCssLines}/180 lines; no app-local primitive layer.`);
