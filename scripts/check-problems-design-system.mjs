#!/usr/bin/env bun

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const app = join(root, "apps/problems");
const source = join(app, "src");
const failures = [];

const manifest = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
for (const dependency of ["@vela/brand", "@vela/ui"]) {
  if (manifest.dependencies?.[dependency] !== "workspace:*") {
    failures.push(`Problems must consume the canonical ${dependency} workspace`);
  }
}
if (manifest.dependencies?.["lucide-react"]) {
  failures.push("lucide-react remains installed beside the selected Hugeicons family");
}
if (existsSync(join(source, "components/ui"))) {
  failures.push("Problems must not create an app-local primitive layer");
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(?:css|ts|tsx)$/u.test(entry.name)
        ? [path]
        : [];
  });
}

for (const path of sourceFiles(source)) {
  const text = readFileSync(path, "utf8");
  const label = relative(root, path);
  if (/\b(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|green|blue|amber|yellow|white|black)(?:-|\/|\b)/u.test(text)) {
    failures.push(`${label}: uses a raw palette color outside the shared theme`);
  }
  if (/components\/ui\//u.test(label)) {
    failures.push(`${label}: duplicates a shared @vela/ui primitive`);
  }
}

const globals = readFileSync(join(source, "app/globals.css"), "utf8");
if (!globals.includes("@vela/ui/product.css")) {
  failures.push("Problems globals must consume the shared product theme");
}

if (failures.length) {
  console.error(["Problems design-system check failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exit(1);
}

console.log("Problems design system verified: shared product theme and primitives; Hugeicons only; no app-local primitive or palette layer.");
