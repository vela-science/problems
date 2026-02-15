/**
 * sync-kernel-from-tex.ts
 *
 * Converts docs/kernel/kernel.tex → src/content/kernel/lux-kernel.md
 *
 * The LaTeX document is the single source of truth. This script extracts the
 * document body, converts LaTeX → Markdown via pandoc, and performs post-processing
 * to handle figures, code listings, bibliography, and custom macros.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// ── Diagram mapping ──────────────────────────────────────────────────
// Maps diagram .tex filenames to metadata for the web rendering.
const KERNEL_FIGURES: Record<string, { src: string; alt: string; maxWidthClass?: string }> = {
  "kernel-boundary": {
    src: "/svgs/diagrams/kernel-boundary.svg",
    alt: "The kernel / observer boundary: kernel owns content addressing, events, replay, checkpoints; observers produce certificates from the materialized view",
    maxWidthClass: "max-w-lg",
  },
  "kernel-objects": {
    src: "/svgs/diagrams/kernel-objects.svg",
    alt: "Primitive objects and their relationships: Point A linked to Point B via a typed relationship, with a trail connecting them",
    maxWidthClass: "max-w-lg",
  },
  "kernel-events": {
    src: "/svgs/diagrams/kernel-events.svg",
    alt: "Append-only event chain: E1 (object.add) → E2 (object.add) → E3 (point.retract) with dependency edges",
    maxWidthClass: "max-w-xl",
  },
  "kernel-replay": {
    src: "/svgs/diagrams/kernel-replay.svg",
    alt: "Deterministic replay pipeline: Accepted Events → Topo Sort (Kahn) → δ Transition Function → Kernel View → Checkpoint Root",
    maxWidthClass: "max-w-xl",
  },
  "kernel-merkle": {
    src: "/svgs/diagrams/kernel-merkle.svg",
    alt: "Checkpoint Merkle tree following RFC 9162: leaf hashing with 0x00 prefix, node hashing with 0x01 prefix",
    maxWidthClass: "max-w-lg",
  },
};

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
      "--atx-headers",
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
 * Remove the title block (everything up to and including the first \thinrule
 * after the abstract). We reconstruct the title/abstract in the markdown frontmatter.
 */
const stripTitleAndAbstract = (body: string): { abstract: string; rest: string } => {
  // Extract abstract text from \begin{quote}...\end{quote} after "Abstract"
  const absMatch = body.match(
    /\\begin\{center\}\s*\\textbf\{Abstract\}\s*\\end\{center\}\s*\\begin\{quote\}\s*\\small\s*([\s\S]*?)\\end\{quote\}/,
  );
  const abstract = absMatch ? absMatch[1].trim() : "";

  // Find end of abstract block (after the \thinrule following the abstract)
  const afterAbstract = body.indexOf("\\section{");
  if (afterAbstract === -1) {
    throw new Error("Could not find first \\section after abstract.");
  }
  const rest = body.slice(afterAbstract).trim();

  return { abstract, rest };
};

/**
 * Replace \field{...} with \texttt{...} so pandoc renders it as inline code.
 */
const replaceFieldMacro = (tex: string): string =>
  tex.replaceAll(/\\field\{([^}]*)\}/g, "\\texttt{$1}");

/**
 * Replace \code{...} with \texttt{...}.
 */
const replaceCodeMacro = (tex: string): string =>
  tex.replaceAll(/\\code\{([^}]*)\}/g, "\\texttt{$1}");

/**
 * Replace \thinrule with --- (horizontal rule).
 */
const replaceThinrule = (tex: string): string =>
  tex.replaceAll(/\\thinrule/g, "\n\n---\n\n");

/**
 * Replace figure blocks with tokens that survive pandoc conversion.
 */
const replaceFigures = (tex: string): string =>
  tex.replaceAll(
    /\\begin\{figure\}\[H\]\s*\\centering\s*\\input\{[^}]*\/([a-z-]+)\.tex\}\s*\\caption\{([^}]*)\}\s*\\label\{[^}]*\}\s*\\end\{figure\}/g,
    (_match, name: string, _caption: string) => {
      if (KERNEL_FIGURES[name]) {
        // Wrap in a verbatim block so pandoc passes it through untouched
        return `\n\n\\begin{verbatim}\nFIGURETOKEN:${name}\n\\end{verbatim}\n\n`;
      }
      return "";
    },
  );

/**
 * Replace lstlisting blocks with fenced code blocks that pandoc will pass through.
 * We do this pre-pandoc because pandoc doesn't handle lstlisting well.
 */
const replaceListings = (tex: string): string => {
  return tex.replaceAll(
    /\\begin\{lstlisting\}\[style=(\w+)[^\]]*\]([\s\S]*?)\\end\{lstlisting\}/g,
    (_match, style: string, code: string) => {
      const lang = style === "json" ? "json" : style === "pseudo" ? "text" : "";
      const trimmed = code.replace(/^\n/, "").replace(/\n$/, "");
      return `\n\n\\begin{verbatim}\nCODESTART:${lang}\n${trimmed}\nCODEEND\n\\end{verbatim}\n\n`;
    },
  );
};

/**
 * Replace bibliography with a markdown references section.
 */
const extractBibliography = (tex: string): { body: string; references: string } => {
  const bibMatch = tex.match(
    /\\begin\{thebibliography\}\{[^}]*\}([\s\S]*?)\\end\{thebibliography\}/,
  );
  if (!bibMatch) return { body: tex, references: "" };

  const bibTex = bibMatch[1];
  const body = tex.slice(0, tex.indexOf("\\begin{thebibliography}")).trim();

  // Parse individual \bibitem entries
  const items = [...bibTex.matchAll(/\\bibitem\{([^}]+)\}\s*([\s\S]*?)(?=\\bibitem|\s*$)/g)];
  const refs: string[] = [];
  for (const item of items) {
    const key = item[1];
    let text = item[2].trim();
    // Clean up LaTeX formatting
    text = text
      .replaceAll(/\\textit\{([^}]*)\}/g, "*$1*")
      .replaceAll(/~\\/g, " ")
      .replaceAll(/~/g, " ")
      .replaceAll(/``/g, '"')
      .replaceAll(/''/g, '"')
      .replaceAll(/---/g, "—")
      .replaceAll(/--/g, "–")
      .replaceAll(/\\\\/g, "")
      .replaceAll(/\\&/g, "&")
      .trim();
    refs.push(`[${key}] ${text}`);
  }

  const references = refs.join("\n\n");
  return { body, references };
};

/**
 * Strip \label{...} commands and \ref/\cite references.
 * Convert \cite{...} to bracket notation and Section~\ref to plain text.
 */
const cleanReferences = (tex: string): string => {
  let out = tex;
  // Remove \label{...}
  out = out.replaceAll(/\\label\{[^}]*\}/g, "");
  // Convert Section~\ref{sec:xxx} to "Section N" style
  out = out.replaceAll(/Section~\\ref\{sec:(\w+)\}/g, (_m, id: string) => {
    const sectionMap: Record<string, string> = {
      requirements: "2", boundary: "3", objects: "4", events: "5",
      replay: "6", checkpoints: "7", replication: "8", security: "9",
      conformance: "10", related: "11",
    };
    return `Section ${sectionMap[id] || id}`;
  });
  // Convert \cite{key} to [key]
  out = out.replaceAll(/\\cite\{([^}]*)\}/g, "[$1]");
  // Convert Sections~\ref{...}--\ref{...}
  out = out.replaceAll(/Sections?~\\ref\{[^}]*\}(?:--\\ref\{[^}]*\})*/g, (match) => {
    return match
      .replaceAll(/\\ref\{sec:(\w+)\}/g, (_m, id: string) => {
        const sectionMap: Record<string, string> = {
          requirements: "2", boundary: "3", objects: "4", events: "5",
          replay: "6", checkpoints: "7", replication: "8", security: "9",
          conformance: "10", related: "11",
        };
        return sectionMap[id] || id;
      })
      .replaceAll("~", " ");
  });
  return out;
};

/**
 * Remove decorative LaTeX commands that have no web equivalent.
 */
const stripDecorative = (tex: string): string =>
  tex
    .replaceAll(/\\constellationdivider/g, "")
    .replaceAll(/\\closingverse\{([^}]*)\}/g, "")
    .replaceAll(/\\vspace\{[^}]*\}/g, "")
    .replaceAll(/\\vfill/g, "")
    .replaceAll(/\\clearpage/g, "")
    .replaceAll(/\\medskip/g, "")
    .replaceAll(/\\noindent/g, "")
    .replaceAll(/\\markboth\{[^}]*\}\{[^}]*\}/g, "");

// ── Post-processing (Markdown → Markdown transforms after pandoc) ──

/**
 * Restore code blocks from tokens.
 */
const restoreCodeBlocks = (md: string): string =>
  md.replaceAll(
    /[ ]{0,4}CODESTART:(\w*)\n([\s\S]*?)\n[ ]{0,4}CODEEND/g,
    (_match, lang: string, code: string) => {
      // Strip the 4-space indent pandoc adds for verbatim blocks
      const dedented = code.replaceAll(/^    /gm, "");
      return `\`\`\`${lang}\n${dedented}\n\`\`\``;
    },
  );

/**
 * Restore figure tokens as HTML figure blocks with light/dark variants.
 */
const restoreFigures = (md: string): string =>
  md.replaceAll(/[ ]{0,4}FIGURETOKEN:([a-z-]+)/g, (_match, name: string) => {
    const fig = KERNEL_FIGURES[name];
    if (!fig) return "";
    const maxW = fig.maxWidthClass ?? "max-w-lg";
    const darkSrc = fig.src.replace(/\.svg$/, ".dark.svg");
    return `<figure class="my-12 flex justify-center">
  <img src="${fig.src}" alt="${fig.alt}" loading="lazy" decoding="async" class="diagram-light w-full ${maxW}" />
  <img src="${darkSrc}" alt="${fig.alt}" loading="lazy" decoding="async" class="diagram-dark w-full ${maxW}" />
</figure>`;
  });

/**
 * Clean up pandoc markdown output.
 */
const cleanMarkdown = (md: string): string => {
  let out = md;
  // Remove leftover braces from pandoc conversion
  out = out.replaceAll(/\{([^{}]*)\}/g, "$1");
  // Fix escaped brackets from pandoc (citation references)
  out = out.replaceAll(/\\\[/g, "[");
  out = out.replaceAll(/\\\]/g, "]");
  // Fix double-escaped underscores
  out = out.replaceAll(/\\_/g, "_");
  // Fix math arrows from pandoc
  out = out.replaceAll(/\\rightarrow/g, "→");
  out = out.replaceAll(/\\leftarrow/g, "←");
  // Clean up $...$ inline math remnants
  out = out.replaceAll(/\$\\pm\s*2\^{?53}?-1\$/g, "±2⁵³−1");
  // Fix dashes from pandoc
  out = out.replaceAll(/---/g, "—");
  out = out.replaceAll(/--/g, "–");
  // Clean inline math remnants
  out = out.replaceAll(/\$→\$/g, "→");
  out = out.replaceAll(/\$\\rightarrow\$/g, "→");
  out = out.replaceAll(/\$\\leftarrow\$/g, "←");
  // Clean escaped blockquotes/asterisks
  out = out.replaceAll(/^\\> /gm, "> ");
  out = out.replaceAll(/\\\*/g, "*");
  // Remove excessive blank lines (3+ → 2)
  out = out.replaceAll(/\n{4,}/g, "\n\n\n");
  // Bump all headings by one level: \section → ##, \subsection → ###
  // pandoc converts \section → #, \subsection → ##
  // We want \section → ##, \subsection → ### for the content collection
  // Process deepest first to avoid double-bumping
  out = out.replaceAll(/^#### /gm, "##### ");
  out = out.replaceAll(/^### /gm, "#### ");
  out = out.replaceAll(/^## /gm, "### ");
  out = out.replaceAll(/^# /gm, "## ");
  return out.trim();
};

// ── Main ─────────────────────────────────────────────────────────────

const main = () => {
  const repoRoot = process.cwd();
  const sourcePath = path.join(repoRoot, "docs/kernel/kernel.tex");
  const outDir = path.join(repoRoot, "src/content/kernel");
  const outPath = path.join(outDir, "lux-kernel.md");

  mkdirSync(outDir, { recursive: true });

  const source = readText(sourcePath);
  let body = extractDocumentBody(source);

  // Extract abstract and bibliography
  const { abstract, rest: bodyWithoutTitle } = stripTitleAndAbstract(body);
  const { body: bodyWithoutBib, references } = extractBibliography(bodyWithoutTitle);

  // Pre-pandoc transforms
  let tex = bodyWithoutBib;
  tex = replaceFieldMacro(tex);
  tex = replaceCodeMacro(tex);
  tex = replaceThinrule(tex);
  tex = replaceFigures(tex);
  tex = replaceListings(tex);
  tex = cleanReferences(tex);
  tex = stripDecorative(tex);

  // Convert to markdown
  let md = runPandocLatexToMarkdown(tex);

  // Post-pandoc transforms
  md = restoreCodeBlocks(md);
  md = restoreFigures(md);
  md = cleanMarkdown(md);

  // Convert abstract through pandoc too
  let abstractMd = "";
  if (abstract) {
    let absTex = abstract;
    absTex = replaceFieldMacro(absTex);
    absTex = replaceCodeMacro(absTex);
    absTex = cleanReferences(absTex);
    abstractMd = runPandocLatexToMarkdown(absTex);
    abstractMd = cleanMarkdown(abstractMd);
  }

  // Build references section
  let referencesMd = "";
  if (references) {
    referencesMd = `\n\n## References\n\n${references}`;
  }

  // Assemble final markdown
  const frontmatter = `---
title: "Lux: A Content-Addressed Protocol for Structured Scientific Knowledge"
version: "1.0"
---`;

  const content = [
    frontmatter,
    "",
    "## Abstract",
    "",
    abstractMd,
    "",
    "---",
    "",
    md,
    referencesMd,
    "",
  ].join("\n");

  writeFileSync(outPath, content, "utf8");

  console.log(
    `Synced kernel spec from ${path.relative(repoRoot, sourcePath)} → ${path.relative(repoRoot, outPath)}`,
  );
};

main();
