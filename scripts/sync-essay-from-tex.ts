import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type SectionConfig = {
  id: string;
  title: string;
  glyph: string;
  outFile: string;
  /**
   * If set, conversion starts from the first occurrence of this string within the section.
   * Useful for skipping LaTeX-only formatting blocks (e.g. centered epigraph styling).
   */
  startAt?: string;
};

const SECTIONS: SectionConfig[] = [
  {
    id: "inheritance",
    title: "The Inheritance",
    glyph: "inheritance",
    outFile: "src/components/essay/InheritanceSection.astro",
    startAt: "The knowledge to save your life exists. It cannot reach you.",
  },
  {
    id: "pattern",
    title: "The Pattern",
    glyph: "pattern",
    outFile: "src/components/essay/PatternSection.astro",
  },
  {
    id: "software",
    title: "What Software Learned",
    glyph: "software",
    outFile: "src/components/essay/SoftwareSection.astro",
  },
  {
    id: "now",
    title: "Why Now",
    glyph: "now",
    outFile: "src/components/essay/WhyNowSection.astro",
  },
  {
    id: "constellation",
    title: "The Constellation",
    glyph: "constellation",
    outFile: "src/components/essay/ConstellationSection.astro",
  },
  {
    id: "coalition",
    title: "The Coalition",
    glyph: "coalition",
    outFile: "src/components/essay/CoalitionSection.astro",
  },
  {
    id: "gigafactory",
    title: "The Gigafactory",
    glyph: "work",
    outFile: "src/components/essay/GigafactorySection.astro",
  },
];

const FIGURES: Record<
  string,
  { src: string; alt: string; className?: string; maxWidthClass?: string }
> = {
  "structure-comparison": {
    src: "/svgs/diagrams/structure-comparison.svg",
    alt: "Side by side comparison: scattered stars without structure versus connected constellation with structure",
    maxWidthClass: "max-w-md",
  },
  "delay-bars": {
    src: "/svgs/diagrams/delay-bars.svg",
    alt: "Bar chart showing gaps: 2 months from symptom to diagnosis, 17 years from discovery to practice, 32 years from discovery to approved drug",
    maxWidthClass: "max-w-lg",
  },
  "software-timeline": {
    src: "/svgs/diagrams/software-timeline.svg",
    alt: "Timeline of software infrastructure: Git (2005), GitHub (2008), Hugging Face (2021), and AI coding agents (2025)",
    maxWidthClass: "max-w-xl",
  },
  "software-vs-science": {
    src: "/svgs/diagrams/software-vs-science.svg",
    alt: "Diagram comparing software built bottom-up with science built out of order",
    maxWidthClass: "max-w-xl",
  },
  "investment-bars": {
    src: "/svgs/diagrams/investment-bars.svg",
    alt: "Bar chart showing AI infrastructure investment by 2030: $5–7T compute, $500B+ models, $100M+ national programs, and ~$0 knowledge infrastructure",
    maxWidthClass: "max-w-lg",
  },
  "claim-diagram": {
    src: "/svgs/diagrams/claim-diagram.svg",
    alt: "Diagram showing a structured claim with statement, confidence, evidence, dissent, and lineage",
    maxWidthClass: "max-w-xl",
  },
  "trail-diagram": {
    src: "/svgs/diagrams/trail-diagram.svg",
    alt: "Diagram showing how trails let later clinicians inherit earlier paths to diagnosis",
    maxWidthClass: "max-w-xl",
  },
  "gigafactory-pipeline": {
    src: "/svgs/diagrams/gigafactory-pipeline.svg",
    alt: "Stylized gigafactory turning scientific artifacts into a constellation of versioned claims and auditable trails",
    maxWidthClass: "max-w-xl",
  },
};

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

const parseTrailRef = (
  raw: string,
): { trailId: string; stepIndex?: number } => {
  const trimmed = raw.trim();
  const [trailIdPart, rest] = trimmed.split("|", 2);
  const trailId = trailIdPart.trim();
  if (!rest) return { trailId };
  const m = rest.match(/step\s*=\s*(\d+)/i);
  if (!m) return { trailId };
  const step1 = Number(m[1]);
  if (!Number.isFinite(step1) || step1 <= 0) return { trailId };
  return { trailId, stepIndex: step1 - 1 };
};

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
    const braceIndex = index + 1 + macroName.length; // "\" + name + "{"
    const { content, endIndexExclusive } = extractBraced(input, braceIndex);
    output += `\n\n[[${tokenPrefix}:${content.trim()}]]\n\n`;
    cursor = endIndexExclusive;
  }
  return output;
};

const replaceInlineMacroWithToken = (
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
    const braceIndex = index + 1 + macroName.length; // "\" + name + "{"
    const { content, endIndexExclusive } = extractBraced(input, braceIndex);
    output += `[[${tokenPrefix}:${content.trim()}]]`;
    cursor = endIndexExclusive;
  }
  return output;
};

const replaceHfillLinesWithFlushright = (input: string): string => {
  const lines = input.split("\n");
  const outLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("\\hfill{")) {
      outLines.push(line);
      continue;
    }

    const openIndex = line.indexOf("{", line.indexOf("\\hfill") + "\\hfill".length);
    const { content } = extractBraced(line, openIndex);
    outLines.push("");
    outLines.push("\\begin{flushright}");
    outLines.push(content);
    outLines.push("\\end{flushright}");
    outLines.push("");
  }

  return outLines.join("\n");
};

const replaceCenterTikzBlocksWithFigures = (input: string): string => {
  return input.replaceAll(
    /\\begin\{center\}[\s\S]*?\\end\{center\}/g,
    (block: string) => {
      // Diagrams included via `\input{...}` - extract the diagram name directly
      const inputMatch = block.match(/\\input\{\.\.\/diagrams\/tikz\/([a-z-]+)\.tikz\}/);
      if (inputMatch) {
        const diagramName = inputMatch[1];
        // Skip diagrams not in our FIGURES mapping (e.g., title-constellation)
        if (FIGURES[diagramName]) {
          return `\n\n[[FIGURE:${diagramName}]]\n\n`;
        }
        // Unknown input file - skip silently if not a known figure
        return "";
      }

      if (!block.includes("\\begin{tikzpicture}")) return block;

      const normalized = block.replaceAll("\n", " ");

      // The LaTeX includes a closing-page constellation diagram; the web version renders
      // its own closing illustration, so drop this TikZ block when syncing.
      if (
        normalized.includes("Sigma Draconis") ||
        normalized.includes("82 Eridani") ||
        normalized.includes("Delta Pavonis")
      ) {
        return "";
      }

      // Legacy fallback for any remaining inline TikZ (decorative elements)
      const figureKey =
        normalized.includes("without structure") && normalized.includes("with structure")
          ? "structure-comparison"
          : normalized.includes("2 months") &&
              normalized.includes("17 years") &&
              (normalized.includes("32 years") || normalized.includes("approved drug"))
            ? "delay-bars"
            : normalized.includes("GitHub") && normalized.includes("Hugging Face")
              ? "software-timeline"
              : normalized.includes("SOFTWARE CONSTELLATION") || normalized.includes("built out of order")
                ? "software-vs-science"
                : normalized.includes("AI Infrastructure Investment by 2030") &&
                    normalized.includes("knowledge") &&
                    normalized.includes("compute")
                  ? "investment-bars"
                  : normalized.includes("BRAF") && normalized.includes("vemurafenib")
                    ? "claim-diagram"
                    : normalized.includes("Visit 1") && normalized.includes("diagnosis")
	                      ? "trail-diagram"
	                      : normalized.includes("BEGIN_DIAGRAM gigafactory-pipeline") ||
	                          normalized.includes("GIGAFACTORY PIPELINE")
	                        ? "gigafactory-pipeline"
	                      : null;

      if (!figureKey) {
        // For decorative inline TikZ (title elements, dividers), just return empty
        // These are not mapped to web figures
        return "";
      }

      return `\n\n[[FIGURE:${figureKey}]]\n\n`;
    },
  );
};

const replaceTokensToAstroBlocks = (html: string): string => {
  let output = html;

  output = output.replaceAll(
    /\[\[CLAIM:([^\]]+?)\]\]/g,
    (_match, id: string) => `<ClaimMarker claimId="${escapeForAttribute(id.trim())}" />`,
  );

  // Trail markers are stripped from web output (trails show in claim panels instead)
  output = output.replaceAll(/\[\[TRAIL:([^\]]+?)\]\]/g, "");

  output = output.replaceAll(
    /<p>\s*\[\[DIVIDER\]\]\s*<\/p>/g,
    "<ConstellationDivider />",
  );

  output = output.replaceAll(
    /<p>\s*\[\[NUMBERCALLOUT:([^]+?)\]\]\s*<\/p>/g,
    (_match, value: string) => `<NumberCallout value="${escapeForAttribute(value.trim())}" />`,
  );

  output = output.replaceAll(
    /<p>\s*\[\[SUBHEAD:([^]+?)\]\]\s*<\/p>/g,
    (_match, title: string) =>
      `<h3 class="text-lg tracking-wide mt-12 mb-4 text-ink-indigo">${title.trim()}</h3>`,
  );

  output = output.replaceAll(
    /<p>\s*\[\[PULLQUOTE:([^]+?)\]\]\s*<\/p>/g,
    (_match, text: string) => `<PullQuote text="${escapeForAttribute(text.trim())}" />`,
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
      const baseSrc = figure.src;
      const darkSrc = baseSrc.endsWith(".svg")
        ? baseSrc.replace(/\.svg$/u, ".dark.svg")
        : `${baseSrc}.dark`;
      const alt = escapeForAttribute(figure.alt);
      return `\n<figure class="my-12 flex justify-center">\n  <img src="${baseSrc}" alt="${alt}" loading="lazy" decoding="async" class="diagram-light w-full ${maxWidth}" />\n  <img src="${darkSrc}" alt="${alt}" loading="lazy" decoding="async" class="diagram-dark w-full ${maxWidth}" />\n</figure>\n`;
    },
  );

  // Normalize flushright blocks to the essay's existing styling.
  output = output.replaceAll(
    /<div class="flushright">\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g,
    (_match, inner: string) =>
      `<p class="text-right text-sm text-twilight -mt-4 mb-8">${inner.trim()}</p>`,
  );

  return output;
};

const inlineFootnotesAsSidenotes = (
  html: string,
  offset: number,
): { html: string; count: number } => {
  const asideMatch = html.match(
    /<aside id="footnotes" class="footnotes footnotes-end-of-document" role="doc-endnotes">[\s\S]*?<\/aside>/,
  );
  if (!asideMatch) return { html, count: 0 };

  const asideHtml = asideMatch[0];
  const items = [...asideHtml.matchAll(/<li id="fn(\d+)">([\s\S]*?)<\/li>/g)];
  const byIndex = new Map<number, string>();
  for (const item of items) {
    const n = Number(item[1]);
    let content = item[2];
    content = content.replaceAll(
      /<a href="#fnref\d+" class="footnote-back" role="doc-backlink">[\s\S]*?<\/a>/g,
      "",
    );
    content = content.trim();
    // Strip a single wrapping <p>…</p> if present.
    const paragraphMatch = content.match(/^<p>([\s\S]*?)<\/p>$/);
    if (paragraphMatch) content = paragraphMatch[1].trim();
    byIndex.set(n, content);
  }

  let withoutAside = html.replace(asideMatch[0], "").trim();

  const refRegex =
    /<a href="#fn(\d+)" class="footnote-ref" id="fnref\d+" role="doc-noteref"><sup>\d+<\/sup><\/a>/g;
  withoutAside = withoutAside.replaceAll(refRegex, (full: string, nRaw: string) => {
    const n = Number(nRaw);
    const content = byIndex.get(n);
    if (!content) return full;
    const id = offset + n;
    return `<Sidenote id={${id}}>${content}</Sidenote>`;
  });

  return { html: withoutAside, count: byIndex.size };
};

const sectionTemplate = (cfg: SectionConfig, bodyAstro: string): string => `---
	import ConstellationDivider from "../ConstellationDivider.astro";
	import PullQuote from "../PullQuote.astro";
	import NumberCallout from "../NumberCallout.astro";
	import ClosingVerse from "../ClosingVerse.astro";
	import Sidenote from "../Sidenote.astro";
	import ClaimMarker from "../ClaimMarker.astro";
---

<section id="${cfg.id}" class="prose mb-16">
  <header class="flex items-center justify-between mb-8">
    <h2 class="text-2xl tracking-wide m-0">${cfg.title}</h2>
    <img
      src="/svgs/glyphs/${cfg.glyph}.svg"
      alt=""
      class="w-10 h-10 opacity-80"
    />
  </header>

${bodyAstro.trim()}
</section>
`;

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
    const slice = docBody.slice(cur.start, next ? next.start - matches[i + 1]![0].length : docBody.length);
    sections.set(cur.title, slice.trim());
  }
  return sections;
};

const toAstroBody = (cfg: SectionConfig, sectionTexRaw: string, footnoteOffset: number) => {
  let sectionTex = sectionTexRaw.replaceAll("\\markboth{}{}", "").trim();

  if (cfg.startAt) {
    const idx = sectionTex.indexOf(cfg.startAt);
    if (idx === -1) {
      throw new Error(`Could not find startAt marker in section "${cfg.title}": ${cfg.startAt}`);
    }
    sectionTex = sectionTex.slice(idx);
  }

  // Normalize a few LaTeX-only layout commands.
  sectionTex = sectionTex
    .replaceAll(/\\vspace\{[^}]*\}/g, "")
    .replaceAll(/\\vfill/g, "")
    .replaceAll(/\\clearpage/g, "")
    .replaceAll(/\\hspace\{[^}]*\}/g, "");

  sectionTex = replaceHfillLinesWithFlushright(sectionTex);
  sectionTex = replaceCenterTikzBlocksWithFigures(sectionTex);

  // Macro tokens (we render these as Astro components after HTML conversion).
  sectionTex = sectionTex.replaceAll("\\constellationdivider", "\n\n[[DIVIDER]]\n\n");
  sectionTex = replaceSimpleMacroWithToken(sectionTex, "subhead", "SUBHEAD");
  sectionTex = replaceSimpleMacroWithToken(sectionTex, "numbercallout", "NUMBERCALLOUT");
  sectionTex = replaceSimpleMacroWithToken(sectionTex, "pullquote", "PULLQUOTE");
	sectionTex = replaceSimpleMacroWithToken(sectionTex, "closingverse", "CLOSINGVERSE");
	sectionTex = replaceInlineMacroWithToken(sectionTex, "vigilclaim", "CLAIM");
	sectionTex = replaceInlineMacroWithToken(sectionTex, "vigiltrail", "TRAIL");

	const html = runPandocLatexToHtml(sectionTex);
	let astro = replaceTokensToAstroBlocks(html);

  const inlined = inlineFootnotesAsSidenotes(astro, footnoteOffset);
  astro = inlined.html;

  // Remove empty paragraphs introduced by conversions.
  astro = astro.replaceAll(/<p>\s*<\/p>/g, "");

  return { astro, footnoteCount: inlined.count };
};

const main = () => {
  const repoRoot = process.cwd();
  const sourcePath = path.join(repoRoot, "docs/constellations.tex");
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

    let bodyAstro = converted.astro;

    if (cfg.id === "inheritance") {
      // Preserve the web version's nicer opening epigraph styling.
      bodyAstro = `
<blockquote class="text-center max-w-lg mx-auto mb-8 not-italic">
  <p class="text-base italic text-ink-indigo leading-relaxed">
    Human knowledge is never contained in one person. It grows from the
    relationships we create between each other and the world, and still it
    is never complete.
  </p>
  <footer class="text-sm text-twilight mt-4">
    —Paul Kalanithi, <em>When Breath Becomes Air</em>
  </footer>
</blockquote>

${bodyAstro}
`;
    }

    const outPath = path.join(repoRoot, cfg.outFile);
    writeFileSync(outPath, sectionTemplate(cfg, bodyAstro), "utf8");
  }

  // eslint-disable-next-line no-console
  console.log(`Synced essay sections from ${path.relative(repoRoot, sourcePath)}.`);
};

main();
