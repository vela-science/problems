import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

/* Every var(--x) must resolve. A custom property that is never defined makes
   its whole declaration invalid at computed-value time, so the declaration is
   dropped and the previous cascade winner paints instead. That failure is
   silent: no build error, no console warning, no visual placeholder. It is how
   the night masthead's Problems link rendered at about 1.3:1 and how every
   publication-shelf heading fell back to the sans face.

   Three ways a reference resolves:
     1. a CSS definition anywhere in the scanned surface (--x: value)
     2. an explicit fallback at the use site (var(--x, fallback))
     3. a runtime write from script (element.style.setProperty("--x", ...))
        or an inline style attribute in a template

   Case 3 is detected rather than allowlisted so scroll-driven properties like
   --rail-progress and --wake-progress do not need hand maintenance. */

/* The three extensions the scanned surface actually has. `astro` and `mdx` were
   here too, and both matched nothing: www was Astro before the move to Next,
   and no MDX was ever authored. An extension that matches no file cannot be
   wrong out loud — it just quietly widens what this claims to cover. */
const styleExtensions = /\.(?:css|tsx|ts)$/u;
/* The optional quote before the colon catches JSX style objects, where the
   property is written style={{ "--sidebar-width": WIDTH }}. */
const definition = /(--[A-Za-z0-9_-]+)["'`]?\s*:/gu;
const reference = /var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/gu;
const runtimeWrite = /setProperty\(\s*["'`](--[A-Za-z0-9_-]+)["'`]/gu;

const scanned = [
  "packages/brand/generated",
  "packages/ui/src",
  "apps/problems/src",
];

/* Properties injected by a dependency rather than defined in our source.
   Keep this list short and cite the injector for each entry. */
const external = new Set([
  "--font-geist-sans", // geist/font/sans, applied via GeistSans.variable
  "--font-geist-mono", // geist/font/mono, applied via GeistMono.variable
  // Tailwind's own container scale, emitted by `@import "tailwindcss"`.
  // Tailwind Plus Protocol centres its prose against it; this gate reads
  // source rather than the generated stylesheet, so it cannot see it.
  "--container-lg",
]);

function filesBelow(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function repositoryPath(repository, path) {
  return relative(repository, path).split(sep).join("/");
}

export function inspectTokenReferences(repository) {
  const defined = new Set();
  const references = [];

  for (const directory of scanned) {
    for (const path of filesBelow(resolve(repository, directory))) {
      if (!styleExtensions.test(path)) continue;
      const file = repositoryPath(repository, path);
      const content = readFileSync(path, "utf8");

      for (const match of content.matchAll(definition)) defined.add(match[1]);
      for (const match of content.matchAll(runtimeWrite)) defined.add(match[1]);

      const lines = content.split("\n");
      for (const [index, line] of lines.entries()) {
        for (const match of line.matchAll(reference)) {
          references.push({ file, line: index + 1, name: match[1], guarded: match[2] === "," });
        }
      }
    }
  }

  const unresolved = references.filter(
    (entry) => !entry.guarded && !defined.has(entry.name) && !external.has(entry.name),
  );

  return {
    schema: "vela.token-references.v1",
    defined: defined.size,
    referenced: new Set(references.map((entry) => entry.name)).size,
    unresolved,
  };
}

export function assertTokenReferences(repository) {
  const report = inspectTokenReferences(repository);
  if (report.unresolved.length) {
    const detail = report.unresolved
      .map((entry) => `  ${entry.file}:${entry.line}  var(${entry.name})`)
      .join("\n");
    throw new Error(
      `${report.unresolved.length} unresolved custom property reference(s).\n` +
        `${detail}\n` +
        "Define the property, give the use site a fallback, or write it from script.",
    );
  }
  return { ...report, ok: true };
}
