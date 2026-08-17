import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  claimsForRepository,
  projectionManifest,
  projectionRelease,
  searchRead,
} from "../src/index";
import { repositoryRegistry, primaryRemote, slugForRepositoryId } from "../src/registry";
import {
  velaGeneratorBinaryRoots,
  velaReadableVersions,
  velaRelease,
} from "../src/release";

/* The manifest names repositories; the reads take the handle a URL carries.
   Falling back to the id keeps a failure legible: an unregistered repository
   then fails on the read rather than on an undefined handle here. */
function handleFor(repositoryId: string): string {
  return slugForRepositoryId(repositoryId) ?? repositoryId;
}

const hasDatabase = Boolean(process.env.VELA_PROJECTION_DATABASE_URL);
if (process.env.VELA_REQUIRE_PROJECTION_TESTS === "1" && !hasDatabase) {
  throw new Error("projection integration tests require VELA_PROJECTION_DATABASE_URL");
}
const describeProjection = hasDatabase ? describe : describe.skip;

describe("typed repository registry and canonical compact repository", () => {
  test("pins the released Vela contract and unique repository slugs", () => {
    expect(repositoryRegistry.required_vela_version).toBe(`vela ${velaRelease.version}`);
    expect(new Set(repositoryRegistry.repositories.map(({ slug }) => slug)).size).toBe(repositoryRegistry.repositories.length);
    expect(repositoryRegistry.repositories.map(({ slug, repository_id }) => ({ slug, repository_id }))).toEqual([
      { slug: "math", repository_id: "3d012325-3768-4b95-a385-c94e9f2a57a6" },
    ]);
  });

  /* VELA_REPOSITORIES_ROOT first, sibling layout only as the local-dev fallback.
     The sibling path is where the Repositories sit on a developer's machine and
     nowhere else. The direct release supplies its exact acquired root, so
     `skipIf` cannot silence the retained-manifest assertion there. */
  const repositoriesRoot = process.env.VELA_REPOSITORIES_ROOT;
  const mathRepository = resolve(
    repositoriesRoot ?? resolve(import.meta.dirname, "../../../.."),
    "math/.vela/repository.json",
  );
  /* The corpus is empty and that is the current truth: the mathematics
     repository was re-issued with a fresh genesis rather than by bulk-importing
     a retired repository's accepted rows, so it holds no Claim until one is
     admitted on evidence. What this protects is shape, not volume — every
     assertion below holds vacuously at zero and starts biting the moment the
     first Decision lands. */
  test.skipIf(!existsSync(mathRepository))("retains a rooted Claim corpus whose paths derive from their roots", () => {
    const repository = JSON.parse(readFileSync(mathRepository, "utf8"));
    expect(repository.schema).toBe("vela.repository.v4");
    const claims = [...repository.accepted_claims, ...repository.pending_claims];
    expect(new Set(claims.map(({ claim_id }: { claim_id: string }) => claim_id)).size)
      .toBe(claims.length);
    expect(repository.accepted_claims.every(
      ({ standing }: { standing: string }) => standing === "accepted",
    )).toBe(true);
    expect(repository.pending_claims.every(
      ({ standing }: { standing: string }) => standing === "pending_review",
    )).toBe(true);
    expect(claims.every(
      ({ claim_root, path }: { claim_root: string; path: string }) => (
        path === `records/claims/sha256/${claim_root.slice(7)}.json`
      ),
    )).toBe(true);
  });
});

describeProjection("Neon Problems projection", () => {
  test("binds repository tips to the checked Vela release", async () => {
    const [release, manifest] = await Promise.all([projectionRelease(), projectionManifest()]);
    /* Readable, not equal. The active projection legitimately lags the pinned
       release between the commit that bumps the pin and the refresh that
       regenerates against it, and asserting equality here is one of the checks
       that deadlocked the 0.966.3 bump. */
    expect(velaReadableVersions).toContain(manifest.vela_version);
    expect(velaGeneratorBinaryRoots.has(manifest.vela_binary_sha256)).toBe(true);
    expect(manifest.source_repositories).toHaveLength(repositoryRegistry.repositories.length);
    for (const source of repositoryRegistry.repositories) {
      const repository = release.repositories.find((candidate) => candidate.slug === handleFor(source.repository_id));
      /* The published `source_remote` is one URL and the registry now declares
         an ordered list, so this compares against the locator a reader is
         shown. It must also be a declared one — a published locator nobody
         declares is how a reader gets sent somewhere the projection was not
         built from. */
      expect(repository?.source.remote).toBe(primaryRemote(source));
      expect(source.remotes).toContain(repository?.source.remote);
      expect(repository?.source.commit).toMatch(/^[0-9a-f]{40}$/u);
      expect(repository?.status.roots.repository).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(repository?.status.roots.origin).toMatch(/^sha256:[0-9a-f]{64}$/u);
    }
  });

  /* Every published repository, not one named one. */
  test("the release agrees with its manifest for every published repository", async () => {
    const [release, manifest] = await Promise.all([
      projectionRelease(),
      projectionManifest(),
    ]);
    expect(release.repositories.length).toBeGreaterThan(0);
    for (const repository of release.repositories) {
      const declared = manifest.source_repositories.find((entry) => handleFor(entry.repository_id) === repository.slug);
      expect(declared, `${repository.slug} is published without a manifest entry`).toBeDefined();
      const claims = await claimsForRepository(repository.slug, { limit: 1 });
      const currentClaimCount = claims.facets.standing
        .filter(({ value }) => value === "accepted" || value === "unassessed")
        .reduce((total, { count }) => total + count, 0);
      expect(currentClaimCount).toBe(declared!.claim_count);
      expect(repository.graph).toMatchObject({
        node_count: declared!.graph_node_count,
        edge_count: declared!.graph_edge_count,
        problem_count: declared!.problem_count,
        claim_count: declared!.graph_claim_count,
      });
      expect(repository.status.counts.claims).toBe(declared!.claim_count);
      expect(repository.status.counts.accepted_claims).toBe(declared!.accepted_claim_count);
      expect(repository.status.counts.pending_claims).toBe(declared!.pending_claim_count);
      expect(repository.status.integrity.blocker_count).toBe(0);

      expect(repository).not.toHaveProperty("offers");
      expect(repository).not.toHaveProperty("work");
    }
  });

  /* The query comes from the projection rather than from the corpus this
     release happens to hold. Asking for the literal "erdos" tested the epoch,
     not the search: it returned nothing the moment the published repository
     changed, while the indexing it exists to check was working perfectly. */
  test("queries normalized rooted search documents", async () => {
    const [manifest, release] = await Promise.all([
      projectionManifest(),
      projectionRelease(),
    ]);
    const published = release.repositories[0];
    expect(published).toBeDefined();
    const search = await searchRead({ root: manifest.release_root, q: published!.slug, limit: 250 });
    expect(search.records.length).toBeGreaterThan(0);
    expect(new Set(search.records.map((record) => record.href)).size).toBe(search.records.length);
    expect(search.records.every((record) => record.href.startsWith("/"))).toBe(true);
  });
});
