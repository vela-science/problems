import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allRepositories, commitsForRepository, repositoryBySlug, transitionSummaryForRepository } from "@vela/projection-data";
import type { RepositoryCommit } from "@vela/projection-data";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import { Item, ItemContent, ItemGroup } from "@vela/ui/components/item";
import { LedgerPager } from "@/components/vela/ledger-pager";
import { RecordId } from "@/components/vela/record-id";
import { Actor } from "@/components/vela/actor";
import { RelativeTime } from "@/components/vela/relative-time";
import { RouteTitle } from "@/components/vela/route-title";
import { StatRow } from "@/components/vela/stat-row";

import { pageFromSearchParams, queryHref } from "@/lib/query-state";
import { FilterChips } from "@/components/vela/filter-chips";
import { Button } from "@vela/ui/components/button";

export const dynamicParams = false;
export async function generateStaticParams() {
  return (await allRepositories()).map((repository) => ({ slug: repository.slug }));
}

export async function generateMetadata({ params }: PageProps<"/repositories/[slug]/commits">): Promise<Metadata> {
  const { slug } = await params;
  const repository = await repositoryBySlug(slug);
  return repository
    ? {
        title: `${repository.status.repository.name}: commits`,
        description: `Every commit in the ${repository.status.repository.name} repository at the pinned release.`,
        alternates: { canonical: `/repositories/${slug}/commits` },
      }
    : {};
}

const PAGE_SIZE = 50;

/* One heading per day, in the order the rows already arrive. */
function groupByDay(commits: RepositoryCommit[]): { label: string; commits: RepositoryCommit[] }[] {
  const days: { label: string; commits: RepositoryCommit[] }[] = [];
  for (const commit of commits) {
    const label = new Date(commit.committed_at).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const current = days.at(-1);
    if (current?.label === label) current.commits.push(commit);
    else days.push({ label, commits: [commit] });
  }
  return days;
}


/* A Repository is a Git repository, and until now the product could name exactly
   one commit of it: the head the release happens to pin.
 *
 * Two populations, and the split is the point. The CLI writes a handful of
 * commits — submit, verification import, review accept, review reject, proposal
 * withdraw — and everything else is editorial work by a person. In the largest
 * Repository that is 32 against 463. A history that did not separate them would
 * suggest scientific state moves far more often than it does. */
export default async function CommitsPage({
  params,
  searchParams,
}: PageProps<"/repositories/[slug]/commits">) {
  const { slug } = await params;
  const query = await searchParams;
  const repository = await repositoryBySlug(slug);
  if (!repository) notFound();

  const machineOnly = query.kind === "protocol";
  const page = pageFromSearchParams(query);
  const { items, total, machine } = await commitsForRepository(slug, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    machineOnly,
  });
  /* Counted over the whole history, not the visible page: a per-page number
     under a heading saying "Commits" would read as the total. */
  const { moved, accepted: latestAccepted } = await transitionSummaryForRepository(slug);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const withParams = (next: Record<string, string | null>) =>
    queryHref(`/repositories/${slug}/commits`, new URLSearchParams(query as Record<string, string>), next);

  return (
    <PageShell archetype="default" layout="reading">
      <RouteTitle title={`${repository.status.repository.name}: commits`} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
        <span className="font-mono text-meta tabular-nums text-muted-foreground">
          {total.toLocaleString()} {total === 1 ? "commit" : "commits"} at {repository.source.commit.slice(0, 12)}
        </span>
        <FilterChips
          label="Filter commits"
          chips={[
            { key: "all", label: "All", active: !machineOnly, href: withParams({ kind: null, page: null }) },
            { key: "protocol", label: "Written by the protocol", count: machine, active: machineOnly, href: withParams({ kind: "protocol", page: null }) },
          ]}
        />
      </div>

      {/* Four counts that say what this history is, before the rows. The page
          opened with a single line of text over 495 rows, so nothing told a
          reader that scientific state moved 56 times and the other 439 commits
          were editorial. */}
      <StatRow
        className="mt-4"
        stats={[
          { label: "Commits", value: total.toLocaleString(), detail: `at ${repository.source.commit.slice(0, 12)}` },
          { label: "Written by the protocol", value: machine.toLocaleString(), detail: "submit, verify, decide" },
          { label: "Moved the index", value: moved.toLocaleString(), detail: "commits that changed repository state" },
          {
            label: "Accepted Claims",
            value: latestAccepted === null ? "—" : latestAccepted.toLocaleString(),
            detail: latestAccepted === null ? "no transition retained" : "after the newest transition",
          },
        ]}
      />

      {/* Grouped by day under a sticky heading carrying its own count, which is
          how entire.io reads a repository history: the date is context you keep
          while you scan, not a field repeated on every row. Days come from the
          ordered list rather than a second query — the rows are already sorted
          by commit time. */}
      {items.length ? (
        <div className="mt-4">
          {groupByDay(items).map((day) => (
            <section key={day.label} aria-label={day.label}>
              <h2 className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b bg-background/95 py-1.5 text-eyebrow text-muted-foreground backdrop-blur">
                <span>{day.label}</span>
                <span className="font-mono tabular-nums">
                  {day.commits.length} {day.commits.length === 1 ? "commit" : "commits"}
                </span>
              </h2>
              <ItemGroup className="divide-y">
          {day.commits.map((commit) => {
            const delta = commit.transition;
            const accepted = delta ? delta.counts.accepted_after - delta.counts.accepted_before : 0;
            return (
              <Item key={commit.sha} className="items-start rounded-none px-0 py-3">
                <ItemContent className="min-w-0 gap-1">
                  {/* Subject left, recency right — the two-column rhythm every
                      list a reader arrives from has, and the thing that makes a
                      column of times scannable instead of a wall of dates. */}
                  <div className="flex min-w-0 items-baseline justify-between gap-3">
                    <p className="min-w-0 break-words text-body font-medium">
                      {/* The commit's own page, not the source host. The
                          outbound link stays on that page, next to the index
                          delta this product holds and GitHub does not. */}
                      <Link data-slot="text-action" href={`/repositories/${slug}/commits/${commit.sha}`} className="hover:underline">{commit.subject}</Link>
                    </p>
                    <RelativeTime value={commit.committed_at} className="shrink-0 text-micro text-muted-foreground" />
                  </div>

                  {/* The index delta, where there is one. `git diff` cannot show
                      this: the index is a single 842KB line, so an accepted
                      Decision reads there as one insertion and one deletion. */}
                  {delta ? (
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-meta">
                      <p className="flex flex-wrap items-center gap-x-1.5">
                        <span className="text-muted-foreground">Accepted Claims</span>
                        <span className="font-mono tabular-nums">
                          {delta.counts.accepted_before.toLocaleString()} → {delta.counts.accepted_after.toLocaleString()}
                        </span>
                        {accepted !== 0 ? (
                          <span className="font-mono tabular-nums text-status-progress">
                            {accepted > 0 ? "+" : "−"}{Math.abs(accepted)}
                          </span>
                        ) : <span className="text-muted-foreground">unchanged</span>}
                        {delta.pending_removed.length ? (
                          <>
                            <span aria-hidden className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              {delta.pending_removed.length} left review
                            </span>
                          </>
                        ) : null}
                      </p>
                      {delta.comparison_state === "verified" && commit.parent_sha ? (
                        <Link
                          href={`/repositories/${slug}/commits/compare?from=${commit.parent_sha}&to=${commit.sha}`}
                          className="inline-flex min-h-6 items-center font-medium underline underline-offset-4"
                        >
                          Compare exact revisions
                        </Link>
                      ) : (
                        <span className="text-micro text-muted-foreground">Exact comparison unavailable</span>
                      )}
                    </div>
                  ) : null}

                  <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-micro text-muted-foreground">
                    {commit.machine ? (
                      <>
                        <span className="font-mono">protocol</span>
                        <span aria-hidden className="text-muted-foreground">·</span>
                      </>
                    ) : null}
                    <Actor name={commit.author_name} kind={commit.machine ? "agent" : "human"} />
                    <span aria-hidden className="text-muted-foreground">·</span>
                    <RecordId value={commit.sha} prefix={12} copy={false} />
                    <span aria-hidden className="text-muted-foreground">·</span>
                    <span>{commit.changed_paths.length.toLocaleString()} {commit.changed_paths.length === 1 ? "path" : "paths"}</span>
                  </p>
                </ItemContent>
              </Item>
            );
          })}
              </ItemGroup>
            </section>
          ))}
        </div>
      ) : (
        <Empty className="mt-6 border">
          <EmptyHeader>
            <EmptyTitle>No commit is retained for this release</EmptyTitle>
            <EmptyDescription>Commit history is ingested when a projection is built. This release predates that ingest.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/repositories/${slug}`} />}>Open Repository overview</Button></EmptyContent>
        </Empty>
      )}

      {pages > 1 ? (
        <div className="mt-6"><LedgerPager
          label="Commits"
          page={page}
          pages={pages}
          hrefFor={(next) => withParams({ page: next === 1 ? null : String(next) })}
        /></div>
      ) : null}
    </PageShell>
  );
}
