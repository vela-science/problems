import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MDX_PATH = path.resolve(import.meta.dirname, "../src/content/essays/constellations/index.mdx");
const LLMS_TXT_PATH = path.resolve(import.meta.dirname, "../public/llms.txt");
const LLMS_FULL_PATH = path.resolve(import.meta.dirname, "../public/llms-full.txt");

const readText = (filePath: string): string =>
  readFileSync(filePath, "utf8").replaceAll("\r\n", "\n");

const stripFrontmatter = (source: string): string =>
  source.replace(/^---\n[\s\S]*?\n---\n*/, "");

const cleanMdxForLlms = (source: string): string => {
  let clean = stripFrontmatter(source);

  clean = clean.replaceAll(/<section[^>]*>\n?/g, "");
  clean = clean.replaceAll(/<\/section>\n?/g, "\n");
  clean = clean.replaceAll(/<ConstellationDivider\s*\/>/g, "\n---\n");
  clean = clean.replaceAll(/<Figure[\s\S]*?caption="([^"]*)"[\s\S]*?\/>/g, "\n*$1*\n");
  clean = clean.replaceAll(/<Figure[\s\S]*?\/>/g, "");
  clean = clean.replaceAll(/<PullQuote[\s\S]*?text="([^"]*)"[\s\S]*?\/>/g, "\n> *$1*\n");
  clean = clean.replaceAll(/\\\.\.\./g, "...");
  clean = clean.replaceAll(/\n{3,}/g, "\n\n");
  clean = clean.trim();

  return `# Constellations of Borrowed Light

> Why science needs an operating system, not another assistant.

---

${clean}
`;
};

const generateLlmsTxt = (): string => `# Constellations of Borrowed Light

> Why science needs an operating system, not another assistant.

This is the founding document for the Borrowed Light project, proposing a scientific operating system with shared state, execution runtime, and open network protocols.

## Sections

- [The Inheritance](#the-inheritance): Knowledge exists, but it still fails to arrive
- [The Pattern](#the-pattern): Why papers are renderings and science needs a richer medium
- [The Foundation](#the-foundation): The missing stack beneath AI for science
- [The Constellation](#the-constellation): The shared scientific state and navigation layer
- [The Gigafactory](#the-gigafactory): The execution runtime that turns state back into contact with reality

## Links

- [Full Essay](https://borrowedlight.org): Read the canonical web version
- [Summary](https://borrowedlight.org/constellations-summary.md): Shareable key claims
- [Companion Notes](https://borrowedlight.org/constellations-companion.md): Supporting architecture and protocol notes
- [Protocol](https://borrowedlight.org/protocol): Technical specification

## Full Content

For complete essay text optimized for LLM context, see [/llms-full.txt](/llms-full.txt)
`;

const main = () => {
  const mdxSource = readText(MDX_PATH);
  const llmsFull = cleanMdxForLlms(mdxSource);

  writeFileSync(LLMS_FULL_PATH, llmsFull);
  writeFileSync(LLMS_TXT_PATH, generateLlmsTxt());

  console.log("Generated llms.txt files from MDX source.");
};

main();
