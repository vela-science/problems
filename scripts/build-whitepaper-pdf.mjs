#!/usr/bin/env node
// =============================================================
// scripts/build-whitepaper-pdf.mjs
//
// Build the Constellate whitepaper PDF and its companion First
// Corridor Pilot Plan PDF from a single Pandoc → Typst pipeline.
//
// Whitepaper pipeline:
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
//
// Pilot plan pipeline (simpler — pure prose, no figures, no appendix):
//   1. Read whitepaper/pilot-plan-v0.1.md
//   2. Strip the H1 title and metadata kicker (arkheion handles them)
//   3. Extract "About This Document" as the abstract
//   4. Strip section numbering (e.g. "## 1. Frontier" → "= Frontier")
//   5. Remove horizontal rule separators around the closing block
//   6. Compile pilot-plan.typ → public/whitepaper/pilot-plan-v0.1.pdf
// =============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const MDX_PATH            = join(root, "src/content/whitepaper/index.mdx");
const PILOT_MD_PATH       = join(root, "whitepaper/pilot-plan-v0.1.md");
const SPEC_MD_PATH        = join(root, "whitepaper/vela-specification-v0.5.md");
const TYPST_DIR           = join(root, "whitepaper/typst");
const DIAGRAMS_DIR        = join(root, "public/whitepaper-diagrams");
const ABSTRACT_PATH       = join(TYPST_DIR, "body-abstract.typ");
const MAIN_PATH           = join(TYPST_DIR, "body-main.typ");
const APPENDIX_PATH       = join(TYPST_DIR, "body-appendices.typ");
const ENTRY_PATH          = join(TYPST_DIR, "constellate.typ");
const PILOT_ENTRY_PATH    = join(TYPST_DIR, "pilot-plan.typ");
const PILOT_ABSTRACT_PATH = join(TYPST_DIR, "body-pilot-abstract.typ");
const PILOT_BODY_PATH     = join(TYPST_DIR, "body-pilot-plan.typ");
const SPEC_ENTRY_PATH     = join(TYPST_DIR, "vela-specification.typ");
const SPEC_ABSTRACT_PATH  = join(TYPST_DIR, "body-spec-abstract.typ");
const SPEC_BODY_PATH      = join(TYPST_DIR, "body-spec.typ");
const PDF_OUT             = join(root, "public/whitepaper/constellate-v0.1.pdf");
const PILOT_PDF_OUT       = join(root, "public/whitepaper/pilot-plan-v0.1.pdf");
const SPEC_PDF_OUT        = join(root, "public/whitepaper/vela-specification-v0.5.pdf");
const TMP_MD              = join(TYPST_DIR, ".body.md");
const TMP_TYP             = join(TYPST_DIR, ".body.typ");
const TMP_PILOT_MD        = join(TYPST_DIR, ".pilot.md");
const TMP_PILOT_TYP       = join(TYPST_DIR, ".pilot.typ");
const TMP_SPEC_MD         = join(TYPST_DIR, ".spec.md");
const TMP_SPEC_TYP        = join(TYPST_DIR, ".spec.typ");

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
execFileSync("pandoc", ["-f", "gfm-tex_math_dollars", "-t", "typst", TMP_MD, "-o", TMP_TYP], {
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

// ── Pilot plan companion ────────────────────────────────────────
console.log("\n→ Building pilot plan companion");

let pilot = readFileSync(PILOT_MD_PATH, "utf8");

// Strip the H1 title block — arkheion's template renders the title.
// The block runs from "# The First Corridor Pilot Plan" through the
// first horizontal rule that separates the title region from the
// "About This Document" abstract.
pilot = pilot.replace(/^#\s+The First Corridor Pilot Plan[\s\S]*?\n---\n/, "");

// Extract "About This Document" → abstract; remove from body.
const aboutMatch = pilot.match(/^##\s*About This Document\s*\n([\s\S]*?)(?=^##\s)/m);
let pilotAbstract = "";
if (aboutMatch) {
  pilotAbstract = aboutMatch[1].trim();
  pilot = pilot.replace(/^##\s*About This Document\s*\n[\s\S]*?(?=^##\s)/m, "");
}

// Strip the closing horizontal-rule + citation block; the arkheion
// template's footer carries the version line already.
pilot = pilot.replace(/\n+---\n+\*Cross-referenced[\s\S]*$/m, "\n");

writeFileSync(TMP_PILOT_MD, pilot, "utf8");

// Pandoc: markdown → Typst (abstract + body, separately).
writeFileSync(join(TYPST_DIR, ".pilot-abstract.md"), pilotAbstract, "utf8");
execFileSync("pandoc", [
  "-f", "gfm-tex_math_dollars", "-t", "typst",
  join(TYPST_DIR, ".pilot-abstract.md"),
  "-o", join(TYPST_DIR, ".pilot-abstract.typ"),
], { stdio: "inherit" });
execFileSync("pandoc", [
  "-f", "gfm-tex_math_dollars", "-t", "typst", TMP_PILOT_MD, "-o", TMP_PILOT_TYP,
], { stdio: "inherit" });

let pilotTyp = readFileSync(TMP_PILOT_TYP, "utf8");
let pilotAbsTyp = readFileSync(join(TYPST_DIR, ".pilot-abstract.typ"), "utf8");

// Clean pandoc artifacts: anchor labels + any stray horizontal rules.
pilotTyp = pilotTyp.replace(/^<[a-z0-9-]+>\n/gm, "");
pilotTyp = pilotTyp.replace(/^#horizontalrule\s*$/gm, "");
pilotAbsTyp = pilotAbsTyp.replace(/^<[a-z0-9-]+>\n/gm, "");

// Strip section numbering "== 1. Frontier" → "= Frontier"; promote
// H2 → H1 so arkheion renders the section number itself.
pilotTyp = pilotTyp.replace(/^==\s+\d+\.\s+(.+)$/gm, "= $1");

writeFileSync(PILOT_ABSTRACT_PATH, pilotAbsTyp.trim() + "\n", "utf8");
writeFileSync(PILOT_BODY_PATH,     pilotTyp.trim() + "\n", "utf8");

for (const tmp of [
  TMP_PILOT_MD, TMP_PILOT_TYP,
  join(TYPST_DIR, ".pilot-abstract.md"),
  join(TYPST_DIR, ".pilot-abstract.typ"),
]) {
  try { unlinkSync(tmp); } catch { /* non-fatal */ }
}

console.log("→ Compiling pilot plan Typst → PDF");
execFileSync(
  "typst",
  ["compile", "--root", root, PILOT_ENTRY_PATH, PILOT_PDF_OUT],
  { stdio: "inherit" },
);
console.log(`✓ Wrote ${PILOT_PDF_OUT}`);

// ── Vela Protocol Specification companion ───────────────────────
console.log("\n→ Building Vela protocol specification");

let spec = readFileSync(SPEC_MD_PATH, "utf8");

// Strip the H1 title block — arkheion's template renders the title.
spec = spec.replace(/^#\s+The Vela Protocol Specification[\s\S]*?\n---\n/, "");

// Extract "About This Document" → abstract; remove from body.
const specAboutMatch = spec.match(/^##\s*About This Document\s*\n([\s\S]*?)(?=^##\s)/m);
let specAbstract = "";
if (specAboutMatch) {
  specAbstract = specAboutMatch[1].trim();
  spec = spec.replace(/^##\s*About This Document\s*\n[\s\S]*?(?=^##\s)/m, "");
}

// Strip closing horizontal-rule + citation block.
spec = spec.replace(/\n+---\n+\*Cross-referenced[\s\S]*$/m, "\n");

writeFileSync(TMP_SPEC_MD, spec, "utf8");
writeFileSync(join(TYPST_DIR, ".spec-abstract.md"), specAbstract, "utf8");

execFileSync("pandoc", [
  "-f", "gfm-tex_math_dollars", "-t", "typst",
  join(TYPST_DIR, ".spec-abstract.md"),
  "-o", join(TYPST_DIR, ".spec-abstract.typ"),
], { stdio: "inherit" });
execFileSync("pandoc", [
  "-f", "gfm-tex_math_dollars", "-t", "typst", TMP_SPEC_MD, "-o", TMP_SPEC_TYP,
], { stdio: "inherit" });

let specTyp = readFileSync(TMP_SPEC_TYP, "utf8");
let specAbsTyp = readFileSync(join(TYPST_DIR, ".spec-abstract.typ"), "utf8");

specTyp = specTyp.replace(/^<[a-z0-9-]+>\n/gm, "");
specTyp = specTyp.replace(/^#horizontalrule\s*$/gm, "");
specAbsTyp = specAbsTyp.replace(/^<[a-z0-9-]+>\n/gm, "");

// Strip section numbering "== 1. Introduction" → "= Introduction"
specTyp = specTyp.replace(/^==\s+\d+\.\s+(.+)$/gm, "= $1");
// And "=== 7.1 Actor Records" → "== Actor Records" so arkheion auto-numbers
specTyp = specTyp.replace(/^===\s+\d+\.\d+\s+(.+)$/gm, "== $1");
// Promote appendix headings
specTyp = specTyp.replace(/^==\s+Appendix\s+[A-Z]:\s+(.+)$/gm, "= $1");

writeFileSync(SPEC_ABSTRACT_PATH, specAbsTyp.trim() + "\n", "utf8");
writeFileSync(SPEC_BODY_PATH,     specTyp.trim() + "\n", "utf8");

for (const tmp of [
  TMP_SPEC_MD, TMP_SPEC_TYP,
  join(TYPST_DIR, ".spec-abstract.md"),
  join(TYPST_DIR, ".spec-abstract.typ"),
]) {
  try { unlinkSync(tmp); } catch { /* non-fatal */ }
}

console.log("→ Compiling specification Typst → PDF");
execFileSync(
  "typst",
  ["compile", "--root", root, SPEC_ENTRY_PATH, SPEC_PDF_OUT],
  { stdio: "inherit" },
);
console.log(`✓ Wrote ${SPEC_PDF_OUT}`);
