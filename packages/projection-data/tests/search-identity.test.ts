import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(packageRoot, path), "utf8");

/* The public search body is served `immutable` for a year, keyed on a root
 * derived from the projection and the supplemental collection — neither of
 * which moves when the *shape* of the response changes. The salt in
 * `compositeSearchRoot` is what makes a changed body a changed key.
 *
 * It was missed once, and the failure is invisible from the server: the API
 * served the new shape correctly while every browser that had searched before
 * the deploy kept the old one, with no revalidation for a year. Only opening
 * production in a browser that had used the old build showed it.
 *
 * So the two are pinned together. Change `SiteSearchRecord` and this test fails
 * until the identity version changes with it. */
const FIELDS = [
  "kind",
  "repository",
  "id",
  "assertion",
  "source_title",
  "standing",
  "source_status",
  "result_standing",
  "formal_statement",
  "href",
];
const IDENTITY = "site.composite-search-identity.v4";

function recordFields(): string[] {
  const source = read("src/search.ts");
  const body = source.slice(
    source.indexOf("export interface SiteSearchRecord {"),
    source.indexOf("export interface SiteSearchIndex"),
  ).replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "");
  return [...body.matchAll(/^\s{2}([a-z_]+)\??:/gmu)].map(([, name]) => name);
}

describe("public search response identity", () => {
  test("pins the record's fields to the cache-key salt", () => {
    expect(recordFields()).toEqual(FIELDS);
    expect(read("src/formal-conjectures-collection.ts")).toContain(`schema: "${IDENTITY}"`);
  });

  /* The salt only works if it is inside the hashed object. A version constant
     sitting beside the hash would read as protection and provide none. */
  test("hashes the salt rather than declaring it nearby", () => {
    const source = read("src/formal-conjectures-collection.ts");
    const fn = source.slice(source.indexOf("export function compositeSearchRoot"));
    const hashed = fn.slice(fn.indexOf("canonicalJson({"), fn.indexOf("}));"));
    expect(hashed).toContain(IDENTITY);
    expect(hashed).toContain("projection_root");
  });
});
