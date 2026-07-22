import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const app = join(root, "apps/observatory");
const source = join(app, "src");
const failures = [];

const registry = spawnSync("bunx", ["shadcn@4.13.1", "diff"], { cwd: app, encoding: "utf8" });
const registryOutput = `${registry.stdout ?? ""}\n${registry.stderr ?? ""}`.trim();
if (registry.status !== 0 || !registryOutput.includes("No updates found.")) {
  failures.push(`official shadcn registry drift:\n${registryOutput}`);
}

const cssPath = join(source, "app/globals.css");
const css = readFileSync(cssPath, "utf8");
const cssLines = css.split(/\r?\n/u).length;
if (cssLines > 180) failures.push(`globals.css is ${cssLines} lines; limit is 180`);
if (!css.includes("--radius:")) failures.push("globals.css is missing the shadcn base radius token");
if (!css.includes(".dark {")) failures.push("globals.css is missing the shadcn dark-theme selector");

const components = JSON.parse(readFileSync(join(app, "components.json"), "utf8"));
if (components.iconLibrary !== "hugeicons") failures.push(`components.json must use the shadcn Hugeicons registry adapter, found ${components.iconLibrary}`);
const packageManifest = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
if (packageManifest.dependencies?.["lucide-react"]) failures.push("lucide-react remains installed beside the selected Hugeicons registry family");

const forbiddenFiles = [
  "components/vela/command-step.tsx",
  "components/vela/frontier-nav.tsx",
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
  if (file.includes("/components/ui/")) continue;
  const text = readFileSync(file, "utf8");
  const label = relative(root, file);
  if (/<select\b/u.test(text)) failures.push(`${label}: raw select bypasses the installed shadcn Select`);
  if (/from ["']lucide-react["']/u.test(text)) failures.push(`${label}: imports the retired Lucide icon family`);
  if (/\b(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|green|blue|amber|yellow|white|black)(?:-|\/|\b)/u.test(text)) failures.push(`${label}: uses a raw palette color outside the theme contract`);
  if (/window\.location\.(?:href\s*=|replace\()/u.test(text)) failures.push(`${label}: performs internal navigation outside Next router semantics`);
  if (/components\/vela\/(?:command-step|frontier-nav|global-review-ledger|object-header|provenance-trail|review-ledger|root-disclosure|status-distribution|summary-card|work-ledger)/u.test(text)) failures.push(`${label}: imports a retired presentation component`);
}

if (failures.length) {
  console.error(["Observatory design-system check failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exit(1);
}

console.log(`Observatory design system verified: registry clean; Hugeicons only; globals.css ${cssLines}/180 lines; no retired presentation layer.`);
