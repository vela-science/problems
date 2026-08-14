import { YAML } from "bun";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { repositoryRegistry } from "./registry";

/**
 * A Repository's own declaration of the sources it reconciles.
 *
 * Every source this product publishes is acquired from somewhere, and the
 * repository, revision, path and locator of that somewhere are facts about the
 * Repository, not about the website. Pins nevertheless live in this package
 * because the acquisition reads them directly: the Physlib commit, tree and
 * eight exact file roots in `source-adapters/physlib.ts`, the OpenAI comparator
 * commit in its own adapter, the formal-conjectures dataset locator in a
 * default argument, and the mapping from a Repository's own source keys to
 * registry ids in `erdosSourceLockDispositions` in `source-adapters/refresh.ts`.
 * Three of the four published Repositories once declared nothing at all, so for
 * them the website's copy was the only statement in existence and nothing
 * upstream could contradict it.
 *
 * Each Repository now carries `sources.yaml`, keyed exactly as its own
 * `sources.lock.json` is, with the registry `source_id` on each entry, and it
 * declares the same values this package pins. This module reads those
 * declarations so the conformance check can hold the registry to them and the
 * join test can hold the two copies together. When they disagree the Repository
 * is right.
 *
 * Parsing is Bun's `YAML`, which the Physlib, OpenAI comparator and proof
 * manifest adapters in this same directory already use. Zod validates the
 * result, so a declaration that parses but says the wrong thing fails here
 * rather than downstream.
 */

const rootSchema = z.object({
  sources: z.record(
    z.string(),
    z.object({
      source_id: z.string().startsWith("source:").nullable(),
      kind: z.string(),
      repo: z.string().optional(),
      ref: z.string().optional(),
      path: z.string().optional(),
      url: z.string().optional(),
      commit: z.string().regex(/^[0-9a-f]{40}$/u).optional(),
      tree: z.string().regex(/^[0-9a-f]{40}$/u).optional(),
      /* A source served from GitHub Pages has no ref its bytes can be
         re-fetched from, so the Repository records the commit of the active
         deployment and the instant it resolved it. These are the same shape as
         `commit` above and get the same guard: the object is `.loose()`, so an
         unguarded key would be carried through however it was typed. */
      pages_commit: z.string().regex(/^[0-9a-f]{40}$/u).optional(),
      pages_commit_resolved: z.iso.datetime().optional(),
      exact_roots: z
        .record(
          z.string(),
          z.object({
            path: z.string(),
            sha256: z.string().startsWith("sha256:"),
          }),
        )
        .optional(),
    }).loose(),
  ),
});

export type RepositorySourceDeclaration = z.infer<typeof rootSchema>["sources"][string];

export interface RepositorySourceDeclarations {
  slug: string;
  sources: Record<string, RepositorySourceDeclaration>;
}

export async function readRepositorySourceDeclarations(
  repositoriesRoot: string,
): Promise<RepositorySourceDeclarations[]> {
  const declarations = await Promise.all(
    repositoryRegistry.repositories.map(async ({ slug, directory }) => {
      const origin = resolve(repositoriesRoot, directory, "sources.yaml");
      let text: string;
      try {
        text = await readFile(origin, "utf8");
      } catch (error) {
        if (
          error instanceof Error
          && "code" in error
          && (error as Error & { code?: string }).code === "ENOENT"
        ) {
          /* A Repository that reconciles no external source declares nothing.
             The conformance check reports the registry claiming coverage of a
             Repository that declares no such source, so an accidental omission
             cannot pass as a deliberate one. */
          return { slug, sources: {} };
        }
        throw error;
      }
      const parsed = rootSchema.safeParse(YAML.parse(text));
      if (!parsed.success) {
        throw new Error(`${origin} is not a Repository source declaration: ${parsed.error.message}`);
      }
      return { slug, sources: parsed.data.sources };
    }),
  );
  return declarations;
}

/** Every registry source id a Repository declares, in declaration order. */
export function declaredSourceIds(declaration: RepositorySourceDeclarations): string[] {
  return Object.values(declaration.sources)
    .map(({ source_id }) => source_id)
    .filter((id): id is string => Boolean(id));
}
