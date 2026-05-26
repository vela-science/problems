#!/usr/bin/env node
// =============================================================
// scripts/build-whitepaper-pdf.mjs
//
// Build the Constellate whitepaper PDF from the MDX source.
//
// Pipeline:
//   1. Read src/content/whitepaper/index.mdx (single source of truth)
//   2. Strip MDX frontmatter
//   3. Extract <figure data-typst-figure="..."> blocks and replace
//      with sentinel markers; remember which SVG each one points at
//   4. Run pandoc to convert markdown → Typst
//   5. Clean pandoc artifacts (anchor labels, horizontal rules)
//   6. Replace sentinel markers with Typst #figure(image(...), ...)
//      blocks that reference the SVG files in public/whitepaper-diagrams/
//   7. Extract the abstract section
//   8. Split body at the appendix boundary
//   9. Strip manual section numbering and promote heading levels
//   10. Compile constellate.typ → public/whitepaper/constellate-v0.1.pdf
// =============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const MDX_PATH      = join(root, "src/content/whitepaper/index.mdx");
const TYPST_DIR     = join(root, "whitepaper/typst");
const DIAGRAMS_DIR  = join(root, "public/whitepaper-diagrams");
const ABSTRACT_PATH = join(TYPST_DIR, "body-abstract.typ");
const MAIN_PATH     = join(TYPST_DIR, "body-main.typ");
const APPENDIX_PATH = join(TYPST_DIR, "body-appendices.typ");
const ENTRY_PATH    = join(TYPST_DIR, "constellate.typ");
const PDF_OUT       = join(root, "public/whitepaper/constellate-v0.1.pdf");
const TMP_MD        = join(TYPST_DIR, ".body.md");
const TMP_TYP       = join(TYPST_DIR, ".body.typ");

// ── 1. Read MDX ───────────────────────────────────────────────
console.log("→ Reading MDX source");
let body = readFileSync(MDX_PATH, "utf8");

// ── 2. Strip frontmatter ──────────────────────────────────────
body = body.replace(/^---[\s\S]*?\n---\n/, "");

// ── 3. Extract figure blocks and replace with sentinels ──────
// Each <figure data-typst-figure="name" data-typst-width="W"> ... </figure>
// becomes [[FIGURE:name:width:caption]] which we restore after pandoc.
console.log("→ Extracting figure markers");
const figures = [];
body = body.replace(
  /<figure\s+class="wp-figure"\s+data-typst-figure="([^"]+)"(?:\s+data-typst-width="([^"]+)")?[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>\s*<\/figure>/g,
  (_match, name, width, caption) => {
    figures.push({ name, width: width || "100%", caption: caption.trim() });
    return `\n\nFIGURE_SENTINEL_${figures.length - 1}\n\n`;
  },
);

writeFileSync(TMP_MD, body, "utf8");

// ── 4. Pandoc: markdown → Typst ──────────────────────────────
console.log("→ Converting markdown → Typst");
execFileSync("pandoc", ["-f", "gfm", "-t", "typst", TMP_MD, "-o", TMP_TYP], {
  stdio: "inherit",
});

let typ = readFileSync(TMP_TYP, "utf8");

// ── 5. Clean pandoc artifacts ─────────────────────────────────
console.log("→ Cleaning pandoc artifacts");
typ = typ.replace(/^<[a-z0-9-]+>\n/gm, "");
typ = typ.replace(
  /^#horizontalrule\s*$/gm,
  '#v(0.6em) #align(center)[#line(length: 25%, stroke: 0.4pt + black)] #v(0.6em)',
);

// ── 6. Restore figures as Typst #figure(image(...), ...) ─────
console.log("→ Re-inserting figures as Typst images");
// Pandoc escapes underscores in bare identifiers; match either form.
typ = typ.replace(/FIGURE\\?_SENTINEL\\?_(\d+)/g, (_match, idx) => {
  const f = figures[parseInt(idx, 10)];
  const svgPath = `../../public/whitepaper-diagrams/${f.name}.svg`;
  // Strip pandoc's inline markup from caption to plain text for the Typst caption
  const captionPlain = f.caption
    .replace(/<\/?strong>/g, "*")
    .replace(/<\/?em>/g, "_")
    .replace(/<[^>]+>/g, "")
    .replace(/^Figure\s+\d+\.\s*/, "") // Arkheion auto-numbers
    .trim();
  return [
    "",
    "#figure(",
    `  image("${svgPath}", width: ${f.width.replace("%", "%")}),`,
    `  caption: [${captionPlain}],`,
    ")",
    "",
  ].join("\n");
});

// ── 7. Extract Abstract section ───────────────────────────────
console.log("→ Extracting abstract");
const abstractMatch = typ.match(/^==\s*Abstract\s*\n([\s\S]*?)(?=^==\s)/m);
let abstractContent = "";
if (abstractMatch) {
  abstractContent = abstractMatch[1].trim();
  typ = typ.replace(/^==\s*Abstract\s*\n[\s\S]*?(?=^==\s)/m, "");
}

// ── 8. Split at appendix boundary ─────────────────────────────
console.log("→ Splitting main body / appendices");
const appendixSplit = typ.split(/^==\s*Appendix A:\s*/m);
let mainBody = appendixSplit[0];
let appendixBody = "";
if (appendixSplit.length > 1) {
  appendixBody = "== Appendix A: " + appendixSplit.slice(1).join("== Appendix A: ");
}

// ── 9. Strip manual numbering and promote heading levels ─────
console.log("→ Normalizing headings");

mainBody = mainBody.replace(/^==\s+\d+\.\s+(.+)$/gm, "= $1");
mainBody = mainBody.replace(/^===\s+\d+\.\d+\s+(.+)$/gm, "== $1");
appendixBody = appendixBody.replace(/^==\s+Appendix\s+[A-Z]:\s+(.+)$/gm, "= $1");

// ── 10. Write output files ────────────────────────────────────
console.log("→ Writing Typst sources");
writeFileSync(ABSTRACT_PATH, abstractContent, "utf8");
writeFileSync(MAIN_PATH,     mainBody.trim() + "\n", "utf8");
writeFileSync(APPENDIX_PATH, appendixBody.trim() + "\n", "utf8");

for (const tmp of [TMP_MD, TMP_TYP]) {
  try { unlinkSync(tmp); } catch { /* non-fatal */ }
}

// ── 11. Compile with Typst ────────────────────────────────────
console.log("→ Compiling Typst → PDF");
const pdfDir = dirname(PDF_OUT);
if (!existsSync(pdfDir)) mkdirSync(pdfDir, { recursive: true });
// Typst restricts file reads to its project root; set the root to the
// repo so we can reference SVGs in public/whitepaper-diagrams/.
execFileSync(
  "typst",
  ["compile", "--root", root, ENTRY_PATH, PDF_OUT],
  { stdio: "inherit" },
);

console.log(`✓ Wrote ${PDF_OUT}`);
console.log(`  ${figures.length} figure(s) embedded`);
