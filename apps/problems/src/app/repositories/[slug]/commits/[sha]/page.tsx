import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { commitForRepository, repositoryBySlug } from "@vela/projection-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { PageShell } from "@vela/ui/vela/page-shell";
import { Actor } from "@/components/vela/actor";
import { RecordId } from "@/components/vela/record-id";
import { RelativeTime } from "@/components/vela/relative-time";
import { RouteTitle } from "@/components/vela/route-title";
import { StatRow } from "@/components/vela/stat-row";
import { commitHref } from "@/components/vela/source-file";

/* One commit, at its own address.
 *
 * The history plane recorded commits and could not name one: `/updates` drew
 * nineteen distinct events and linked all nineteen to the Repository's whole
 * commit list, printing a shorthand on each row that pointed at nothing. This
 * is the missing route, and it is what every timeline row, Decision provenance
 * line and diff link already wanted.
 *
 * Not statically generated. A release holds hundreds of commits per Repository
 * and almost none of them is ever opened; the page is cheap on demand and the
 * release root bounds what it can read. */
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps<"/repositories/[slug]/commits/[sha]">): Promise<Metadata> {
  const { slug, sha } = await params;
  const [repository, commit] = await Promise.all([repositoryBySlug(slug), commitForRepository(slug, sha)]);
  if (!repository || !commit) return {};
  return {
    title: `${repository.status.repository.name}: ${commit.sha.slice(0, 12)}`,
    description: commit.subject,
    alternates: { canonical: `/repositories/${slug}/commits/${commit.sha}` },
  };
}

export default async function CommitPage({ params }: PageProps<"/repositories/[slug]/commits/[sha]">) {
  const { slug, sha } = await params;
  const [repository, commit] = await Promise.all([repositoryBySlug(slug), commitForRepository(slug, sha)]);
  if (!repository || !commit) notFound();

  const delta = commit.transition;
  const accepted = delta ? delta.counts.accepted_after - delta.counts.accepted_before : 0;
  const source = commitHref(repository.source.remote, commit.sha);
  const commits = `/repositories/${slug}/commits`;

  return (
    <PageShell archetype="default" layout="reading">
      <RouteTitle title={`${repository.status.repository.name}: ${commit.sha.slice(0, 12)}`} />

      <nav aria-label="Breadcrumb" className="text-meta text-muted-foreground">
        <Link href={commits} className="hover:text-foreground">{repository.status.repository.name} commits</Link>
      </nav>

      <header className="mt-2 border-b pb-4">
        <h1 className="max-w-[76ch] break-words text-display text-pretty">{commit.subject}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-meta text-muted-foreground">
          <Actor name={commit.author_name} kind={commit.machine ? "agent" : "human"} />
          <span aria-hidden>·</span>
          <RelativeTime value={commit.committed_at} />
          <span aria-hidden>·</span>
          <RecordId value={commit.sha} label="Commit" />
          {/* Which population this commit belongs to. The Repository's history
              is roughly one protocol write to fifteen editorial ones, and the
              list page separates them; a single commit should say which it is
              rather than leave the reader to infer it from the subject. */}
          <Badge variant={commit.machine ? "secondary" : "outline"}>
            {commit.machine ? "written by the protocol" : "editorial"}
          </Badge>
        </div>
      </header>

      {commit.body ? (
        <p className="mt-4 max-w-[76ch] whitespace-pre-wrap text-body leading-relaxed text-muted-foreground">{commit.body}</p>
      ) : null}

      {/* What the commit did to the index, which `git diff` cannot show: the
          index is one very long line, so an accepted Decision reads there as a
          single insertion and a single deletion. */}
      {delta ? (
        <section aria-labelledby="index-delta-heading" className="mt-8">
          <h2 id="index-delta-heading" className="text-title">What it changed</h2>
          <StatRow
            className="mt-3"
            stats={[
              {
                label: "Accepted Claims",
                value: `${delta.counts.accepted_before.toLocaleString()} → ${delta.counts.accepted_after.toLocaleString()}`,
                detail: accepted === 0 ? "unchanged" : `${accepted > 0 ? "+" : "−"}${Math.abs(accepted)}`,
              },
              { label: "Accepted added", value: delta.accepted_added.length.toLocaleString(), detail: "Claims this commit accepted" },
              { label: "Accepted removed", value: delta.accepted_removed.length.toLocaleString(), detail: "Claims it superseded or retracted" },
              { label: "Left review", value: delta.pending_removed.length.toLocaleString(), detail: "pending Claims it resolved" },
            ]}
          />
          <dl className="mt-4 grid gap-2 text-meta sm:grid-cols-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="text-muted-foreground">Repository root before</dt>
              <dd>{delta.repository_root_before ? <RecordId value={delta.repository_root_before} label="Root before" /> : <span className="text-muted-foreground">none</span>}</dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="text-muted-foreground">Repository root after</dt>
              <dd><RecordId value={delta.repository_root_after} label="Root after" /></dd>
            </div>
          </dl>
          {delta.comparison_state === "verified" && commit.parent_sha ? (
            <Button className="mt-4" nativeButton={false} size="sm" variant="outline" render={
              <Link href={`${commits}/compare?from=${commit.parent_sha}&to=${commit.sha}`} />
            }>Compare with its parent</Button>
          ) : null}
        </section>
      ) : (
        <p className="mt-8 max-w-[68ch] text-body text-muted-foreground">
          This commit carried no index transition. It changed the Repository&rsquo;s files without
          moving what the Repository holds to be true.
        </p>
      )}

      {commit.changed_paths.length ? (
        <section aria-labelledby="changed-paths-heading" className="mt-8">
          <h2 id="changed-paths-heading" className="text-title">
            {commit.changed_paths.length} {commit.changed_paths.length === 1 ? "path" : "paths"}
          </h2>
          <ul className="mt-3 divide-y rounded-lg border">
            {commit.changed_paths.map((path) => (
              <li key={path} className="break-all px-4 py-2 font-mono text-compact">{path}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2 border-t pt-5">
        <Button nativeButton={false} size="sm" variant="outline" render={<Link href={commits} />}>All commits</Button>
        {source ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={source}>Open in the source repository</a>} /> : null}
      </div>
    </PageShell>
  );
}
