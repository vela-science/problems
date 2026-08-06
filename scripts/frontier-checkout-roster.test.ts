import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { frontierRegistry } from "../packages/frontier-data/src/registry";

/*
  The composite checkout action names four repositories and four paths. The
  registry names the same four, as `remote` and `directory`, and everything
  downstream of the checkout reads them from there.

  So the roster is written twice. Consolidating the two workflow copies into
  the action was the right move and its description then claimed the roster
  "is written here once", which was not true the moment it was written: the
  registry had already been declaring it. A composite action cannot loop
  `uses:` steps, and replacing the SHA-pinned `actions/checkout` with a raw
  `git clone` would trade a supply-chain property for tidiness. What it can do
  is stop the copy from drifting, which is all the duplication actually costs.

  The registry is the declaration. This holds the action to it, so adding a
  fifth Frontier to `registry.ts` reddens here until the action agrees, and no
  edit to either file can leave the projection reading a directory CI never
  checked out.
*/

const ACTION = resolve(import.meta.dirname, "../.github/actions/checkout-frontiers/action.yml");

/** One `with:` value per step, in file order. Steps here carry no anchors or
 *  block scalars, so a line match is exact for them. */
function values(document: string, key: string): string[] {
  return document
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith(`${key}:`))
    .map((line) => line.slice(key.length + 1).trim());
}

describe("canonical Frontier checkout roster", () => {
  const action = readFileSync(ACTION, "utf8");

  const expected = frontierRegistry.frontiers.map(({ remote, directory }) => ({
    repository: new URL(remote).pathname.replace(/^\//u, "").replace(/\.git$/u, ""),
    path: `sources/${directory}`,
  }));

  test("checks out exactly the repositories the registry declares", () => {
    const checkedOut = values(action, "repository").map((repository, index) => ({
      repository,
      path: values(action, "path")[index],
    }));
    expect(checkedOut.toSorted((a, b) => a.path.localeCompare(b.path))).toEqual(
      expected.toSorted((a, b) => a.path.localeCompare(b.path)),
    );
  });

  test("checks each one out at full depth", () => {
    // The projection reads Git history to bind records to commits; a shallow
    // clone produces a projection that is wrong rather than one that fails.
    const depths = values(action, "fetch-depth");
    expect(depths).toEqual(expected.map(() => "0"));
  });
});
