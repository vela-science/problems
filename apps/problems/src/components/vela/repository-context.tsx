import Link from "next/link";
import {
  ArrowRight01Icon as ArrowRight,
  GitCommitIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  repositoryIntegrity,
  repositoryLoop,
  statusStateRoots,
  type RepositoryCommit,
  type SiteRepository,
} from "@vela/projection-data";
import { Button } from "@vela/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@vela/ui/components/collapsible";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { PageHero } from "@vela/ui/vela/page-shell";
import { Actor } from "@/components/vela/actor";
import { CloneMenu } from "@/components/vela/clone-menu";
import { RecordId } from "@/components/vela/record-id";
import { RelativeTime } from "@/components/vela/relative-time";
import { RootFact } from "@/components/vela/root-fact";
import { commitHref } from "@/components/vela/source-file";
import { remoteHost } from "@/lib/format";

const number = new Intl.NumberFormat("en-US");

export function standingChangeSummary(commit: RepositoryCommit | null): string {
  if (!commit) return "No Git history is projected for this Repository.";
  const added = commit.transition?.accepted_added.length ?? 0;
  const removed = commit.transition?.accepted_removed.length ?? 0;
  if (!added && !removed) return "The latest Git commit changed no scientific Standing.";
  const additions = `${number.format(added)} accepted Claim${added === 1 ? "" : "s"} entered`;
  const removals = `${number.format(removed)} accepted Claim${removed === 1 ? "" : "s"} left`;
  return added && removed ? `${additions}; ${removals}.` : `${added ? additions : removals}.`;
}

/* Repository context is an app-owned composition, not a new primitive or read
 * model. Its responsive card/description-list hierarchy adapts Tailwind Plus
 * Application UI v4 `headings/page-headings/10-with-meta-actions-and-breadcrumbs`
 * and `data-display/description-lists/03-left-aligned-in-card` under the
 * owner's Tailwind Plus Personal License (purchased 2026-07-28). Interactions
 * remain the existing shadcn/Base UI components and every value comes directly
 * from SiteRepository or RepositoryCommit. */
export function RepositoryContext({
  repository,
  latestCommit,
}: {
  repository: SiteRepository;
  latestCommit: RepositoryCommit | null;
}) {
  const counts = repository.status.counts;
  const loop = repositoryLoop(repository);
  const integrity = repositoryIntegrity(repository);
  const roots = statusStateRoots(repository.status);
  const sourceHref = commitHref(repository.source.remote, repository.source.commit);
  const latestHref = latestCommit ? commitHref(repository.source.remote, latestCommit.sha) : null;

  return (
    <PageHero density="compact">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-muted-foreground">Repository-local scientific state</p>
          <h1 className="mt-1.5 min-w-0 text-display [overflow-wrap:anywhere]">
            {repository.status.repository.name}
          </h1>
          <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-meta text-muted-foreground">
            <span>{repository.source.access === "private" ? "Private Git source" : "Git source"}</span>
            <a
              href={repository.source.remote}
              className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
            >
              {remoteHost(repository.source.remote)}
            </a>
            <span aria-hidden>·</span>
            {sourceHref ? (
              <a href={sourceHref} className="font-mono underline decoration-dotted underline-offset-2 hover:decoration-solid">
                {repository.source.commit.slice(0, 12)}
              </a>
            ) : (
              <span className="font-mono">{repository.source.commit.slice(0, 12)}</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button nativeButton={false} render={<Link href={`/repositories/${repository.slug}/claims`} />}>
            Inspect current Standing
            <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
          </Button>
          <CloneMenu
            remote={repository.source.remote}
            cloneCommand={repository.reproduce.clone}
            commit={repository.source.commit}
            reproduceHref={`/repositories/${repository.slug}/reproduce`}
          />
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border md:grid-cols-4">
        <div className="min-w-0 border-b border-r p-3 md:border-b-0">
          <dt className="text-eyebrow uppercase text-muted-foreground">Standing</dt>
          <dd className="mt-1 font-mono text-title tabular-nums">{number.format(counts.accepted_claims)}</dd>
          <dd className="mt-1 text-micro text-muted-foreground">accepted Repository-local Claim{counts.accepted_claims === 1 ? "" : "s"}</dd>
        </div>
        <div className="min-w-0 border-b p-3 md:border-b-0 md:border-r">
          <dt className="text-eyebrow uppercase text-muted-foreground">Integrity</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge
              state={integrity.replayed ? "replayed" : "strict_blocked"}
              className="border-border bg-muted/50 text-muted-foreground"
            >
              {integrity.replayed ? "replay verified" : "replay drift"}
            </StatusBadge>
            <StatusBadge
              state={integrity.strict ? "strict_pass" : "strict_blocked"}
              className={integrity.strict ? "border-border bg-muted/50 text-muted-foreground" : undefined}
            >
              {integrity.strict ? "strict pass" : `${number.format(repository.status.integrity.blocker_count)} blockers`}
            </StatusBadge>
          </dd>
        </div>
        <div className="min-w-0 border-r p-3">
          <dt className="text-eyebrow uppercase text-muted-foreground">Activity</dt>
          <dd className="mt-1 text-meta">
            <span className="font-mono tabular-nums">{number.format(counts.submissions)}</span> published contributions
            <br />
            <span className="font-mono tabular-nums">{number.format(counts.verifications)}</span> Checks
            <br />
            <span className="font-mono tabular-nums">{number.format(loop.proposals)}</span> proposed changes
          </dd>
        </div>
        <div className="min-w-0 p-3">
          <dt className="text-eyebrow uppercase text-muted-foreground">Human authority</dt>
          <dd className="mt-1 font-mono text-title tabular-nums">{number.format(loop.decisions)}</dd>
          <dd className="mt-1 text-micro text-muted-foreground">authorized Decision{loop.decisions === 1 ? "" : "s"} retained</dd>
        </div>
      </dl>

      <div className="mt-3 grid gap-2 text-meta sm:grid-cols-2">
        <div className="min-w-0 rounded-md bg-muted/45 p-3">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <HugeiconsIcon icon={GitCommitIcon} aria-hidden className="size-4" />
            Latest change
          </p>
          <p className="mt-1 text-muted-foreground">{standingChangeSummary(latestCommit)}</p>
          {latestCommit ? (
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 text-micro text-muted-foreground">
              {latestHref ? <a href={latestHref} className="min-w-0 break-words hover:underline">{latestCommit.subject}</a> : <span className="min-w-0 break-words">{latestCommit.subject}</span>}
              <span aria-hidden>·</span>
              <Actor name={latestCommit.author_name} />
              <span aria-hidden>·</span>
              <RelativeTime value={latestCommit.committed_at} />
            </p>
          ) : null}
        </div>
        <div className="min-w-0 rounded-md bg-muted/45 p-3">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <HugeiconsIcon icon={InformationCircleIcon} aria-hidden className="size-4" />
            Source-owned work
          </p>
          <p className="mt-1 text-muted-foreground">{repository.status.actions.work.note}</p>
        </div>
      </div>

      <Collapsible className="mt-3 rounded-lg border">
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-compact font-medium">
          Exact Repository source and roots
          <span className="font-mono text-micro text-muted-foreground">{roots.length + 4} values</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t p-4">
          <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
            <RootFact label="Git source" value={repository.source.remote} />
            <RootFact label="Source commit" value={repository.source.commit} />
            <RootFact label="Source tree" value={repository.source.tree} />
            {roots.map((root) => <RootFact key={root.label} label={root.label} value={root.value} />)}
            <div className="min-w-0">
              <dt className="text-meta text-muted-foreground">Repository identity</dt>
              <dd className="mt-0.5"><RecordId value={repository.status.repository.id} prefix={12} /></dd>
            </div>
          </dl>
        </CollapsibleContent>
      </Collapsible>
    </PageHero>
  );
}
