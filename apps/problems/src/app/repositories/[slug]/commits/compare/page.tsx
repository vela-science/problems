import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  compareExactRepositoryRevisions,
  repositoryBySlug,
  revisionForRepository,
  type RepositoryRevision,
} from "@vela/projection-data";
import { Button } from "@vela/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { RecordId } from "@/components/vela/record-id";
import { RootFact } from "@/components/vela/root-fact";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Compare exact revisions",
  description: "A strict-replay comparison of two exact Repository revisions.",
};

function RevisionFacts({ label, revision }: { label: string; revision: RepositoryRevision }) {
  return (
    <section aria-labelledby={`${label.toLowerCase()}-revision`} className="min-w-0 py-4">
      <h2 id={`${label.toLowerCase()}-revision`} className="text-eyebrow text-muted-foreground">
        {label} revision
      </h2>
      <p className="mt-2 font-mono text-body break-all">{revision.git_commit}</p>
      <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
        <RootFact label="Revision root" value={revision.revision_root} />
        <RootFact label="Repository root" value={revision.repository_root ?? "Unavailable"} />
        <RootFact label="Git tree" value={revision.git_tree} />
        <RootFact label="Reader" value={revision.record.reader.version} />
      </dl>
    </section>
  );
}

function ClaimDelta({
  label,
  before,
  after,
  added,
  removed,
}: {
  label: string;
  before: number;
  after: number;
  added: string[];
  removed: string[];
}) {
  return (
    <section aria-labelledby={`${label.toLowerCase()}-delta`} className="py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 id={`${label.toLowerCase()}-delta`} className="text-title">{label}</h3>
        <p className="font-mono text-meta tabular-nums text-muted-foreground">
          {before.toLocaleString()} → {after.toLocaleString()}
        </p>
      </div>
      {added.length || removed.length ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-eyebrow text-muted-foreground">Entered</p>
            {added.length ? (
              <ul className="mt-2 space-y-2">
                {added.map((id) => <li key={id}><RecordId value={id} prefix={18} /></li>)}
              </ul>
            ) : <p className="mt-2 text-meta text-muted-foreground">None</p>}
          </div>
          <div>
            <p className="text-eyebrow text-muted-foreground">Left</p>
            {removed.length ? (
              <ul className="mt-2 space-y-2">
                {removed.map((id) => <li key={id}><RecordId value={id} prefix={18} /></li>)}
              </ul>
            ) : <p className="mt-2 text-meta text-muted-foreground">None</p>}
          </div>
        </div>
      ) : <p className="mt-3 text-meta text-muted-foreground">No Claim changed on this axis.</p>}
    </section>
  );
}

export default async function RevisionComparePage({
  params,
  searchParams,
}: PageProps<"/repositories/[slug]/commits/compare">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const repository = await repositoryBySlug(slug);
  if (!repository) notFound();
  const from = typeof query.from === "string" ? query.from : "";
  const to = typeof query.to === "string" ? query.to : "";
  if (!/^[0-9a-f]{40}$/u.test(from) || !/^[0-9a-f]{40}$/u.test(to)) {
    return (
      <PageShell archetype="default" layout="reading">
        <PageHero density="compact">
          <p className="text-eyebrow text-muted-foreground">Exact State history</p>
          <h1 className="mt-2 text-display">Compare exact revisions</h1>
        </PageHero>
        <Empty className="mt-6 border">
          <EmptyHeader>
            <EmptyTitle>Choose two revisions from State history</EmptyTitle>
            <EmptyDescription>The comparison URL binds both complete Git commits.</EmptyDescription>
          </EmptyHeader>
          <Button nativeButton={false} render={<Link href={`/repositories/${slug}/commits`} />}>
            Open Repository history
          </Button>
        </Empty>
      </PageShell>
    );
  }

  const [before, after] = await Promise.all([
    revisionForRepository(slug, from),
    revisionForRepository(slug, to),
  ]);
  if (!before || !after) notFound();
  const comparable = before.replay_state === "verified"
    && after.replay_state === "verified"
    && before.source_repository_id === after.source_repository_id;

  if (!comparable) {
    return (
      <PageShell archetype="default" layout="reading">
        <PageHero density="compact">
          <p className="text-eyebrow text-muted-foreground">Exact State history</p>
          <h1 className="mt-2 text-display">Comparison unavailable</h1>
          <p className="mt-3 max-w-2xl text-body text-muted-foreground">
            Current Core could not strictly replay both states under one Repository identity. Raw Git history remains inspectable, but it is not presented as an exact semantic comparison.
          </p>
        </PageHero>
        <div className="mt-6 divide-y border-y">
          <RevisionFacts label="Before" revision={before} />
          <RevisionFacts label="After" revision={after} />
        </div>
        <p className="mt-5"><Link className="text-meta font-medium underline underline-offset-4" href={`/repositories/${slug}/commits`}>Return to Repository history</Link></p>
      </PageShell>
    );
  }

  const comparison = compareExactRepositoryRevisions(before, after);
  return (
    <PageShell archetype="default" layout="reading">
      <PageHero density="compact">
        <p className="text-eyebrow text-muted-foreground">Exact State history</p>
        <h1 className="mt-2 text-display">Compare exact revisions</h1>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          A derived comparison of two strict-replayed Repository states. It has no authority effect and does not make a Decision.
        </p>
        <p className="mt-4 font-mono text-micro text-muted-foreground">
          Comparison <RecordId value={comparison.comparison_root} prefix={18} />
        </p>
      </PageHero>

      <div className="mt-6 grid divide-y border-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <RevisionFacts label="Before" revision={before} />
        <div className="lg:pl-6"><RevisionFacts label="After" revision={after} /></div>
      </div>

      <PageSection aria-labelledby="semantic-delta">
        <PageSectionHeader>
          <h2 id="semantic-delta" className="text-title">Semantic delta</h2>
          <span className="text-meta text-muted-foreground">complete over both replayed Claim sets</span>
        </PageSectionHeader>
        <div className="divide-y">
          <ClaimDelta label="Accepted Claims" {...comparison.accepted} />
          <ClaimDelta label="Unassessed Claims" {...comparison.unassessed} />
        </div>
      </PageSection>

      <footer className="mt-8 border-t pt-4 text-meta text-muted-foreground">
        <p>{comparison.nonclaims.join(" ")}</p>
        <p className="mt-3"><Link className="font-medium text-foreground underline underline-offset-4" href={`/repositories/${slug}/commits`}>Return to Repository history</Link></p>
      </footer>
    </PageShell>
  );
}
