const GITHUB_HTTPS_REMOTE =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/iu;
const GITHUB_SSH_REMOTE =
  /^(?:git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+)\/([^/]+?)(?:\.git)?\/?$/iu;

/** Return a transport-independent GitHub repository identity. */
export function canonicalGitHubRepository(remote: string): string | null {
  const value = remote.trim();
  const match = value.match(GITHUB_HTTPS_REMOTE) ?? value.match(GITHUB_SSH_REMOTE);
  if (!match) return null;
  return `${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
}

/**
 * Whether two locators name the same repository.
 *
 * `canonicalGitHubRepository` answers only for GitHub and returns `null` for
 * everything else, so comparing two of its results directly says that any two
 * non-GitHub URLs are the same repository — `null === null`. That is harmless
 * while every locator is on GitHub and wrong the moment one is not, which is
 * precisely when a mirror exists at all.
 *
 * So GitHub identity is used where both sides have one, and otherwise the
 * comparison falls back to the locator itself, normalised for the differences
 * that are transport rather than identity: case in the host, a trailing `.git`,
 * a trailing slash. Two different hosts stay two different repositories.
 */
export function sameRepositoryLocator(left: string, right: string): boolean {
  const leftGitHub = canonicalGitHubRepository(left);
  const rightGitHub = canonicalGitHubRepository(right);
  if (leftGitHub !== null && rightGitHub !== null) return leftGitHub === rightGitHub;
  if (leftGitHub !== null || rightGitHub !== null) return false;
  return normalizedLocator(left) === normalizedLocator(right);
}

function normalizedLocator(remote: string): string {
  const value = remote.trim().replace(/\/+$/u, "").replace(/\.git$/iu, "");
  const scp = /^(?:([^@/]+)@)?([^:/]+):(.+)$/u.exec(value);
  if (scp && !value.includes("://")) {
    return `${scp[2].toLowerCase()}/${scp[3].replace(/^\/+/u, "").toLowerCase()}`;
  }
  try {
    const url = new URL(value);
    return `${url.host.toLowerCase()}${url.pathname.replace(/\/+$/u, "").toLowerCase()}`;
  } catch {
    return value.toLowerCase();
  }
}
