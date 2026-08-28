import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaDir = resolve(import.meta.dirname, "../schema");

/* The apply order is `schema.mjs`'s, which is `readdir().sort()`. Reproduced
   here rather than imported so that a change to the runner's ordering breaks
   this test instead of quietly redefining what "later" means. */
const fragments = readdirSync(schemaDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => ({ name, source: readFileSync(resolve(schemaDir, name), "utf8") }));

const definition = /CREATE (?:OR REPLACE )?FUNCTION\s+([a-z_]+\.[a-z_]+)\s*\(/gu;

describe("activity schema fragments", () => {
  /* A fragment is a statement of desired state, not a step in a history: every
     one of them is re-applied on every migrate, in filename order. So a function
     written in two fragments does not layer — the alphabetically later file
     wins, and the earlier definition is dead code that still reads as
     authoritative.
   *
     Three functions were in exactly that state. `get_problem_activity` and
     `list_workspaces` were each defined in `base.sql` and again in the fragment
     that took effect, and every line of `problem-workspaces.sql` was superseded
     by `workspace-contexts.sql` purely because "w" sorts after "p". Nothing
     reported it, and reading `base.sql` gave the wrong answer about what the
     database does. */
  test("define each function exactly once", () => {
    const homes = new Map<string, string[]>();
    for (const fragment of fragments) {
      for (const [, name] of fragment.source.matchAll(definition)) {
        homes.set(name, [...(homes.get(name) ?? []), fragment.name]);
      }
    }
    const duplicated = [...homes]
      .filter(([, files]) => files.length > 1)
      .map(([name, files]) => `${name} in ${files.join(" and ")}`);
    expect(duplicated).toEqual([]);
  });

  /* Every fragment runs as the owner and hands the app role execute on what it
     creates. `base.sql` grants across the whole schema, but it runs first, so
     that grant cannot reach a function a later fragment has not created yet:
     a fragment that forgets its own grant creates a function the application
     cannot call, and nothing fails until a page 500s. */
  test("grant execute on every API function they create", () => {
    for (const fragment of fragments.filter(({ name }) => name !== "base.sql")) {
      const created = [...fragment.source.matchAll(definition)]
        .map(([, name]) => name)
        .filter((name) => name.startsWith("activity_api."));
      if (!created.length) continue;
      /* Three spellings are in use and all three are fine: one GRANT per
         function, one GRANT naming several, and the schema-wide REVOKE. So this
         asserts the property rather than the syntax — every function the
         fragment creates is named in its grant section, and the section revokes
         from PUBLIC somewhere. `base.sql` grants across the whole schema, but it
         runs first, so its grant cannot reach a function a later fragment has
         not created yet: a fragment that forgets its own grant creates a
         function the application cannot call, and nothing fails until a page
         500s. PostgreSQL also grants EXECUTE to PUBLIC on a new function by
         default, which is why the revoke is not optional.
       *
         `live-proof.mjs` asserts the same property against the deployed
         database, where it is a fact rather than a reading of the source. */
      const grants = fragment.source.slice(fragment.source.indexOf("GRANT EXECUTE"));
      for (const name of created) {
        expect(`${fragment.name} grants ${name}: ${grants.includes(name)}`)
          .toBe(`${fragment.name} grants ${name}: true`);
      }
      expect(`${fragment.name} revokes from PUBLIC: ${/REVOKE ALL ON [\s\S]{0,400}?FROM\s+PUBLIC/u.test(fragment.source)}`)
        .toBe(`${fragment.name} revokes from PUBLIC: true`);
    }
  });

  /* The owner role is what makes a SECURITY DEFINER function safe to grant. */
  test("run as the owner role", () => {
    for (const fragment of fragments) {
      expect(`${fragment.name}: ${fragment.source.startsWith("SET LOCAL ROLE vela_activity_owner;")}`)
        .toBe(`${fragment.name}: true`);
    }
  });
});
