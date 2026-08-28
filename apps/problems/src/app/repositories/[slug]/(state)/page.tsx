import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  allRepositories,
  claimsForRepository,
  repositoryBySlug,
  mathSourceRegistryRead,
  reviewVerification,
} from "@vela/projection-data";
import { CompositionBar } from "@/components/vela/composition-bar";
import { commitsForRepository } from "@vela/projection-data";
import { DecisionRail, type DecisionMark } from "@/components/vela/decision-rail";
import { proposalStatus } from "@/components/vela/proposal-ledger";
import { RepositoryContext } from "@/components/vela/repository-context";
import { SourceBindings, type SourceBindingRow } from "@/components/vela/source-bindings";

export const dynamicParams = true;
export async function generateStaticParams() { return (await allRepositories()).map((repository) => ({ slug: repository.slug })); }
export async function generateMetadata({ params }: PageProps<"/repositories/[slug]">): Promise<Metadata> { const { slug } = await params; const repository = await repositoryBySlug(slug); return repository ? { title: repository.status.repository.name, description: `Exact published state and roots for the ${repository.status.repository.name} repository.`, alternates: { canonical: `/repositories/${slug}` } } : {}; }

const number = new Intl.NumberFormat("en-US");

export default async function RepositoryPage({ params }: PageProps<"/repositories/[slug]">) {
  const { slug } = await params;
  const repository = await repositoryBySlug(slug);
  if (!repository) notFound();
  const [accepted, registry, history] = await Promise.all([
    /* Only the facets are read. One row is the smallest page this query takes,
       and the facet counts are computed over the whole accepted set regardless
       of it: each facet query drops its own term and keeps every other, so the
       `standing` scope holds across the returned source_type values. */
    claimsForRepository(slug, { standing: "accepted", limit: 1 }),
    /* Already scoped to this Repository: the registry read drops any declaration
       whose coverage does not name the slug, so this is the declared set rather
       than the release's. */
    mathSourceRegistryRead({ repositorySlug: slug, includeRecords: false }),
    commitsForRepository(slug, { limit: 1 }),
  ]);

  const counts = repository.status.counts;
  const work = repository.status.actions.work;

  /* A Proposal with neither a decision nor a creation instant cannot be placed
     on a time axis, so the sentence and the figure agree on what is drawable. */
  const decisions: DecisionMark[] = repository.reviews
    .filter((review) => review.reviewed_at ?? review.created_at)
    .map((review) => ({
      proposalId: review.proposal_id,
      status: proposalStatus(review.status),
      at: review.reviewed_at ?? review.created_at,
      actor: review.reviewed_by,
      reason: review.decision_reason,
      verification: reviewVerification(review),
      verifiers: (review.verification_records ?? []).map((record) => record.verifier_actor),
    }));

  const sources: SourceBindingRow[] = registry.sources.map((source) => ({
    sourceId: source.declaration.source_id,
    publisher: source.declaration.publisher_or_maintainer,
    bindings: source.repository_binding_count,
    coverage: source.observation?.coverage.status ?? null,
  }));

  const submissionShare = accepted.facets.source_type.find((facet) => facet.value === "submission")?.count ?? 0;

  return <PageShell archetype="default" layout="standard">
    <RepositoryContext repository={repository} latestCommit={history.items[0] ?? null} />

    <div className="mt-8 min-w-0 space-y-8">
        <section className="min-w-0" aria-labelledby="standing-heading">
          <h2 id="standing-heading" className="text-subtitle">What currently Stands</h2>
          <div className="mt-3">
            <Figure value={number.format(counts.accepted_claims)} unit={`accepted Repository-local Claim${counts.accepted_claims === 1 ? "" : "s"}`} />
          </div>
          {/* The bar used to be accepted against unassessed, which on every
              Repository in this release reads "accepted 100%". Split by the
              retained source_type instead and it says where the standing came
              from, which is a fact that differs between Repositories. */}
          <CompositionBar
            className="mt-3"
            divided
            total={counts.accepted_claims}
            segments={accepted.facets.source_type.map((facet) => ({
              label: facet.value.replaceAll("_", " "),
              count: facet.count,
              href: `/repositories/${repository.slug}/claims?standing=accepted&source=${encodeURIComponent(facet.value)}`,
            }))}
            caption={`Each segment is how an accepted Claim entered this Repository.${submissionShare ? "" : " No accepted Claim here entered through a Submission."}`}
          />
        </section>

        <section className="min-w-0" aria-labelledby="direction-heading">
          <h2 id="direction-heading" className="mb-3 text-subtitle">Contribution path</h2>
          <p className="max-w-[72ch] text-compact text-muted-foreground">{work.note}</p>
          <p className="mt-2 max-w-[72ch] text-meta text-muted-foreground"><Link href="/contribute" className="underline underline-offset-4">How contribution works</Link></p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-command p-3 text-micro leading-5 text-command-foreground"><code>{work.command}</code></pre>
        </section>

        <section className="min-w-0" aria-labelledby="decisions-heading">
          <h2 id="decisions-heading" className="mb-3 text-subtitle">Decisions</h2>
          {decisions.length
            ? <DecisionRail marks={decisions} snapshotAt={repository.published_snapshot_at} slug={repository.slug} />
            : <p className="max-w-[80ch] text-compact text-muted-foreground">No Proposal is retained for this Repository in this snapshot.</p>}
        </section>

        {sources.length ? <section className="min-w-0" aria-labelledby="sources-heading">
          <div className="mb-3 flex items-end justify-between gap-3"><h2 id="sources-heading" className="text-subtitle">Sources</h2><span className="font-mono text-micro tabular-nums text-muted-foreground">{number.format(sources.length)}</span></div>
          <SourceBindings sources={sources} slug={repository.slug} />
        </section> : null}
    </div>
  </PageShell>;
}

/* A quantity leads its section and the words follow it, rather than being
   buried mid-sentence where it cannot be scanned. */
function Figure({ value, unit }: { value: string; unit: string }) {
  return <p className="flex min-w-0 items-baseline gap-2"><span className="font-mono text-title tabular-nums text-foreground">{value}</span><span className="min-w-0 text-micro text-muted-foreground">{unit}</span></p>;
}
