import { ArrowUpRight01Icon as External } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { canonicalGitHubRepository } from "@vela/projection-data";
import { cn } from "@vela/ui/lib/utils";

/* The file a record is.
 *
 * Vela's claim is that scientific state lives in canonical Git repositories and
 * that every retained record is a file addressed by its own digest. The
 * Problems shipped exactly one github.com link — a hardcoded one to the
 * protocol repo in the command palette — and not a single link to a record.
 * `CloneMenu` and `RepositoryAbout` linked the bare `.git` remote, which 301s to
 * a repository home page and tells a reader nothing about the record they were
 * reading.
 *
 * `source_path` has been on `claims`, `submissions` and `verifications` since
 * the schema was written and was read by nothing, so the three columns naming
 * the file were dead while the digest of that file was on screen.
 *
 * The template was verified against the four Repositories published at the time
 * and every record family — 200 on claims, submissions, verifications,
 * artifacts and authority events:
 *
 *   https://github.com/{owner}/{repo}/blob/{commit}/{path}
 *
 * Those four are archived and one repository is published now, so that is
 * provenance for why the shape is trusted rather than a current count.
 *
 * The remote, not the slug, is the source for the owner and repo. A slug is a
 * name this projection chose; the repository is wherever its declared locator
 * points, and the two agreeing today is a coincidence rather than a rule.
 *
 * Not `/tree/{source_tree}`: GitHub does not serve bare tree SHAs and that URL
 * 404s. A tree root stays a value a reader verifies locally. */
export function sourceFileHref(
  remote: string,
  commit: string,
  path: string,
): string | null {
  const repository = canonicalGitHubRepository(remote);
  if (!repository || !commit || !path) return null;
  return `https://github.com/${repository}/blob/${commit}/${path}`;
}

export function commitHref(remote: string, commit: string): string | null {
  const repository = canonicalGitHubRepository(remote);
  if (!repository || !commit) return null;
  return `https://github.com/${repository}/commit/${commit}`;
}

export function SourceFile({
  remote,
  commit,
  path,
  label = "Canonical file",
  className,
}: {
  remote: string;
  commit: string;
  path: string | null | undefined;
  label?: string;
  className?: string;
}) {
  if (!path) return null;
  const href = sourceFileHref(remote, commit, path);
  /* A path with no resolvable remote is still worth printing — it is where the
     record lives in a clone the reader may already have. Only the link goes. */
  const body = (
    <>
      <span className="font-mono text-micro break-all">{path}</span>
      {href ? <HugeiconsIcon icon={External} aria-hidden className="size-3 shrink-0" /> : null}
    </>
  );
  return (
    <p className={cn("flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-micro text-muted-foreground", className)}>
      <span className="shrink-0">{label}</span>
      {href ? (
        <a
          href={href}
          className="inline-flex min-w-0 items-baseline gap-1 underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          {body}
        </a>
      ) : (
        body
      )}
      <span aria-hidden>·</span>
      <span className="font-mono">{commit.slice(0, 12)}</span>
    </p>
  );
}
