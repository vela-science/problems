import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  allRepositories,
  repositoryBySlug,
} from "@vela/projection-data";
import { Button } from "@vela/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import { RouteTitle } from "@/components/vela/route-title";
import { ProposalLedger } from "@/components/vela/proposal-ledger";
import { ProposalSweep } from "@/components/vela/proposal-sweep";
import { sweepFamily } from "@/lib/claim-shape";
import { FilterChips } from "@/components/vela/filter-chips";

export const dynamicParams = false;

/* The four Proposal statuses, in the order a reader meets them. A tab is
   rendered only where the Repository has rows for it, so a filter can never
   resolve to an empty table. */
const STATUSES = ["accepted", "rejected", "withdrawn", "pending_review"] as const;
/* Not `ProposalStatus`: that name is already the union the ledger renders. */
type ProposalStatusFilter = (typeof STATUSES)[number];

export async function generateStaticParams() {
  return (await allRepositories()).map((repository) => ({ slug: repository.slug }));
}

export async function generateMetadata({ params }: PageProps<"/repositories/[slug]/proposals">): Promise<Metadata> {
  const { slug } = await params;
  const repository = await repositoryBySlug(slug);
  return repository ? {
    title: `${repository.status.repository.name}: proposed changes`,
    description: `Proposed changes, scoped Checks, and attributed Decisions for the ${repository.status.repository.name} repository.`,
    alternates: { canonical: `/repositories/${slug}/proposals` },
  } : {};
}

/* Only Proposal roles bind grounded rows into this ledger. Claim roles are
   intentionally skipped: falling back through `review.target` remains useful
   for legacy records, but a rejected predecessor Claim must never make its
   Proposal look like the accepted successor. */
export default async function ProposalsPage({ params, searchParams }: PageProps<"/repositories/[slug]/proposals">) {
  const { slug } = await params;
  const { status: requestedStatus } = await searchParams;
  const repository = await repositoryBySlug(slug);
  if (!repository) notFound();
  const reviews = [...repository.reviews].sort((left, right) =>
    (right.reviewed_at ?? right.created_at ?? "").localeCompare(left.reviewed_at ?? left.created_at ?? "")
    || left.proposal_id.localeCompare(right.proposal_id));

  if (!reviews.length) {
    return (
      <PageShell archetype="data">
        <RouteTitle title="Proposed changes" scope={repository.status.repository.name} />
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No proposed change has been recorded on this repository.</EmptyTitle>
            <EmptyDescription>
              {repository.status.counts.accepted_claims} assertions have Local Standing in this Repository. No published contribution
              has been retained as an exact Proposal against them at this release root.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row flex-wrap justify-center gap-2">
            <Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/repositories/${slug}/claims`} />}>Claims</Button>
            <Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/repositories/${slug}/reproduce`} />}>Reproduce</Button>
          </EmptyContent>
        </Empty>
      </PageShell>
    );
  }

  const present = STATUSES
    .map((value) => [value, reviews.filter((review) => review.status === value).length] as const)
    .filter(([, count]) => count > 0);
  const requested = typeof requestedStatus === "string" ? requestedStatus as ProposalStatusFilter : undefined;
  const active = requested && present.some(([value]) => value === requested) ? requested : undefined;
  /* Named when it is dropped, the way /decisions names its own. A status with
     no rows in this release is a legitimate filter that cannot be honoured, and
     silently showing everything makes a stale link look like no link at all. */
  const ignored = requested && !active ? requested : null;
  const visible = active ? reviews.filter((review) => review.status === active) : reviews;
  const verifications = reviews.reduce((total, review) => total + (review.verification_records?.length ?? 0), 0);
  const pending = reviews.filter((review) => review.status === "pending_review").length;
  const family = sweepFamily(reviews);

  return (
    <PageShell archetype="data">
      <RouteTitle title="Proposed changes" scope={repository.status.repository.name} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-subtitle">Proposed change evidence</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-micro tabular-nums text-muted-foreground">
            {reviews.length} proposed {reviews.length === 1 ? "change" : "changes"} · {verifications} {verifications === 1 ? "Check" : "Checks"} · {pending ? `${pending} pending` : "none pending"}
            {ignored ? <> · <span className="text-muted-foreground">ignored <span className="font-mono text-micro">status={ignored}</span></span></> : null}
          </span>
          {present.length > 1 ? <FilterChips
            label="Filter proposed changes"
            chips={[
              { key: "all", label: "All", active: !active, href: `/repositories/${slug}/proposals` as const },
              ...present.map(([value, count]) => ({
                key: value,
                label: value.replaceAll("_", " "),
                count,
                active: active === value,
                href: `/repositories/${slug}/proposals?status=${value}` as const,
              })),
            ]}
          /> : null}
        </div>
      </div>

      {/* No heading over the figure: a second heading here would close the
          ledger's own scope, and the caption already names what is drawn. */}
      {family.windows.length >= 3 || family.partial >= 3 ? (
        <div className="mb-8">
          <ProposalSweep slug={slug} family={family} />
        </div>
      ) : null}

      <ProposalLedger slug={slug} reviews={visible} />

    </PageShell>
  );
}
