import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const ui = join(root, "packages/ui");
const failures = [];
const workspaces = [
  {
    name: "@vela/ui",
    directory: ui,
    css: "src/styles/product.css",
    aliases: { components: "#components", utils: "#lib/utils", ui: "#ui", lib: "#lib", hooks: "#hooks" },
  },
  {
    name: "Problems",
    directory: join(root, "apps/problems"),
    css: "../../packages/ui/src/styles/product.css",
    aliases: { components: "@/components", utils: "@vela/ui/lib/utils", ui: "@vela/ui/components", lib: "@/lib", hooks: "@/hooks" },
  },
];

function filesAt(directory, extensions = /\.(?:ts|tsx)$/u) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesAt(path, extensions) : extensions.test(entry.name) ? [path] : [];
  });
}

for (const workspace of workspaces) {
  const componentsPath = join(workspace.directory, "components.json");
  const components = JSON.parse(readFileSync(componentsPath, "utf8"));
  if (components.$schema !== "https://ui.shadcn.com/schema.json") failures.push(`${workspace.name}: official components schema is required`);
  if (components.style !== "base-nova" || components.iconLibrary !== "hugeicons") failures.push(`${workspace.name}: base-nova + Hugeicons is required`);
  if (components.rsc !== true || components.tsx !== true) failures.push(`${workspace.name}: RSC TypeScript generation is required`);
  if (components.tailwind?.config !== "" || components.tailwind?.css !== workspace.css || components.tailwind?.baseColor !== "neutral" || components.tailwind?.cssVariables !== true) {
    failures.push(`${workspace.name}: Tailwind v4 neutral shared-profile config drift`);
  }
  for (const [alias, expected] of Object.entries(workspace.aliases)) {
    if (components.aliases?.[alias] !== expected) failures.push(`${workspace.name}: alias ${alias} must be ${expected}`);
  }

  const binary = join(workspace.directory, "node_modules/.bin/shadcn");
  const version = spawnSync(binary, ["--version"], { cwd: workspace.directory, encoding: "utf8" });
  if (version.status !== 0 || version.stdout.trim() !== "4.16.1") failures.push(`${workspace.name}: local shadcn must resolve exact 4.16.1`);
  const info = spawnSync(binary, ["info", "--json"], { cwd: workspace.directory, encoding: "utf8" });
  try {
    const parsed = JSON.parse(info.stdout);
    if (info.status !== 0 || parsed.config?.style !== "base-nova" || parsed.config?.base !== "base" || parsed.config?.iconLibrary !== "hugeicons" || parsed.project?.tailwindVersion !== "v4") {
      failures.push(`${workspace.name}: shadcn info does not resolve Base UI/base-nova/Hugeicons/Tailwind v4`);
    }
  } catch {
    failures.push(`${workspace.name}: shadcn info --json did not produce valid JSON`);
  }
}

const productCss = readFileSync(join(ui, "src/styles/product.css"), "utf8");
const themeCss = readFileSync(join(ui, "src/styles/theme.css"), "utf8");
const pageShellCss = readFileSync(join(ui, "src/components/vela/page-shell.module.css"), "utf8");
if (!pageShellCss.includes('.page[data-layout="canvas"]') || !pageShellCss.includes("max-width: none")) failures.push("PageShell layouts must use the full shared content rail");
if (!pageShellCss.includes("padding: var(--vela-page-block) var(--vela-page-gutter)")) failures.push("PageShell must retain the shared responsive page gutter");
if (productCss.split("\n").length + themeCss.split("\n").length > 180) failures.push("authored product and theme CSS exceed the 180-line aggregate cap");
const typesetCss = readFileSync(join(ui, "src/styles/typeset.css"), "utf8");
if (!productCss.includes('@source "../components"')) failures.push("@vela/ui product profile must own Tailwind workspace source detection");
if (!productCss.includes('@import "./foundation.css"')) failures.push("@vela/ui product profile must import the shared interaction foundation");
for (const preset of [".typeset-reading", ".typeset-docs", ".typeset-compact", ".not-typeset", ".typeset-scroll"]) {
  if (!typesetCss.includes(preset)) failures.push(`Typeset contract missing ${preset}`);
}

const problems = join(root, "apps/problems");
for (const app of [problems]) {
  if (existsSync(join(app, "src/components/ui"))) failures.push(`${relative(root, app)} retains an app-local primitive layer`);
  const manifest = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
  if (manifest.dependencies?.["@vela/ui"] !== "workspace:*") failures.push(`${manifest.name}: canonical @vela/ui workspace is required`);
  if (manifest.dependencies?.["lucide-react"] || manifest.dependencies?.["framer-motion"]) failures.push(`${manifest.name}: parallel icon or motion dependency installed`);
}

const problemsRoutes = filesAt(join(problems, "src/app"));
const sharedProblemPage = readFileSync(join(problems, "src/components/vela/problem-page.tsx"), "utf8");
if (!sharedProblemPage.includes('@vela/ui/vela/page-shell') || !sharedProblemPage.includes("<PageShell")) {
  failures.push("shared Problem page must compose the canonical PageShell");
}
const rawRouteFrame = /className=["'][^"']*\bmx-auto\b[^"']*\bmax-w-(?:\[[^\]]+\]|\S+)[^"']*\bpx-(?:\d|\[)/u;
const competingOuterFrame = /className=["'][^"']*\bw-full\b[^"']*\bmax-w-(?:\[[^\]]+\]|\S+)[^"']*\b(?:p|px)-\d[^"']*["']/u;
for (const file of problemsRoutes) {
  const source = readFileSync(file, "utf8");
  const label = relative(root, file);
  if (rawRouteFrame.test(source)) failures.push(`${label}: raw route frame bypasses @vela/ui PageShell`);
  if (competingOuterFrame.test(source)) failures.push(`${label}: competing max-width/padding frame bypasses @vela/ui PageShell`);
  if (/className=["']vela-page["']/u.test(source)) failures.push(`${label}: literal vela-page bypasses the PageShell component contract`);
  if (/className=["'][^"']*\bvela-page-(?:hero|section|section-head)\b/u.test(source)) failures.push(`${label}: literal PageShell hook bypasses the canonical component contract`);
  const canonicalProblemPageDelegate = source.includes('@/components/vela/problem-page') && source.includes("<ProblemPageView");
  /* A page that only forwards renders nothing, so it has no frame to compose.
     The retired `/p/{repository}/{problem}` path is the one of these: it
     redirects permanently to the canonical address and returns no markup at
     all. Requiring a PageShell there would mean giving a redirect a body. */
  const redirectOnlyPage = source.includes("permanentRedirect(") && !source.includes("return <");
  if (/\/page\.tsx$/u.test(file) && !canonicalProblemPageDelegate && !redirectOnlyPage && (!source.includes('@vela/ui/vela/page-shell') || !source.includes("<PageShell"))) {
    failures.push(`${label}: every app page must compose the canonical PageShell`);
  }
}
for (const app of [problems]) {
  for (const file of filesAt(join(app, "src"), /\.(?:ts|tsx|js|mjs)$/u)) {
    const source = readFileSync(file, "utf8");
    if (/packages\/ui\/(?:lab|registry)|@vela\/ui\/(?:lab|registry)|vela\.ui-component-lab/u.test(source)) {
      failures.push(`${relative(root, file)}: private component catalog must not enter application source`);
    }
  }
}
for (const file of [
  join(problems, "src/app/error.tsx"),
  join(problems, "src/app/not-found.tsx"),
  join(problems, "src/app/graph/loading.tsx"),
  join(problems, "src/app/search/loading.tsx"),
  join(problems, "src/app/repositories/[slug]/not-found.tsx"),
]) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("<PageShell")) failures.push(`${relative(root, file)}: fallback must compose the canonical PageShell`);
}
for (const file of [
  join(problems, "src/app/page.tsx"),
  join(problems, "src/app/problems/page.tsx"),
  join(problems, "src/app/contribute/page.tsx"),
  join(problems, "src/app/activity/page.tsx"),
  join(problems, "src/app/p/[repository]/[problem]/page.tsx"),
  join(problems, "src/components/vela/problem-state.tsx"),
]) {
  const source = readFileSync(file, "utf8");
  if (/\b(?:border-y|border-t)\b[^"'\n]{0,80}\bdivide-y\b|\bdivide-y\b[^"'\n]{0,80}\b(?:border-y|border-t)\b/u.test(source)) failures.push(`${relative(root, file)}: stacked outer border/divide-y bypasses the separator budget`);
}
for (const file of [
  join(problems, "src/components/vela/decision-boundary.tsx"),
  join(problems, "src/components/vela/proposal-ledger-rows.tsx"),
  join(problems, "src/components/vela/stat-row.tsx"),
  join(problems, "src/components/vela/hub-membership-map.tsx"),
  join(problems, "src/components/vela/workbench.tsx"),
  join(problems, "src/components/vela/source-registry/shared.tsx"),
  join(problems, "src/components/vela/source-registry/registry-view.tsx"),
  join(problems, "src/components/vela/source-registry/record-view.tsx"),
]) {
  const source = readFileSync(file, "utf8");
  if (/\b(?:border-y|divide-y|border-t)\b/u.test(source)) failures.push(`${relative(root, file)}: list-strip separators bypass the authored surface/spacing contract`);
}
const workbenchSource = readFileSync(join(problems, "src/components/vela/workbench.tsx"), "utf8");
if (/\b(?:border-y|divide-y|border-t|border-b|border-l|border-dashed)\b/u.test(workbenchSource)) failures.push("Work mode restores a wireframe separator or perimeter ladder");

if (existsSync(join(problems, "src/components/vela/vela-mark.tsx"))) failures.push("an app-local Vela mark remains beside @vela/ui");

const itemSource = readFileSync(join(ui, "src/components/ui/item.tsx"), "utf8");
if (!/data-slot="item-content"[\s\S]{0,220}"flex min-w-0 flex-1/u.test(itemSource)) failures.push("shadcn ItemContent must retain min-w-0 for scientific identifiers");

const forbiddenProblemsFiles = [
  "components/vela/command-step.tsx", "components/vela/repository-nav.tsx", "components/vela/global-review-ledger.tsx",
  "components/vela/object-header.tsx", "components/vela/provenance-trail.tsx", "components/vela/review-ledger.tsx",
  "components/vela/root-disclosure.tsx", "components/vela/status-distribution.tsx", "components/vela/summary-card.tsx",
  "components/vela/work-ledger.tsx", "components/ui/card.tsx", "components/ui/combobox.tsx",
  /* Removed with zero importers. `approach-lineage.tsx` drew a fork rhythm no
     surface asked for and `repository-about.tsx` a GitHub-style About rail;
     both would come back as plausible-looking dead code. */
  "components/vela/approach-lineage.tsx", "components/vela/repository-about.tsx",
];
for (const file of forbiddenProblemsFiles) if (existsSync(join(problems, "src", file))) failures.push(`forbidden legacy presentation component exists: ${file}`);
for (const file of ["status-badge.tsx", "exact-value.tsx", "copy-button.tsx", "scientific-text.tsx"]) {
  if (existsSync(join(problems, "src/components/vela", file))) failures.push(`Problems duplicates shared Vela UI: ${file}`);
}

const EXTERNAL_NAVIGATION = 'if (/^https?:/u.test(href)) window.location.assign(href);';

for (const app of [problems]) {
  for (const file of filesAt(join(app, "src"))) {
    const source = readFileSync(file, "utf8");
    const label = relative(root, file);
    if (/<select\b/u.test(source)) failures.push(`${label}: raw select bypasses @vela/ui`);
    if (/\b(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|green|blue|amber|yellow|emerald|white|black)(?:-|\/|\b)/u.test(source)) failures.push(`${label}: raw palette bypasses semantic tokens`);
    if (/from ["'](?:lucide-react|framer-motion|@radix-ui\/)/u.test(source)) failures.push(`${label}: parallel primitive/icon/motion layer`);
    /* `assign(` was missing, so the one internal call site that used it passed
       a rule written to forbid exactly what it did. All three discard the
       application shell, which the product contract requires navigation to
       preserve. Leaving an absolute source URL is the one legitimate use, and
       it is pinned by its exact guard rather than by filename, so a second
       assignment in the same file still fails. */
    const internalNavigation = source.replaceAll(EXTERNAL_NAVIGATION, "");
    if (/window\.location\.(?:href\s*=|replace\(|assign\()/u.test(internalNavigation)) failures.push(`${label}: internal navigation bypasses Next router semantics`);
  }
}

if (failures.length) {
  console.error(["Vela design-system check failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exit(1);
}

console.log("Vela design system verified: shared UI and Problems use Base UI/Hugeicons on local shadcn 4.16.1; shared Typeset/focus/motion; no parallel app primitive.");
