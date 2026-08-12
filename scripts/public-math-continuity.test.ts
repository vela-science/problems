import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const currentSurfaces = [
  "packages/observatory-data/src/registry.ts",
  "packages/observatory-data/src/index.ts",
  "packages/observatory-data/scripts/projection-builder.mjs",
  "packages/observatory-data/config/result-dossiers.v1.json",
  "packages/observatory-data/config/source-local-research-blocks.v1.json",
  ".github/workflows/mirror-replicas.yml",
  "docs/WEB.md",
  "apps/www/scripts/sync-vela-docs.mjs",
  "apps/www/src/content/docs/manifest.json",
  "apps/www/src/data/protocol-facts.ts",
  "apps/www/src/data/home-story.ts",
  "apps/www/src/components/home/start-building.tsx",
  "apps/observatory/src/components/vela/clone-menu.tsx",
  "apps/observatory/src/components/vela/repository-context.tsx",
  "apps/observatory/src/app/repositories/[slug]/reproduce/page.tsx",
] as const;

const documents = currentSurfaces.map((path) => ({
  path,
  body: readFileSync(resolve(import.meta.dirname, "..", path), "utf8"),
}));

describe("public Math continuity boundary", () => {
  test("publishes only the canonical GitHub Math locator", () => {
    for (const { path, body } of documents) {
      expect(body, path).not.toContain("codeberg.org/vela-science/math");
    }
    const registry = readFileSync(
      resolve(import.meta.dirname, "../packages/observatory-data/src/registry.ts"),
      "utf8",
    );
    expect(registry).toContain('access: "public"');
    expect(registry).toContain('remotes: ["https://github.com/vela-science/math.git"]');
  });

  test("publishes anonymous Git acquisition and no dedicated Math credential", () => {
    const joined = documents.map(({ body }) => body).join("\n");
    expect(joined).toContain("git clone https://github.com/vela-science/math.git");
    expect(joined).not.toContain("VELA_MATH_READ_TOKEN");
    expect(joined).not.toContain("gh repo clone vela-science/math");
    expect(joined).not.toContain("Canonical Math custody is currently private");
    expect(joined).not.toContain("Exact source custody is private");
    expect(joined).not.toContain("vela-science/math private repository");
    expect(joined).toContain("public_exact_locator");
  });

  test("does not describe the pinned continuity document as the current topology", () => {
    const sync = readFileSync(
      resolve(import.meta.dirname, "../apps/www/scripts/sync-vela-docs.mjs"),
      "utf8",
    );
    expect(sync).toContain("provider topology at v0.972.1");
    expect(sync).not.toContain("public Math replica and anonymous-retrieval claims that were withdrawn");
  });
});
