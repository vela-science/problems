import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const isPandocAvailable = (): boolean => {
  try {
    execSync("pandoc --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

/**
 * Generate llms.txt and llms-full.txt from the LaTeX source.
 *
 * - llms.txt: Navigation/summary following the llmstxt.org standard
 * - llms-full.txt: Complete essay as clean markdown for LLM context
 */

const TEX_PATH = path.resolve(import.meta.dirname, "../docs/constellations.tex");
const LLMS_TXT_PATH = path.resolve(import.meta.dirname, "../public/llms.txt");
const LLMS_FULL_PATH = path.resolve(import.meta.dirname, "../public/llms-full.txt");

const readText = (filePath: string): string =>
  readFileSync(filePath, "utf8").replaceAll("\r\n", "\n");

const runPandocLatexToMarkdown = (latex: string): string => {
  const output = execFileSync(
    "pandoc",
    ["-f", "latex", "-t", "markdown", "--wrap=none", "--strip-comments"],
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

const cleanLatexForMarkdown = (latex: string): string => {
  let clean = latex;

  // Remove markboth commands
  clean = clean.replaceAll(/\\markboth\{[^}]*\}\{[^}]*\}/g, "");

  // Remove title page elements
  clean = clean.replaceAll(/\\begin\{titlepage\}[\s\S]*?\\end\{titlepage\}/g, "");

  // Remove ALL tikzpicture environments (they're diagrams/glyphs)
  clean = clean.replaceAll(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, "");

  // Remove input commands for tikz files
  clean = clean.replaceAll(/\\input\{[^}]*\.tikz\}/g, "");

  // Remove empty center blocks (left after tikz removal)
  clean = clean.replaceAll(/\\begin\{center\}\s*\\end\{center\}/g, "");

  // Remove minipage environments
  clean = clean.replaceAll(/\\begin\{minipage\}[\s\S]*?\\end\{minipage\}/g, "");

  // Remove figure environments but keep caption content
  clean = clean.replaceAll(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/g, "");

  // Remove any remaining center blocks with non-text content
  clean = clean.replaceAll(/\\begin\{center\}[\s\S]*?\\end\{center\}/g, (match) => {
    // If it contains mostly formatting commands, remove it
    const textContent = match
      .replace(/\\begin\{center\}/g, "")
      .replace(/\\end\{center\}/g, "")
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "")
      .replace(/\\[a-zA-Z]+/g, "")
      .trim();
    if (textContent.length < 20) return "";
    return match; // Keep center blocks with substantial text
  });

  // Convert custom macros to plain text
  clean = clean.replaceAll(/\\vigilclaim\{[^}]*\}/g, "");
  clean = clean.replaceAll(/\\trailref\{[^}]*\}/g, "");
  clean = clean.replaceAll(/\\constellationdivider/g, "\n---\n");
  clean = clean.replaceAll(/\\numbercallout\{([^}]*)\}/g, "**$1**");
  clean = clean.replaceAll(/\\pullquote\{([^}]*)\}/g, "> *$1*");
  clean = clean.replaceAll(/\\closingverse\{([^}]*)\}/g, "*$1*");
  clean = clean.replaceAll(/\\subhead\{([^}]*)\}/g, "### $1");

  // Convert section headers (remove hfill and glyph references)
  clean = clean.replaceAll(/\\section\*\{([^\\}]+)\\hfill[^}]*\}/g, "## $1");
  clean = clean.replaceAll(/\\section\*\{([^}]+)\}/g, "## $1");

  // Remove glyph macros
  clean = clean.replaceAll(/\\glyph\w+/g, "");

  // Remove vspace commands
  clean = clean.replaceAll(/\\vspace\{[^}]*\}/g, "");
  clean = clean.replaceAll(/\\vspace\*\{[^}]*\}/g, "");

  // Remove centering and formatting
  clean = clean.replaceAll(/\\centering/g, "");
  clean = clean.replaceAll(/\\noindent/g, "");
  clean = clean.replaceAll(/\\clearpage/g, "");
  clean = clean.replaceAll(/\\newpage/g, "");

  // Remove small-caps (keep content)
  clean = clean.replaceAll(/\\textsc\{([^}]*)\}/g, "$1");

  // Handle hfill for attributions
  clean = clean.replaceAll(/\\hfill\{([^}]*)\}/g, "— $1");
  clean = clean.replaceAll(/\\hfill/g, "");

  // Clean up reader's guide box
  clean = clean.replaceAll(/\\begin\{tcolorbox\}[\s\S]*?\\end\{tcolorbox\}/g, (match) => {
    // Extract content, remove tcolorbox formatting
    let content = match
      .replace(/\\begin\{tcolorbox\}\[[\s\S]*?\]/g, "")
      .replace(/\\end\{tcolorbox\}/g, "")
      .trim();
    return `\n\n${content}\n\n`;
  });

  // Remove appendix markers
  clean = clean.replaceAll(/\\appendix/g, "");

  // Remove phantom and other spacing commands
  clean = clean.replaceAll(/\\phantom\{[^}]*\}/g, "");
  clean = clean.replaceAll(/\\hspace\{[^}]*\}/g, " ");
  clean = clean.replaceAll(/\\hspace\*\{[^}]*\}/g, " ");

  // Remove color commands
  clean = clean.replaceAll(/\\color\{[^}]*\}/g, "");
  clean = clean.replaceAll(/\\textcolor\{[^}]*\}\{([^}]*)\}/g, "$1");

  // Clean up multiple blank lines
  clean = clean.replaceAll(/\n{4,}/g, "\n\n\n");

  return clean;
};

const postProcessMarkdown = (md: string): string => {
  let clean = md;

  // Remove any remaining LaTeX artifacts
  clean = clean.replaceAll(/\\\\/g, "\n");
  clean = clean.replaceAll(/\\&/g, "&");
  clean = clean.replaceAll(/\\%/g, "%");
  clean = clean.replaceAll(/\\$/g, "$");
  clean = clean.replaceAll(/\\_/g, "_");
  clean = clean.replaceAll(/\\#/g, "#");

  // Clean up pandoc artifacts
  clean = clean.replaceAll(/::: \{[^}]*\}/g, "");
  clean = clean.replaceAll(/:::/g, "");

  // Remove empty links
  clean = clean.replaceAll(/\[\]\([^)]*\)/g, "");

  // Clean up [Diagram] markers and escaped brackets
  clean = clean.replaceAll(/\\\[Diagram\\\]/g, "");
  clean = clean.replaceAll(/\[Diagram\]/g, "");

  // Remove stray "center" lines (from center environments)
  clean = clean.replaceAll(/^\s*center\s*$/gm, "");
  clean = clean.replaceAll(/\n\s*center\s*\n/g, "\n");

  // Fix a malformed attribution line emitted from the centered Kalanithi quote block.
  clean = clean.replace(
    /^knowledge is never contained in one person\. It grows from the relationships we create between each other and the world, and still it is never complete\.$/m,
    "Human knowledge is never contained in one person. It grows from the relationships we create between each other and the world, and still it is never complete.",
  );
  clean = clean.replace(
    /^---\s*\*?—?\s*Paul Kalanithi,\s*\*When Breath Becomes Air\*+\s*$/m,
    "— Paul Kalanithi, *When Breath Becomes Air*",
  );

  // Remove lines that are just formatting artifacts
  clean = clean.replaceAll(/^\s*of\s*$/gm, "");
  clean = clean.replaceAll(/^\s*Light\s*$/gm, "");

  // Clean up stray dashes from attributions
  clean = clean.replaceAll(/^---\s*---/gm, "---");
  clean = clean.replaceAll(/--- \*---/g, "---");

  // Drop title-page / epigraph residue and start at the first real essay section.
  const firstSectionIndex = clean.indexOf("## The Inheritance");
  if (firstSectionIndex !== -1) {
    clean = clean.slice(firstSectionIndex);
  }

  // Clean up excessive whitespace
  clean = clean.replaceAll(/\n{3,}/g, "\n\n");
  clean = clean.replaceAll(/[ \t]+\n/g, "\n");
  clean = clean.trim();

  return clean;
};

const generateLlmsTxt = (): string => {
  return `# Constellations of Borrowed Light

> Why science needs an open, correctable state layer for findings.

This is the founding document for the Borrowed Light project, proposing a constellation of structured points and trails to connect humanity's scattered knowledge.

## Sections

- [The Inheritance](#the-inheritance): The problem—knowledge exists but cannot arrive
- [The Pattern](#the-pattern): Historical context and why transmission fails
- [The Foundation](#the-foundation): The substrate, the compiler, and the stack
- [The Constellation](#the-constellation): The navigable frontier—points, links, and trails
- [The Gigafactory](#the-gigafactory): The physical execution layer for knowledge

## Links

- [Full Essay](https://borrowedlight.org): Read the complete essay
- [Summary](https://borrowedlight.org/constellations-summary.md): Shareable key claims
- [Companion Notes](https://borrowedlight.org/constellations-companion.md): Supporting architecture and protocol notes
- [Protocol](https://borrowedlight.org/protocol): Technical specification

## Full Content

For complete essay text optimized for LLM context, see [/llms-full.txt](/llms-full.txt)
`;
};

const main = () => {
  // Check if pandoc is available - if not, skip generation (use pre-committed files)
  if (!isPandocAvailable()) {
    if (existsSync(LLMS_TXT_PATH) && existsSync(LLMS_FULL_PATH)) {
      console.log("Pandoc not available, using pre-committed llms.txt files.");
      return;
    }
    console.error("Error: pandoc not found and no pre-committed llms.txt files exist.");
    process.exit(1);
  }

  console.log("Generating llms.txt files from LaTeX source...");

  // Read and process LaTeX
  const texSource = readText(TEX_PATH);
  const docBody = extractDocumentBody(texSource);
  const cleanedLatex = cleanLatexForMarkdown(docBody);

  // Convert to markdown via pandoc
  const rawMarkdown = runPandocLatexToMarkdown(cleanedLatex);
  const cleanMarkdown = postProcessMarkdown(rawMarkdown);

  // Add header to full content
  const llmsFullContent = `# Constellations of Borrowed Light

> Why science needs an open, correctable state layer for findings.

---

${cleanMarkdown}

---

*This document is optimized for LLM context. Visit [borrowedlight.org](https://borrowedlight.org) for the full formatted essay.*
`;

  // Generate navigation file
  const llmsTxtContent = generateLlmsTxt();

  // Write files
  writeFileSync(LLMS_TXT_PATH, llmsTxtContent);
  console.log(`  Written: ${LLMS_TXT_PATH}`);

  writeFileSync(LLMS_FULL_PATH, llmsFullContent);
  console.log(`  Written: ${LLMS_FULL_PATH}`);

  // Log stats
  const wordCount = cleanMarkdown.split(/\s+/).length;
  const charCount = cleanMarkdown.length;
  console.log(`  Essay stats: ~${wordCount.toLocaleString()} words, ${charCount.toLocaleString()} characters`);
  console.log("Done.");
};

main();
