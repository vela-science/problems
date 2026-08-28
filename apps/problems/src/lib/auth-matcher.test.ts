import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const proxySource = readFileSync("src/proxy.ts", "utf8");

/* Every page and route handler that reads the hosted session. */
const SESSION_READERS = /\b(currentAccount|currentActivityAccount)\b/u;

function entryPoints(directory: string, found: string[] = []): string[] {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) entryPoints(path, found);
    else if (name === "page.tsx" || name === "route.ts") found.push(path);
  }
  return found;
}

/* `src/app/codebases/[id]/page.tsx` -> `/codebases/x`. Route groups drop out,
   dynamic segments become a concrete value, and a catch-all becomes one. */
function routeFor(path: string): string {
  const segments = path
    .replace(/^src\/app\/?/u, "")
    .replace(/\/(page\.tsx|route\.ts)$/u, "")
    .split("/")
    .filter((segment) => segment && !/^\(.*\)$/u.test(segment))
    .map((segment) => (/^\[.*\]$/u.test(segment) ? "x" : segment));
  return `/${segments.join("/")}`;
}

/* A Next matcher entry, as a regular expression. `:name*` matches zero or more
   trailing segments; `:name` matches exactly one. */
function matches(pattern: string, route: string): boolean {
  const source = pattern
    .split("/")
    .filter(Boolean)
    .map((segment) => (segment.endsWith("*") ? "(?:/.+)?" : segment.startsWith(":") ? "/[^/]+" : `/${segment}`))
    .join("");
  return new RegExp(`^${source}$`, "u").test(route);
}

const matcher = [...proxySource.matchAll(/^\s{4}"(\/[^"]*)",$/gmu)].map(([, entry]) => entry);

describe("auth proxy matcher", () => {
  /* Derived, not listed.
   *
   * The matcher used to be checked against a hand-written list of paths that
   * were expected to be in it, which can only catch a removal. It cannot catch
   * an addition — a new page that reads a session and is not covered renders,
   * then throws out of `withAuth`, and the reader gets a 500 where the page's
   * own code says redirect. `/api/work` was in exactly that state and had been
   * answering 500 in production; `/watching` joined it the day it was written.
   *
   * So the requirement is read off the app tree instead: whatever reads a
   * session must be covered, and adding a route cannot escape it. */
  it("covers every page and route that reads a session", () => {
    expect(matcher.length).toBeGreaterThan(5);
    const uncovered = entryPoints("src/app")
      .filter((path) => SESSION_READERS.test(readFileSync(path, "utf8")))
      .map((path) => ({ path, route: routeFor(path) }))
      .filter(({ route }) => !matcher.some((pattern) => matches(pattern, route)))
      .map(({ path, route }) => `${route} (${path})`);
    expect(uncovered).toEqual([]);
  });

  /* The matcher stays exact. A broad prefix makes nonexistent descendants pay
     the WorkOS proxy cost and hides which routes may call `withAuth`. */
  it("declares no broad catch-all over an entire section", () => {
    for (const broad of ["/p/:path*", "/auth/:path*", "/drafts/:path*", "/:path*", "/problems/:path*"]) {
      expect(matcher).not.toContain(broad);
    }
  });
});
