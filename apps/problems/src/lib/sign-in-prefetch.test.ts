import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function sources(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith(".tsx") && !path.includes(".test.") ? [path] : [];
  });
}

/* Every link to /sign-in has to opt out of prefetching.
 *
 * `/sign-in` is not a page. It is a route handler that mints a PKCE verifier,
 * sets it as a short-lived cookie, and redirects to WorkOS. Next prefetches a
 * `<Link>` on hover and on viewport entry, so a prefetched sign-in link runs
 * that handler without anyone clicking: it burns an authorize request, logs a
 * CORS failure when the browser refuses the cross-origin RSC fetch, and — the
 * part that actually breaks people — overwrites the verifier cookie belonging
 * to a sign-in already in flight. The callback then fails PKCE, and the reader
 * sees a login that simply does not work.
 *
 * Two links carried `prefetch={false}` with a comment explaining why; two
 * others, added later, did not. This is the guard that keeps the next one
 * honest. */
describe("sign-in links", () => {
  it("never prefetch the route handler that mints a PKCE verifier", () => {
    const offenders: string[] = [];
    const root = resolve(process.cwd(), "src");
    for (const file of [...sources(join(root, "app")), ...sources(join(root, "components"))]) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/<Link\b[^>]*href=\{?["'`][^"'`]*\/sign-in[^>]*>/gu)) {
        if (!match[0].includes("prefetch={false}")) offenders.push(`${file}: ${match[0].slice(0, 90)}`);
      }
      /* The header control splits its props across lines, so check that
         separately: any file naming /sign-in in a Link must also say so. */
      if (/href=\{?["'`]\/sign-in/u.test(text) && !text.includes("prefetch={false}")) {
        offenders.push(`${file}: links to /sign-in with no prefetch={false} anywhere`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
