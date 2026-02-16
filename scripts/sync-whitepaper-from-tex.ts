/**
 * sync-whitepaper-from-tex.ts
 *
 * Converts docs/whitepaper/whitepaper.tex → src/components/whitepaper/*Section.astro
 *
 * The LaTeX document is the single source of truth. This script extracts each
 * \section{} block, converts LaTeX → HTML via pandoc, converts footnotes to
 * inline <Sidenote> components, and writes per-section Astro component files.
 *
 * Architecture mirrors sync-atlas-from-tex.ts (Atlas pipeline).
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// ── Types ────────────────────────────────────────────────────────────

type SectionConfig = {
  id: string;
  title: string;
  number: number;
  outFile: string;
};

// ── Section Config ───────────────────────────────────────────────────

const SECTIONS: SectionConfig[] = [
  { id: "the-problem", title: "The Problem", number: 1, outFile: "src/components/whitepaper/ProblemSection.astro" },
  { id: "why-existing-approaches-plateau", title: "Why Existing Approaches Plateau", number: 2, outFile: "src/components/whitepaper/PlateauSection.astro" },
  { id: "design-principles", title: "Design Principles", number: 3, outFile: "src/components/whitepaper/PrinciplesSection.astro" },
  { id: "architecture", title: "Architecture", number: 4, outFile: "src/components/whitepaper/ArchitectureSection.astro" },
  { id: "primitives", title: "Primitives", number: 5, outFile: "src/components/whitepaper/PrimitivesSection.astro" },
  { id: "the-compiler", title: "The Compiler", number: 6, outFile: "src/components/whitepaper/CompilerSection.astro" },
  { id: "a-worked-example", title: "A Worked Example", number: 7, outFile: "src/components/whitepaper/WorkedExampleSection.astro" },
  { id: "determinism-and-verification", title: "Determinism and Verification", number: 8, outFile: "src/components/whitepaper/DeterminismSection.astro" },
  { id: "the-observer-model", title: "The Observer Model", number: 9, outFile: "src/components/whitepaper/ObserverSection.astro" },
  { id: "why-now", title: "Why Now", number: 10, outFile: "src/components/whitepaper/WhyNowSection.astro" },
  { id: "open-protocol-governance", title: "Open Protocol Governance", number: 11, outFile: "src/components/whitepaper/GovernanceSection.astro" },
  { id: "first-proof", title: "First Proof", number: 12, outFile: "src/components/whitepaper/FirstProofSection.astro" },
  { id: "conclusion", title: "Conclusion", number: 13, outFile: "src/components/whitepaper/ConclusionSection.astro" },
];

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

// ── Diagram metadata ─────────────────────────────────────────────────

const FIGURES: Record<string, { alt: string; maxWidthClass?: string }> = {
  "whitepaper-layers": {
    alt: "Lux four-layer architecture: compiler, kernel (narrow waist), observers, and products.",
    maxWidthClass: "max-w-2xl",
  },
  "whitepaper-primitives": {
    alt: "The three Lux primitives — points, typed links, and trails — as a navigable graph.",
    maxWidthClass: "max-w-2xl",
  },
  "whitepaper-compiler": {
    alt: "The compiler pipeline: five stages from paper ingestion through human validation into the constellation.",
    maxWidthClass: "max-w-3xl",
  },
  "whitepaper-cascade": {
    alt: "Before and after: disconnected papers in the current system vs. structured correction cascade in Lux.",
    maxWidthClass: "max-w-3xl",
  },
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

const extractAbstract = (docBody: string): string => {
  const quoteMatch = docBody.match(
    /\\begin\{quote\}\s*\\small\s*([\s\S]*?)\\end\{quote\}/,
  );
  if (!quoteMatch) return "";
  return quoteMatch[1].trim();
};

const extractSectionsByTitle = (docBody: string): Map<string, string> => {
  // Match both \section{Title} and \section*{Title}
  const matches = [...docBody.matchAll(/\\section\*?\{([^}]*)\}/g)];
  const positions = matches.map((m) => ({
    title: m[1].trim(),
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

const preprocessSection = (sectionTex: string): string => {
  let tex = sectionTex;

  // Strip LaTeX-only layout commands
  tex = tex
    .replaceAll(/\\vspace\*?\{[^}]*\}/g, "")
    .replaceAll(/\\vfill/g, "")
    .replaceAll(/\\clearpage/g, "")
    .replaceAll(/\\noindent/g, "")
    .replaceAll(/\\hspace\{[^}]*\}/g, "")
    .replaceAll(/\\markboth\{[^}]*\}\{[^}]*\}/g, "");

  // Strip decorative rules
  tex = tex.replaceAll(
    /\\textcolor\{[^}]+\}\{\\rule\{[^}]+\}\{[^}]+\}\}/g,
    "",
  );

  // Replace TikZ diagram blocks with figure tokens
  tex = tex.replaceAll(
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
      return block;
    },
  );

  // Strip \label{...}
  tex = tex.replaceAll(/\\label\{[^}]+\}/g, "");

  // Resolve cross-references (only one in the document: sec:compiler → Section 6)
  tex = tex.replaceAll(/Section~\\ref\{sec:compiler\}/g, "Section 6");

  // Replace \constellationdivider with token
  tex = tex.replaceAll("\\constellationdivider", "\n\n[[DIVIDER]]\n\n");

  // Detect closing verse pattern: \begin{center}{\itshape\color{...} text}\end{center}
  tex = tex.replaceAll(
    /\\begin\{center\}\s*\{\\itshape\\color\{[^}]+\}\s*([\s\S]*?)\}\s*\\end\{center\}/g,
    (_, text: string) => `\n\n[[CLOSINGVERSE:${text.trim()}]]\n\n`,
  );

  // Strip remaining empty \begin{center}...\end{center} blocks
  tex = tex.replaceAll(
    /\\begin\{center\}\s*\\end\{center\}/g,
    "",
  );

  return tex;
};

// ── HTML post-processing (tokens → Astro components) ─────────────────

const replaceTokensToAstroBlocks = (html: string): string => {
  let output = html;

  output = output.replaceAll(
    /<p>\s*\[\[DIVIDER\]\]\s*<\/p>/g,
    "<ConstellationDivider />",
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
  sectionTexRaw: string,
  footnoteOffset: number,
) => {
  const sectionTex = preprocessSection(sectionTexRaw);

  // Convert LaTeX → HTML via pandoc
  const html = runPandocLatexToHtml(sectionTex);
  let astro = replaceTokensToAstroBlocks(html);

  // Convert footnotes to inline sidenotes
  const inlined = inlineFootnotesAsSidenotes(astro, footnoteOffset);
  astro = inlined.html;

  // Escape curly braces inside <pre><code> blocks (Astro treats them as JSX)
  astro = astro.replaceAll(
    /<pre><code>([\s\S]*?)<\/code><\/pre>/g,
    (_match, content: string) => {
      const escaped = content.replaceAll(
        /[{}]/g,
        (ch: string) => (ch === "{" ? "{'{'}" : "{'}'}"),
      );
      return `<pre><code>${escaped}</code></pre>`;
    },
  );

  // Remove empty paragraphs
  astro = astro.replaceAll(/<p>\s*<\/p>/g, "");

  return { astro, footnoteCount: inlined.count };
};

// ── Templates ────────────────────────────────────────────────────────

const sectionTemplate = (cfg: SectionConfig, bodyAstro: string): string => `---
import ConstellationDivider from "../ConstellationDivider.astro";
import ClosingVerse from "../ClosingVerse.astro";
import Sidenote from "../Sidenote.astro";
---

<section id="${cfg.id}" class="prose mb-16">
  <header class="mb-8">
    <h2 class="text-2xl tracking-wide m-0">${cfg.number}. ${cfg.title}</h2>
  </header>

${bodyAstro.trim()}
</section>
`;

const abstractTemplate = (bodyAstro: string): string => `---
import Sidenote from "../Sidenote.astro";
---

<section id="abstract" class="prose mb-16">
  <header class="mb-8">
    <h2 class="text-2xl tracking-wide m-0">Abstract</h2>
  </header>

  <blockquote class="border-l-2 border-gold-accent/30 pl-6 text-twilight italic not-italic:first-letter">
${bodyAstro.trim()}
  </blockquote>
</section>
`;

// ── Main ─────────────────────────────────────────────────────────────

const main = () => {
  const repoRoot = process.cwd();
  const sourcePath = path.join(repoRoot, "docs/whitepaper/whitepaper.tex");
  const outDir = path.join(repoRoot, "src/components/whitepaper");

  mkdirSync(outDir, { recursive: true });

  const source = readText(sourcePath);
  const body = extractDocumentBody(source);

  // Extract and generate abstract
  const abstractTex = extractAbstract(body);
  if (abstractTex) {
    const abstractHtml = runPandocLatexToHtml(abstractTex);
    const abstractPath = path.join(outDir, "AbstractSection.astro");
    writeFileSync(abstractPath, abstractTemplate(abstractHtml), "utf8");
  }

  // Extract sections
  const byTitle = extractSectionsByTitle(body);

  let footnoteOffset = 0;
  for (const cfg of SECTIONS) {
    const sectionTex = byTitle.get(cfg.title);
    if (!sectionTex) {
      throw new Error(`Missing section in LaTeX source: ${cfg.title}`);
    }

    const converted = toAstroBody(sectionTex, footnoteOffset);
    footnoteOffset += converted.footnoteCount;

    const outPath = path.join(repoRoot, cfg.outFile);
    writeFileSync(outPath, sectionTemplate(cfg, converted.astro), "utf8");
  }

  console.log(
    `Synced whitepaper sections from ${path.relative(repoRoot, sourcePath)} → ${path.relative(repoRoot, outDir)}/ (${footnoteOffset} sidenotes)`,
  );
};

main();
