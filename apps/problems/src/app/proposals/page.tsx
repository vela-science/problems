import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import { allRepositories } from "@vela/projection-data";
import { ProposalLedgerRows, type ProposalEntry } from "@/components/vela/proposal-ledger-rows";
import { RouteTitle } from "@/components/vela/route-title";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import { FilterChips } from "@/components/vela/filter-chips";

export const metadata: Metadata = {
  title: "Proposed changes",
  description: "Every proposed scientific-state change under consideration or settled across published Vela repositories.",
  alternates: { canonical: "/proposals" },
};

/* Named for the record rather than the act: you cannot link to a review, you
   link to the vpr_ under review. The old name also implied that the checks were
   the acceptance, which is the protocol's named failure mode — a Verification
   Record is never an acceptance. */
export default async function ProposalsPage({
  searchParams,
}: PageProps<"/proposals">) {
  const query = await searchParams;
  const repositories = await allRepositories();
  const entries: ProposalEntry[] = repositories
    .flatMap((repository) => repository.reviews.map((review) => ({
      repository: repository.slug,
      repositoryName: repository.status.repository.name,
      proposalId: review.proposal_id,
      status: review.status,
      kind: review.kind,
      claim: review.claim || review.target,
      recordedAt: review.reviewed_at ?? review.created_at ?? null,
      actor: review.reviewed_by ?? null,
      reason: review.decision_reason ?? null,
      contentRoot: review.content_root ?? null,
      receiptRoot: review.receipt_root ?? null,
      decisionEventId: review.decision_event_id ?? null,
      decisionProvenance: review.decision_provenance,
    })))
    .sort((left, right) => (right.recordedAt ?? "").localeCompare(left.recordedAt ?? ""));

  const pending = entries.filter((entry) => entry.status === "pending_review").length;

  /* The release-wide roll-up had no filter at all, so a reader looking for the
     one rejected Proposal among eighteen scrolled for it. The counts come from
     the same set the list renders, and a status with no rows offers no control
     — the repository-scoped ledger already works this way, and a filter that
     narrows to nothing teaches a reader the wrong thing about the release. */
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  const requested = typeof query.status === "string" ? query.status : "";
  const status = counts.has(requested) ? requested : "";
  const visible = status ? entries.filter((entry) => entry.status === status) : entries;
  const statuses = [...counts.entries()].sort(([left], [right]) => left.localeCompare(right));

  return (
    <PageShell archetype="default" layout="reading">
      <RouteTitle title="Proposed changes" />

      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-2">
        <h2 className="text-subtitle">Proposed changes</h2>
        <span className="font-mono text-micro tabular-nums text-muted-foreground">
          {status
            ? `${visible.length.toLocaleString()} of ${entries.length.toLocaleString()} in this release`
            : `${entries.length.toLocaleString()} in this release`}
          {pending ? ` · ${pending.toLocaleString()} awaiting a Decision` : ""}
        </span>
      </div>

      <FilterChips
        className="mt-4"
        label="Filter proposed changes"
        chips={[
          { key: "all", label: "All", count: entries.length, active: !status, href: "/proposals" },
          ...statuses.map(([value, count]) => ({
            key: value,
            label: value.replaceAll("_", " "),
            count,
            active: status === value,
            href: `/proposals?status=${encodeURIComponent(value)}` as const,
          })),
        ]}
      />

      <div className="mt-6">
        {visible.length ? (
          <ProposalLedgerRows entries={visible} />
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No proposed change in this release</EmptyTitle>
              <EmptyDescription>No published contribution has been retained as an exact Proposal at this release root.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </PageShell>
  );
}
