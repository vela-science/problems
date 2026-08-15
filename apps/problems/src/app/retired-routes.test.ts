import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

/* Durable URLs are a product rule: every path that was ever published keeps
 * resolving to the right record. A permanent redirect satisfies that; deleting
 * a route does not.
 *
 * These rules live in vercel.json, which is edge configuration — the dev server
 * never applies it, so nothing in local verification or in the runtime smoke
 * test would notice one going missing. This is the only thing that would.
 *
 * The root, Problems, and Work routes are live product pages again. Retired
 * record-taxonomy aliases remain redirects, while the Problems-first product
 * model owns its current URLs directly. */

type Redirect = {
  source: string;
  destination: string;
  permanent?: boolean;
  has?: Array<{ type: string; value: string }>;
};

const config = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../vercel.json"), "utf8"),
) as { redirects: Redirect[] };

const RETIRED: Array<[source: string, destination: string]> = [
  ["/repositories/erdos/:path*", "/repositories"],
  ["/repositories/sidon-sets/:path*", "/repositories"],
  ["/repositories/formal-conjectures/:path*", "/repositories"],
  ["/repositories/quantum-codes/:path*", "/repositories"],
  ["/repositories/erdos", "/repositories"],
  ["/repositories/sidon-sets", "/repositories"],
  ["/repositories/formal-conjectures", "/repositories"],
  ["/repositories/quantum-codes", "/repositories"],
  ["/review", "/proposals"],
  ["/runs", "/decisions"],
  ["/build-week", "/repositories"],
  ["/repositories/:slug/findings", "/repositories/:slug/claims"],
  ["/repositories/:slug/findings/:id*", "/repositories/:slug/claims/:id*"],
  ["/repositories/:slug/work", "/repositories/:slug/contribute"],
  ["/targets", "/work"],
  ["/repositories/:slug/targets", "/repositories/:slug/contribute"],
  ["/repositories/:slug/review", "/repositories/:slug/proposals"],
];

describe("retired routes", () => {
  test.each(RETIRED)("%s permanently redirects to %s", (source, destination) => {
    const rule = config.redirects.find((entry) => entry.source === source);
    expect(rule, `vercel.json lost the redirect for ${source}`).toBeDefined();
    expect(rule!.destination).toBe(destination);
    expect(rule!.permanent).toBe(true);
  });

  test("no retired path still has a page implementation", () => {
    /* A route that both redirects and renders is ambiguous: the edge rule wins
       on a cold request and the page wins on client-side navigation. */
    const app = resolve(import.meta.dirname, ".");
    const shadowed = ["review", "runs", "build-week", "sign-out", "targets"]
      .filter((segment) => existsSync(resolve(app, segment)));
    const repositoryTargets = existsSync(resolve(app, "repositories/[slug]/targets"));
    if (repositoryTargets) shadowed.push("repositories/[slug]/targets");
    expect(shadowed, `delete ${shadowed.join(", ")} — each is superseded by a redirect`).toEqual([]);
  });

  test("the Problems-first product routes render directly", () => {
    for (const route of ["/", "/problems", "/work"]) {
      expect(config.redirects.find((entry) => entry.source === route)).toBeUndefined();
    }
    const page = readFileSync(resolve(import.meta.dirname, "page.tsx"), "utf8");
    expect(page).not.toContain("permanentRedirect");
    expect(page).toContain("Problems.science");
    expect(page).toContain("Find a scientific Problem");
  });

});
