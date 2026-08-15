import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  repositoryCheckoutCommand,
  repositoryRegistry,
} from "../packages/projection-data/src/registry";

const currentSurfaces = [
  "packages/projection-data/src/registry.ts",
  "packages/projection-data/src/index.ts",
  "packages/projection-data/scripts/projection-builder.mjs",
  ".github/workflows/mirror-replicas.yml",
  "docs/WEB.md",
  "apps/problems/src/components/vela/clone-menu.tsx",
  "apps/problems/src/components/vela/repository-context.tsx",
  "apps/problems/src/app/repositories/[slug]/reproduce/page.tsx",
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
      resolve(import.meta.dirname, "../packages/projection-data/src/registry.ts"),
      "utf8",
    );
    expect(registry).toContain('access: "public"');
    expect(registry).toContain('remotes: ["https://github.com/vela-science/math.git"]');
  });

  test("publishes anonymous Git acquisition and no dedicated Math credential", () => {
    const joined = documents.map(({ body }) => body).join("\n");
    const math = repositoryRegistry.repositories.find(({ slug }) => slug === "math");
    expect(math).toBeDefined();
    expect(repositoryCheckoutCommand(math!)).toBe(
      "git clone https://github.com/vela-science/math.git",
    );
    expect(joined).not.toContain("VELA_MATH_READ_TOKEN");
    expect(joined).not.toContain("gh repo clone vela-science/math");
    expect(joined).not.toContain("Canonical Math custody is currently private");
    expect(joined).not.toContain("Exact source custody is private");
    expect(joined).not.toContain("vela-science/math private repository");
  });
});
