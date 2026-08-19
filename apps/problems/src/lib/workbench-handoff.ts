import { primaryRemote, repositoryRegistry } from "@vela/projection-data/registry";

const PUBLIC_PROBLEMS_ORIGIN = "https://problems.science";
const FULL_GIT_OBJECT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const CANONICAL_PROBLEM_PATH = /^\/problems\/[a-z0-9]+(?:-[a-z0-9]+)*\/[A-Za-z0-9._~-]+$/u;
const MAX_HANDOFF_BYTES = 16 * 1024;

function exactHttpsRepository(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function githubSourceRepositoryAtRevision(locators: string[], revision: string): string | null {
  const matches = locators.flatMap((value) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.search || url.hash) return [];
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length < 5 || parts[2] !== "blob" || parts[3] !== revision) return [];
      const [owner, repository] = parts;
      if (!owner || !repository || !/^[A-Za-z0-9_.-]+$/u.test(owner) || !/^[A-Za-z0-9_.-]+$/u.test(repository)) return [];
      return [`https://github.com/${owner}/${repository}.git`];
    } catch {
      return [];
    }
  });
  return new Set(matches).size === 1 ? matches[0]! : null;
}

/**
 * Builds the provider-neutral Workbench v1 handoff only from exact public
 * Problem and Repository state. The source and authority Repository fields
 * stay separate even when this release points both at the same Git custody.
 */
export function problemWorkbenchHandoff(input: {
  basePath: string;
  repositorySlug: string;
  sourceRevision: string | null | undefined;
  sourceLocators: string[];
}): string | null {
  if (!CANONICAL_PROBLEM_PATH.test(input.basePath) || !FULL_GIT_OBJECT.test(input.sourceRevision ?? "")) return null;
  const entry = repositoryRegistry.repositories.find(({ slug }) => slug === input.repositorySlug);
  if (!entry) return null;
  const sourceRepository = githubSourceRepositoryAtRevision(input.sourceLocators, input.sourceRevision!);
  const authorityRepository = exactHttpsRepository(primaryRemote(entry));
  if (!sourceRepository || !authorityRepository) return null;

  const url = new URL("vela-workbench://continue");
  url.searchParams.set("v", "1");
  url.searchParams.set("problem", `${PUBLIC_PROBLEMS_ORIGIN}${input.basePath}`);
  url.searchParams.set("source", sourceRepository);
  url.searchParams.set("ref", input.sourceRevision!);
  url.searchParams.set("repository", authorityRepository);
  const handoff = url.toString();
  return new TextEncoder().encode(handoff).byteLength <= MAX_HANDOFF_BYTES ? handoff : null;
}
