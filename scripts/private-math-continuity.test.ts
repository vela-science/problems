import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const currentSurfaces = [
  "packages/observatory-data/src/registry.ts",
  "packages/observatory-data/src/index.ts",
  "packages/observatory-data/scripts/projection-builder.mjs",
  "packages/observatory-data/config/result-dossiers.v1.json",
  ".github/workflows/mirror-replicas.yml",
  "docs/WEB.md",
  "apps/www/scripts/sync-vela-docs.mjs",
  "apps/www/src/content/docs/manifest.json",
  "apps/www/src/data/protocol-facts.ts",
  "apps/www/src/data/home-story.ts",
  "apps/www/src/app/developers/page.tsx",
  "apps/www/src/components/home/start-building.tsx",
  "apps/observatory/src/components/vela/clone-menu.tsx",
  "apps/observatory/src/components/vela/repository-context.tsx",
  "apps/observatory/src/app/repositories/[slug]/reproduce/page.tsx",
] as const;

const documents = currentSurfaces.map((path) => ({
  path,
  body: readFileSync(resolve(import.meta.dirname, "..", path), "utf8"),
}));

describe("private Math continuity boundary", () => {
  test("publishes no Codeberg Math locator on current runtime or operator surfaces", () => {
    for (const { path, body } of documents) {
      expect(body, path).not.toContain("codeberg.org/vela-science/math");
    }
  });

  test("publishes no anonymous canonical Math clone recipe", () => {
    for (const { path, body } of documents) {
      expect(body, path).not.toMatch(
        /git clone https:\/\/github\.com\/vela-science\/math(?:\.git)?/u,
      );
    }
    const commands = readFileSync(
      resolve(import.meta.dirname, "../apps/www/src/data/protocol-facts.ts"),
      "utf8",
    );
    expect(commands).toContain("repositoryCheckoutCommand(published)");
  });
});
