import { z } from "zod";
import { canonicalGitHubRepository } from "./git-remote";
import { velaRelease } from "./release";

const requiredVelaVersion = `vela ${velaRelease.version}` as const;

/* Lowercase canonical RFC 9562 UUIDv4 text, exactly matching Vela's current
 * repository_id wire schema. This is exported because status documents,
 * projection manifests, registry entries, and Source bindings all consume the
 * same protocol identity; separate regular expressions made the 0.972 change
 * four migrations instead of one. */
export const repositoryIdSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
);

/* The repositories this projection reads, as literals. The registry entries
 * below are checked against this list, and `math-sources.ts` builds its coverage
 * enum from it, so a second repository cannot be admitted by one file and
 * rejected by the other.
 *
 * There is one. Four repositories existed here until the four-boundary split,
 * and they existed because there were four topics rather than four authorities:
 * `erdos`, `sidon-sets`, `formal-conjectures` and `quantum-codes` were a single
 * authority's subject areas wearing repository identity. They are archived, and
 * a Repository is now derived and owns nothing, so the read boundary they were
 * standing in for is a query rather than a checkout. */
export const repositorySlugs = ["math"] as const;

const registrySchema = z.object({
  schema: z.literal("site.repository-sources.v4"),
  required_vela_version: z.literal(requiredVelaVersion),
  repositories: z.array(z.object({
    slug: z.enum(repositorySlugs),
    /* A Vela repository identity, not a Repository handle. */
    repository_id: repositoryIdSchema,
    directory: z.string(),
    branch: z.string().regex(/^[A-Za-z0-9._/-]+$/u),
    /* Whether an unauthenticated reader can acquire the canonical Git bytes.
     * This is operational access metadata, not a Vela authority property. */
    access: z.enum(["public", "private"]),
    /* Locators, ordered, and never fewer than one.
     *
     * `projection-builder.mjs` accepts only a locator declared here, so a
     * checkout from a similarly named or operator-supplied repository fails
     * before projection. Several locators remain supported by the schema, but
     * every one must match the current access policy and custody boundary.
     *
     * Identity is `repository_id`, derived from the canonical bytes of the
     * record it commits to. A host URL is a way to reach those bytes, so there
     * can be several and none of them is the repository. The first is the
     * canonical acquisition locator. Math currently has exactly one: its
     * public GitHub repository. The retired replica is intentionally not a
     * locator. */
    remotes: z.array(z.string().url()).nonempty(),
  })),
});

export const repositoryRegistry = registrySchema.parse({
  schema: "site.repository-sources.v4",
  required_vela_version: requiredVelaVersion,
  repositories: [
    {
      slug: "math",
      /* The current RFC 9562 UUIDv4 identity. Every re-genesis mints a new one;
         the three retired prefixed identities remain recoverable in the math
         repository's Git history, and the last Vela 0.971 generation has an
         exact signed bundle plus a rooted continuity inventory.

         The current lineage compactly re-authored the still-wanted 321 and 887
         scientific state. Old implementation history remains ordinary Git
         history, not a second readable protocol generation. */
      repository_id: "8138c6da-46c4-47ee-b493-5bbfbec09b1e",
      directory: "math",
      branch: "coh-00",
      access: "public",
      remotes: ["https://github.com/vela-science/math.git"],
    },
  ],
});

export type RepositoryRegistryEntry = (typeof repositoryRegistry.repositories)[number];

/* The one place a URL handle meets a protocol identity.
 *
 * The projection keys every table on `repository_id`, because that is what the
 * protocol names and what a row is actually about. `slug` is the handle a
 * reader types and a link carries, and it is a presentation fact with no
 * bearing on identity — so it lives here, in a versioned file, rather than in
 * thirteen primary keys where a repository that changed its handle would look
 * like a different repository.
 *
 * Both directions are total over the registry and partial over their inputs: an
 * unknown handle is a 404, not a lookup that invents an id. */
/* Typed `<string, string>` rather than inferred. The registry's `slug` is the
   literal union `"math"`, so an inferred key type would make these callable
   only with a handle already known to be valid — which is the opposite of the
   job: they exist to answer for a handle that arrived from a URL. */
const repositoryIdBySlug = new Map<string, string>(
  repositoryRegistry.repositories.map((entry) => [entry.slug, entry.repository_id]),
);
const slugByRepositoryId = new Map<string, string>(
  repositoryRegistry.repositories.map((entry) => [entry.repository_id, entry.slug]),
);

export function repositoryIdForSlug(slug: string): string | undefined {
  return repositoryIdBySlug.get(slug);
}

export function slugForRepositoryId(repositoryId: string): string | undefined {
  return slugByRepositoryId.get(repositoryId);
}

/* The handle a reader typed, as the key the projection stores it under.
 *
 * An unknown handle resolves to itself rather than throwing. It then matches no
 * row, so a bad slug stays the empty read every caller already renders as a
 * 404 — which is what these paths did before there was a lookup to fail. */
export function repositoryKey(slug: string): string {
  return repositoryIdForSlug(slug) ?? slug;
}

/* The locator to show a person: the first, by declaration order. Named rather
   than spelled `remotes[0]` at each call site, so that what "first" means lives
   in one place if the ordering ever earns a rule. */
export function primaryRemote(entry: RepositoryRegistryEntry): string {
  return entry.remotes[0];
}

/* A private locator must never be rendered as an anonymous `git clone` recipe.
 * `gh auth status` is deliberately part of the copied command: it makes the
 * access prerequisite executable and fails before acquisition when the caller
 * lacks authorization. No token is embedded in, printed by, or persisted by
 * this command. */
export function repositoryCheckoutCommand(entry: RepositoryRegistryEntry): string {
  const remote = primaryRemote(entry);
  if (entry.access === "public") return `git clone ${remote}`;
  const repository = canonicalGitHubRepository(remote);
  if (!repository) {
    throw new Error(`${entry.slug}: private repository checkout requires a declared GitHub locator`);
  }
  return `gh auth status\ngh repo clone ${repository}`;
}
