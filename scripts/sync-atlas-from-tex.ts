/**
 * sync-atlas-from-tex.ts
 *
 * Converts docs/atlas/atlas.tex → src/content/atlas/atlas.md
 *
 * The LaTeX document is the single source of truth. This script extracts the
 * document body, converts LaTeX → Markdown via pandoc, and performs post-processing
 * to handle custom macros (\pullquote, \constellationdivider, \closingverse, etc.).
 *
 * Atlas uses galileo.sty in essay mode (\section*{} unnumbered sections).
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// ── Helpers ──────────────────────────────────────────────────────────

const readText = (filePath: string): string =>
  readFileSync(filePath, "utf8").replaceAll("\r\n", "\n");

const runPandocLatexToMarkdown = (latex: string): string => {
  const output = execFileSync(
    "pandoc",
    [
      "-f", "latex",
      "-t", "markdown",
      "--wrap=none",
      "--markdown-headings=atx",
    ],
    { input: latex, encoding: "utf8" },
  );
  return String(output).trim();
};

const extractDocumentBody = (tex: string): string => {
  const begin = tex.indexOf("\\begin{document}");
  const end = tex.indexOf("\\end{document}");
  if (begin === -1 || end === -1 || end <= begin) {
    throw new Error("Could not find document body markers.");
  }
  return tex.slice(begin + "\\begin{document}".length, end).trim();
};

// ── Pre-processing (LaTeX → LaTeX transforms before pandoc) ────────

/**
 * Strip the title page (everything before the first \section*).
 */
const stripTitlePage = (body: string): string => {
  const idx = body.indexOf("\\section*{");
  if (idx === -1) throw new Error("No \\section*{} found in document.");
  return body.slice(idx).trim();
};

/**
 * Replace essay macros with tokens that survive pandoc.
 */
const replaceEssayMacros = (tex: string): string => {
  let out = tex;

  // Constellation divider → horizontal rule
  out = out.replaceAll(/\\constellationdivider/g, "\n\n---\n\n");

  // Closing verse → blockquote
  out = out.replaceAll(
    /\\closingverse\{([^}]*)\}/g,
    (_match, text: string) => `\n\n\\begin{quote}\n\\textit{${text.trim()}}\n\\end{quote}\n\n`,
  );

  // Pull quote → blockquote with emphasis
  out = out.replaceAll(
    /\\pullquote\{([^}]*)\}/g,
    (_match, text: string) => `\n\n\\begin{quote}\n\\textit{${text.trim()}}\n\\end{quote}\n\n`,
  );

  // Number callout → bold centered paragraph
  out = out.replaceAll(
    /\\numbercallout\{([^}]*)\}/g,
    (_match, value: string) => `\n\n\\begin{center}\n\\textbf{${value.trim()}}\n\\end{center}\n\n`,
  );

  // Replace TikZ diagram blocks with image placeholders
  // Matches \begin{center}\input{../diagrams/tikz/NAME.tikz}\end{center}
  out = out.replaceAll(
    /\\begin\{center\}\s*\\input\{\.\.\/diagrams\/tikz\/([a-z-]+)\.tikz\}\s*\\end\{center\}/g,
    (_match, name: string) => `\n\nDIAGRAM_PLACEHOLDER_${name}\n\n`,
  );

  // Strip decorative LaTeX commands
  out = out
    .replaceAll(/\\vspace\{[^}]*\}/g, "")
    .replaceAll(/\\vspace\*\{[^}]*\}/g, "")
    .replaceAll(/\\vfill/g, "")
    .replaceAll(/\\clearpage/g, "")
    .replaceAll(/\\medskip/g, "")
    .replaceAll(/\\noindent/g, "")
    .replaceAll(/\\markboth\{[^}]*\}\{[^}]*\}/g, "")
    .replaceAll(/\\thispagestyle\{[^}]*\}/g, "");

  // Strip vigil markers (no-ops in PDF, no-ops on web for atlas)
  out = out.replaceAll(/\\vigilclaim\{[^}]*\}/g, "");
  out = out.replaceAll(/\\vigiltrail\{[^}]*\}/g, "");

  return out;
};

// ── Post-processing (Markdown → Markdown transforms after pandoc) ──

/**
 * Clean up pandoc markdown output.
 */
const cleanMarkdown = (md: string): string => {
  let out = md;

  // Fix escaped brackets
  out = out.replaceAll(/\\\[/g, "[");
  out = out.replaceAll(/\\\]/g, "]");

  // Fix double-escaped underscores
  out = out.replaceAll(/\\_/g, "_");

  // Fix dashes — protect horizontal rules (--- on own line) first
  out = out.replaceAll(/^---$/gm, "HRULETOK");
  out = out.replaceAll(/---/g, "—");
  out = out.replaceAll(/--/g, "–");
  out = out.replaceAll(/HRULETOK/g, "---");

  // Clean escaped blockquotes/asterisks
  out = out.replaceAll(/^\\> /gm, "> ");
  out = out.replaceAll(/\\\*/g, "*");

  // Strip pandoc's {#slug .unnumbered} attributes from headings
  // Must happen BEFORE general brace removal
  out = out.replaceAll(/ \{[^}]*\.unnumbered[^}]*\}/g, "");
  out = out.replaceAll(/ \{#[^}]*\}/g, "");
  // Also strip leftover #slug .unnumbered without braces (if braces already stripped)
  out = out.replaceAll(/ #[a-z-]+ \.unnumbered/g, "");

  // Remove leftover braces from pandoc
  out = out.replaceAll(/\{([^{}]*)\}/g, "$1");

  // Remove excessive blank lines (3+ → 2)
  out = out.replaceAll(/\n{4,}/g, "\n\n\n");

  // pandoc converts \section*{} to # (unnumbered). We want ## for content.
  // Process deepest first
  out = out.replaceAll(/^#### /gm, "##### ");
  out = out.replaceAll(/^### /gm, "#### ");
  out = out.replaceAll(/^## /gm, "### ");
  out = out.replaceAll(/^# /gm, "## ");

  // Fix $ signs that got escaped
  out = out.replaceAll(/\\\$/g, "$");

  return out.trim();
};

// ── Main ─────────────────────────────────────────────────────────────

const main = () => {
  const repoRoot = process.cwd();
  const sourcePath = path.join(repoRoot, "docs/atlas/atlas.tex");
  const outDir = path.join(repoRoot, "src/content/atlas");
  const outPath = path.join(outDir, "atlas.md");

  mkdirSync(outDir, { recursive: true });

  const source = readText(sourcePath);
  let body = extractDocumentBody(source);

  // Strip title page
  body = stripTitlePage(body);

  // Pre-pandoc transforms
  body = replaceEssayMacros(body);

  // Convert to markdown
  let md = runPandocLatexToMarkdown(body);

  // Post-pandoc transforms
  md = cleanMarkdown(md);

  // Replace diagram placeholders with responsive image HTML
  const diagramMeta: Record<string, { alt: string; maxWidth: string }> = {
    "shadow-person": {
      alt: "Two views of the same researcher: on the left, what metrics see — isolated data points (h-index, citations, affiliation, grants). On the right, what the faculty sees — a trajectory arc with a turn, brightening toward the future.",
      maxWidth: "max-w-2xl",
    },
    "landscape-concentration": {
      alt: "The shape of the pipeline's blindness: a dense bright cluster of stars on one side (93% of researchers, concentrated in five institutions) and vast dark emptiness on the other (the rest of the world, with a lone star in Kraków).",
      maxWidth: "max-w-xl",
    },
  };

  md = md.replaceAll(
    /DIAGRAM_PLACEHOLDER_([a-z-]+)/g,
    (_match, name: string) => {
      const meta = diagramMeta[name];
      if (!meta) return "";
      return `<figure class="diagram-figure ${meta.maxWidth} mx-auto my-12">
<img src="/svgs/diagrams/${name}.svg" alt="${meta.alt}" class="diagram-light w-full" />
<img src="/svgs/diagrams/${name}.dark.svg" alt="${meta.alt}" class="diagram-dark w-full" />
</figure>`;
    },
  );

  // Assemble with frontmatter
  const frontmatter = `---
title: "Atlas: An Instrument for Seeing"
subtitle: "On building an instrument to see the people who carry knowledge forward"
author: "William Blair"
date: "February 2026"
---`;

  const content = `${frontmatter}\n\n${md}\n`;

  writeFileSync(outPath, content, "utf8");

  console.log(
    `Synced atlas essay from ${path.relative(repoRoot, sourcePath)} → ${path.relative(repoRoot, outPath)}`,
  );
};

main();
