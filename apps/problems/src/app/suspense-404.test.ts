import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

/* A `loading.tsx` above a segment that renders unknown params is a live 404
 * regression, and it has now been introduced twice.
 *
 * The boundary that file creates lets the shell flush, which commits the
 * response as 200. A later `notFound()` can then only stream 404 *UI* into a
 * 200, so a nonexistent Claim, Problem or Source answers 200 to a crawler, a
 * link checker, and anything else reading the status line. Where a segment
 * declares `dynamicParams = false` the router rejects the param before
 * rendering, so the same file is harmless there.
 *
 * `dynamicParams = true` was the original signal, and it was too narrow: it
 * misses every page that reaches `notFound()` at request time without
 * declaring it. Four do — `problems/[namespace]/[problem]`,
 * `sources/[id]`, `codebases/[id]` and `repositories/[slug]/commits/compare`
 * are all `force-dynamic` — and `repositories/[slug]/problems` declares no
 * config at all, so it inherits the same default. The rule is therefore what
 * the page *does*: calling `notFound()` is the hazard, and only an explicit
 * `dynamicParams = false` retires it.
 *
 * `check:runtime` catches this by booting the server and reading the status,
 * which is the real proof; it runs in CI and takes a minute. This test states
 * the rule where someone restoring a deleted file will read it in a second. */

const app = resolve(import.meta.dirname);

async function segments(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const child = join(directory, entry.name);
    found.push(child, ...(await segments(child)));
  }
  return found;
}

async function has(directory: string, file: string): Promise<boolean> {
  try {
    await readFile(join(directory, file), "utf8");
    return true;
  } catch {
    return false;
  }
}

async function rendersUnknownParams(directory: string): Promise<boolean> {
  try {
    const page = await readFile(join(directory, "page.tsx"), "utf8");
    if (/dynamicParams\s*=\s*false/u.test(page)) return false;
    return /dynamicParams\s*=\s*true/u.test(page) || /\bnotFound\s*\(\s*\)/u.test(page);
  } catch {
    return false;
  }
}

describe("route segments that render unknown params", () => {
  it("carry no Suspense boundary above them", async () => {
    const all = [app, ...(await segments(app))];
    const open = await Promise.all(
      all.map(async (directory) => ((await rendersUnknownParams(directory)) ? directory : null)),
    );
    const offenders: string[] = [];
    for (const directory of open.filter((entry): entry is string => Boolean(entry))) {
      let cursor = directory;
      while (cursor.startsWith(app)) {
        if (await has(cursor, "loading.tsx")) {
          offenders.push(
            `${relative(app, cursor) || "."}/loading.tsx commits 200 above ${relative(app, directory)}`,
          );
        }
        if (cursor === app) break;
        cursor = resolve(cursor, "..");
      }
    }
    expect(offenders).toEqual([]);
  });
});
