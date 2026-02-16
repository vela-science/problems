/**
 * sync-atlas-from-tex.ts
 *
 * Converts docs/atlas/atlas.tex → src/components/atlas/*Section.astro
 *
 * The LaTeX document is the single source of truth. This script extracts each
 * \section*{} block, converts LaTeX → HTML via pandoc, converts footnotes to
 * inline <Sidenote> components, and writes per-section Astro component files.
 *
 * Architecture mirrors sync-essay-from-tex.ts (Constellations pipeline).
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// ── Types ────────────────────────────────────────────────────────────

type SectionConfig = {
  id: string;
  title: string;
  glyph: string;
  outFile: string;
};

// ── Section Config ───────────────────────────────────────────────────

const SECTIONS: SectionConfig[] = [
  {
    id: "the-instrument",
    title: "The Instrument",
    glyph: "atlas-instrument",
    outFile: "src/components/atlas/InstrumentSection.astro",
  },
  {
    id: "the-faculty",
    title: "The Faculty",
    glyph: "atlas-faculty",
    outFile: "src/components/atlas/FacultySection.astro",
  },
  {
    id: "the-shadow",
    title: "The Shadow",
    glyph: "atlas-shadow",
    outFile: "src/components/atlas/ShadowSection.astro",
  },
  {
    id: "the-compiler",
    title: "The Compiler",
    glyph: "atlas-compiler",
    outFile: "src/components/atlas/CompilerSection.astro",
  },
  {
    id: "what-it-means-to-see",
    title: "What It Means to See",
    glyph: "atlas-arc",
    outFile: "src/components/atlas/SeeingSection.astro",
  },
  {
    id: "what-the-instrument-reveals",
    title: "What the Instrument Reveals",
    glyph: "atlas-landscape",
    outFile: "src/components/atlas/RevealsSection.astro",
  },
  {
    id: "the-choice",
    title: "The Choice",
    glyph: "atlas-choice",
    outFile: "src/components/atlas/ChoiceSection.astro",
  },
];

// ── Diagram metadata ─────────────────────────────────────────────────

const FIGURES: Record<string, { alt: string; maxWidthClass?: string }> = {
  "shadow-person": {
    alt: "Two views of the same researcher: on the left, what metrics see — isolated data points. On the right, what the faculty sees — a trajectory arc with a turn, brightening toward the future.",
    maxWidthClass: "max-w-2xl",
  },
  "landscape-concentration": {
    alt: "The shape of the pipeline's blindness: a dense bright cluster on one side and vast dark emptiness on the other, with a lone star in Kraków.",
    maxWidthClass: "max-w-xl",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

const readText = (filePath: string): string =>
  readFileSync(filePath, "utf8").replaceAll("\r\n", "\n");

const runPandocLatexToHtml = (latex: string): string => {
  const output = execFileSync(
    "pandoc",
    ["-f", "latex", "-t", "html", "--wrap=none"],
    { input: latex, encoding: "utf8" },
  );
  return String(output).trim();
};

const escapeForAttribute = (value: string): string =>
  JSON.stringify(value)
    .slice(1, -1)
    .replaceAll('"', '\\"');

const extractBraced = (
  input: string,
  openBraceIndex: number,
): { content: string; endIndexExclusive: number } => {
  if (input[openBraceIndex] !== "{") {
    throw new Error(`Expected '{' at ${openBraceIndex}`);
  }
  let depth = 0;
  for (let i = openBraceIndex; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0) {
      return { content: input.slice(openBraceIndex + 1, i), endIndexExclusive: i + 1 };
    }
  }
  throw new Error("Unterminated brace group");
};

const replaceSimpleMacroWithToken = (
  input: string,
  macroName: string,
  tokenPrefix: string,
): string => {
  let cursor = 0;
  let output = "";
  while (cursor < input.length) {
    const index = input.indexOf(`\\${macroName}{`, cursor);
    if (index === -1) {
      output += input.slice(cursor);
      break;
    }
    output += input.slice(cursor, index);
    const braceIndex = index + 1 + macroName.length;
    const { content, endIndexExclusive } = extractBraced(input, braceIndex);
    output += `\n\n[[${tokenPrefix}:${content.trim()}]]\n\n`;
    cursor = endIndexExclusive;
  }
  return output;
};

// ── Document parsing ─────────────────────────────────────────────────

const extractDocumentBody = (tex: string): string => {
  const begin = tex.indexOf("\\begin{document}");
  const end = tex.indexOf("\\end{document}");
  if (begin === -1 || end === -1 || end <= begin) {
    throw new Error("Could not find document body markers.");
  }
  return tex.slice(begin + "\\begin{document}".length, end).trim();
};

const extractSectionsByTitle = (docBody: string): Map<string, string> => {
  const matches = [...docBody.matchAll(/\\section\*\{([^}]*)\}/g)];
  const positions = matches.map((m) => ({
    title: m[1].split("\\hfill")[0]?.trim() ?? "",
    start: (m.index ?? 0) + m[0].length,
  }));

  const sections = new Map<string, string>();
  for (let i = 0; i < positions.length; i += 1) {
    const cur = positions[i];
    const next = positions[i + 1];
    const slice = docBody.slice(
      cur.start,
      next ? next.start - matches[i + 1]![0].length : docBody.length,
    );
    sections.set(cur.title, slice.trim());
  }
  return sections;
};

// ── LaTeX pre-processing ─────────────────────────────────────────────

const replaceCenterTikzBlocksWithFigures = (input: string): string => {
  return input.replaceAll(
    /\\begin\{center\}[\s\S]*?\\end\{center\}/g,
    (block: string) => {
      const inputMatch = block.match(
        /\\input\{\.\.\/diagrams\/tikz\/([a-z-]+)\.tikz\}/,
      );
      if (inputMatch) {
        const name = inputMatch[1];
        if (FIGURES[name]) {
          return `\n\n[[FIGURE:${name}]]\n\n`;
        }
        return "";
      }
      return "";
    },
  );
};

// ── HTML post-processing (tokens → Astro components) ─────────────────

const replaceTokensToAstroBlocks = (html: string): string => {
  let output = html;

  output = output.replaceAll(
    /<p>\s*\[\[DIVIDER\]\]\s*<\/p>/g,
    "<ConstellationDivider />",
  );

  output = output.replaceAll(
    /<p>\s*\[\[CLOSINGVERSE:([^]+?)\]\]\s*<\/p>/g,
    (_match, text: string) => {
      const normalized = text
        .trim()
        .replaceAll("<br />", "\n")
        .replaceAll("<br/>", "\n")
        .replaceAll("\\\\", "\n");
      const collapsed = normalized.replaceAll("\n\n", "\n");
      return `<ClosingVerse text="${escapeForAttribute(collapsed)}" />`;
    },
  );

  output = output.replaceAll(
    /<p>\s*\[\[FIGURE:([^]+?)\]\]\s*<\/p>/g,
    (_match, name: string) => {
      const figure = FIGURES[name.trim()];
      if (!figure) {
        throw new Error(`Unknown figure token: ${name}`);
      }
      const maxWidth = figure.maxWidthClass ?? "max-w-lg";
      const baseSrc = `/svgs/diagrams/${name.trim()}.svg`;
      const darkSrc = baseSrc.replace(/\.svg$/u, ".dark.svg");
      const alt = escapeForAttribute(figure.alt);
      return `\n<figure class="my-12 flex justify-center">\n  <img src="${baseSrc}" alt="${alt}" loading="lazy" decoding="async" class="diagram-light w-full ${maxWidth}" />\n  <img src="${darkSrc}" alt="${alt}" loading="lazy" decoding="async" class="diagram-dark w-full ${maxWidth}" />\n</figure>\n`;
    },
  );

  return output;
};

// ── Footnote → Sidenote conversion ──────────────────────────────────

const inlineFootnotesAsSidenotes = (
  html: string,
  offset: number,
): { html: string; count: number } => {
  const asideMatch = html.match(
    /<(?:aside|section)[^>]*class="footnotes[^"]*"[^>]*role="doc-endnotes"[^>]*>[\s\S]*?<\/(?:aside|section)>/,
  );
  if (!asideMatch) return { html, count: 0 };

  const asideHtml = asideMatch[0];
  const items = [...asideHtml.matchAll(/<li id="fn(\d+)"[^>]*>([\s\S]*?)<\/li>/g)];
  const byIndex = new Map<number, string>();
  for (const item of items) {
    const n = Number(item[1]);
    let content = item[2];
    content = content.replaceAll(
      /<a href="#fnref\d+" class="footnote-back" role="doc-backlink">[\s\S]*?<\/a>/g,
      "",
    );
    content = content.trim();
    const paragraphMatch = content.match(/^<p>([\s\S]*?)<\/p>$/);
    if (paragraphMatch) content = paragraphMatch[1].trim();
    byIndex.set(n, content);
  }

  let withoutAside = html.replace(asideMatch[0], "").trim();

  const refRegex =
    /<a href="#fn(\d+)" class="footnote-ref" id="fnref\d+" role="doc-noteref"><sup>\d+<\/sup><\/a>/g;
  withoutAside = withoutAside.replaceAll(
    refRegex,
    (full: string, nRaw: string) => {
      const n = Number(nRaw);
      const content = byIndex.get(n);
      if (!content) return full;
      const id = offset + n;
      return `<Sidenote id={${id}}>${content}</Sidenote>`;
    },
  );

  return { html: withoutAside, count: byIndex.size };
};

// ── Section conversion ───────────────────────────────────────────────

const toAstroBody = (
  cfg: SectionConfig,
  sectionTexRaw: string,
  footnoteOffset: number,
) => {
  let sectionTex = sectionTexRaw.replaceAll("\\markboth{}{}", "").trim();

  // Strip LaTeX-only layout commands
  sectionTex = sectionTex
    .replaceAll(/\\vspace\{[^}]*\}/g, "")
    .replaceAll(/\\vspace\*\{[^}]*\}/g, "")
    .replaceAll(/\\vfill/g, "")
    .replaceAll(/\\clearpage/g, "")
    .replaceAll(/\\noindent/g, "")
    .replaceAll(/\\hspace\{[^}]*\}/g, "");

  // Replace TikZ diagram blocks with figure tokens
  sectionTex = replaceCenterTikzBlocksWithFigures(sectionTex);

  // Macro tokens
  sectionTex = sectionTex.replaceAll("\\constellationdivider", "\n\n[[DIVIDER]]\n\n");
  sectionTex = replaceSimpleMacroWithToken(sectionTex, "closingverse", "CLOSINGVERSE");

  // Convert LaTeX → HTML via pandoc
  const html = runPandocLatexToHtml(sectionTex);
  let astro = replaceTokensToAstroBlocks(html);

  // Convert footnotes to inline sidenotes
  const inlined = inlineFootnotesAsSidenotes(astro, footnoteOffset);
  astro = inlined.html;

  // Remove empty paragraphs
  astro = astro.replaceAll(/<p>\s*<\/p>/g, "");

  return { astro, footnoteCount: inlined.count };
};

// ── Template ─────────────────────────────────────────────────────────

const sectionTemplate = (cfg: SectionConfig, bodyAstro: string): string => `---
import ConstellationDivider from "../ConstellationDivider.astro";
import ClosingVerse from "../ClosingVerse.astro";
import Sidenote from "../Sidenote.astro";
---

<section id="${cfg.id}" class="prose mb-16">
  <header class="flex items-center justify-between mb-8">
    <h2 class="text-2xl tracking-wide m-0">${cfg.title}</h2>
    <img src="/svgs/glyphs/${cfg.glyph}.svg" alt="" class="diagram-light w-10 h-10 opacity-80" />
    <img src="/svgs/glyphs/${cfg.glyph}.dark.svg" alt="" class="diagram-dark w-10 h-10 opacity-80" />
  </header>

${bodyAstro.trim()}
</section>
`;

// ── Main ─────────────────────────────────────────────────────────────

const main = () => {
  const repoRoot = process.cwd();
  const sourcePath = path.join(repoRoot, "docs/atlas/atlas.tex");
  const outDir = path.join(repoRoot, "src/components/atlas");

  mkdirSync(outDir, { recursive: true });

  const source = readText(sourcePath);
  const body = extractDocumentBody(source);
  const byTitle = extractSectionsByTitle(body);

  let footnoteOffset = 0;
  for (const cfg of SECTIONS) {
    const sectionTex = byTitle.get(cfg.title);
    if (!sectionTex) {
      throw new Error(`Missing section in LaTeX source: ${cfg.title}`);
    }

    const converted = toAstroBody(cfg, sectionTex, footnoteOffset);
    footnoteOffset += converted.footnoteCount;

    const outPath = path.join(repoRoot, cfg.outFile);
    writeFileSync(outPath, sectionTemplate(cfg, converted.astro), "utf8");
  }

  console.log(
    `Synced atlas sections from ${path.relative(repoRoot, sourcePath)} → ${path.relative(repoRoot, outDir)}/ (${footnoteOffset} sidenotes)`,
  );
};

main();
