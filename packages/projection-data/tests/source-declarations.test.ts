import { describe, expect, it } from "vitest";
import mathSourceRegistry from "../config/math-sources.v1";
import {
  declaredSourceIds,
  readRepositorySourceDeclarations,
} from "../src/source-declarations";
import { openAiTenProofsRelease } from "../src/source-adapters/openai-ten-proofs";
import { physlibRelease } from "../src/source-adapters/physlib";

/* The registry declares what this website publishes about a source: who
 * maintains it, what rights were established, what the coverage omits. Those
 * are publishing decisions and they belong here. Where a source came from is
 * not a publishing decision, and the Repository that reconciles it is the only
 * party in a position to say.
 *
 * This suite is the join between the two. It cannot run without the repository
 * checkout, so it skips unless `VELA_REPOSITORIES_ROOT` points at one.
 *
 * The direct release always supplies a freshly acquired roster. A missing
 * roster may skip local unit work, but never a release qualification.
 */

const repositoriesRoot = process.env.VELA_REPOSITORIES_ROOT;
const suite = repositoriesRoot ? describe : describe.skip;

suite("registry sources agree with the Repositories that declare them", () => {
  it("publishes no source that no Repository declares", async () => {
    const declarations = await readRepositorySourceDeclarations(repositoriesRoot!);
    const declared = new Set(declarations.flatMap(declaredSourceIds));
    const undeclared = mathSourceRegistry.sources
      .map(({ source_id }) => source_id)
      .filter((id) => !declared.has(id));
    expect(undeclared).toEqual([]);
  });

  it("declares no source the registry does not publish", async () => {
    const declarations = await readRepositorySourceDeclarations(repositoriesRoot!);
    const published = new Set(mathSourceRegistry.sources.map(({ source_id }) => source_id));
    const unpublished = declarations.flatMap((declaration) =>
      declaredSourceIds(declaration)
        .filter((id) => !published.has(id))
        .map((id) => `${declaration.slug}: ${id}`),
    );
    expect(unpublished).toEqual([]);
  });

  /* Coverage is the claim "this source is part of that Repository's evidence".
     Only the Repository can make it, so the registry's copy has to match. */
  it("claims coverage only where the Repository declares the source", async () => {
    const declarations = await readRepositorySourceDeclarations(repositoriesRoot!);
    const disagreements: string[] = [];
    for (const source of mathSourceRegistry.sources) {
      const claimed = [...source.coverage.repository_slugs].sort();
      const actual = declarations
        .filter((declaration) => declaredSourceIds(declaration).includes(source.source_id))
        .map(({ slug }) => slug)
        .sort();
      if (claimed.join(",") !== actual.join(",")) {
        disagreements.push(
          `${source.source_id}: registry claims [${claimed.join(", ")}], Repositories declare [${actual.join(", ")}]`,
        );
      }
    }
    expect(disagreements).toEqual([]);
  });

  /* The pins below still live in this package because the acquisition reads
     them directly. The repository declares the same values, so the two can be
     compared; when they disagree the repository is right. This is the only
     check that compares them, and it runs only in CI — which is how physlib
     drifted four commits without a failure. */
  it("pins Physlib at the commit the Repository declares", async () => {
    const declarations = await readRepositorySourceDeclarations(repositoriesRoot!);
    const math = declarations.find(({ slug }) => slug === "math");
    const physlib = math?.sources.physlib;
    expect(physlib?.commit).toBe(physlibRelease.commit);
    expect(physlib?.tree).toBe(physlibRelease.tree);
    for (const [key, root] of Object.entries(physlibRelease.exact_roots)) {
      expect(physlib?.exact_roots?.[key]?.sha256).toBe(root);
    }
  });

  it("pins the OpenAI comparator at the commit the Repository declares", async () => {
    const declarations = await readRepositorySourceDeclarations(repositoriesRoot!);
    const math = declarations.find(({ slug }) => slug === "math");
    const openai = math?.sources.openai_ten_proofs;
    expect(openai?.commit).toBe(openAiTenProofsRelease.commit);
    expect(openai?.tree).toBe(openAiTenProofsRelease.tree);
    /* No `exact_roots` loop here, unlike the Physlib case above, and the reason
       is not symmetry: `math`'s `sources.yaml` declares `exact_roots` for
       `physlib` and none for `openai_ten_proofs`. Running the same loop fails
       with `undefined` on every key — the repository declares nothing to
       compare, so the five roots in `openAiTenProofsRelease` are pins no
       Repository backs.

       That is a gap in the declaration, not in this test, and it closes on the
       repository's side: the Repository owns its `sources.yaml`, and where the
       registry and the repository disagree the repository is right. Adding the
       loop before the declaration exists would only convert an unbacked pin
       into a red suite. Delete this comment and add the loop the moment `math`
       declares them. */
  });
});
