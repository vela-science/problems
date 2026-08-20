import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import Link from "next/link";
import { allRepositories } from "@vela/projection-data";
import { DecisionStream, type DecisionEntry } from "@/components/vela/decision-stream";
import { RouteTitle } from "@/components/vela/route-title";
import { RelativeTime } from "@/components/vela/relative-time";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import { FilterChips } from "@/components/vela/filter-chips";

export const metadata: Metadata = {
  title: "Decisions",
  description: "Recorded authority Decisions across published Vela repositories.",
  alternates: { canonical: "/decisions" },
};

/* A Decision is the only act that changes Standing, which is why the
   destination is named for it rather than for "activity" — a word that reads as
   a feed and buries the authority in a subtitle. The Attempts surface that once
   sat here is gone entirely rather than moved: its table held zero rows in every
   release, so it was a destination that could only ever render nothing. */
export default async function DecisionsPage({ searchParams }: PageProps<"/decisions">) {
  const query = await searchParams;
  const repositories = await allRepositories();
  const entries: (DecisionEntry & { provenance: string })[] = repositories
    .flatMap((repository) => repository.reviews
      .filter((review) => review.status !== "pending_review")
      .map((review) => ({
        repository: repository.slug,
        repositoryName: repository.status.repository.name,
        proposalId: review.proposal_id,
        status: review.status,
        claim: review.claim,
        target: review.target,
        actor: review.reviewed_by ?? null,
        actorClass: review.decision_actor_class ?? null,
        sessionRef: review.decision_session_ref ?? null,
        authorityPrincipalId: review.decision_authority_principal_id ?? null,
        reason: review.decision_reason ?? null,
        recordedAt: review.reviewed_at ?? review.created_at ?? null,
        eventId: review.decision_event_id ?? null,
        provenance: review.decision_provenance,
      })))
    .sort((left, right) => (right.recordedAt ?? "").localeCompare(left.recordedAt ?? ""));

  /* Provenance is the field that names authority, and it is the field the
     Proposal record already keys on. Filtering on `status !== "pending_review"`
     listed a producer's own withdrawal as a Decision, with the producer in the
     authority slot and "No reason is retained with this Decision" under it —
     nobody ruled on it. Excluding by provenance rather than admitting only
     `signed_record` keeps the older `signed_event` and `legacy_materialized`
     rows, which are decided. */
  const decisions = entries.filter((entry) =>
    entry.provenance !== "pending" && entry.provenance !== "producer_withdrawal");
  const withdrawals = entries.filter((entry) => entry.provenance === "producer_withdrawal");

  const accepted = decisions.filter((entry) => entry.status === "accepted").length;

  /* The page had no control of any kind over sixteen rows and 15,617
     characters. Two axes are worth narrowing on and both come from the rows
     themselves, so a value with nothing behind it never becomes a filter that
     empties the page. */
  const facet = (key: "status" | "repository") => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const entry of decisions) {
      const value = key === "status" ? entry.status : entry.repository;
      const label = key === "status" ? entry.status.replaceAll("_", " ") : entry.repositoryName;
      const seen = counts.get(value);
      if (seen) seen.count += 1;
      else counts.set(value, { label, count: 1 });
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  };
  const statuses = facet("status");
  const repositoryFacets = facet("repository");
  const asked = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const status = statuses.some(([value]) => value === asked("status")) ? asked("status") : "";
  const repositorySlug = repositoryFacets.some(([value]) => value === asked("repository")) ? asked("repository") : "";
  const visible = decisions.filter((entry) =>
    (!status || entry.status === status) && (!repositorySlug || entry.repository === repositorySlug));
  const chipHref = (next: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged = { status, repository: repositorySlug, ...next };
    for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
    const search = params.toString();
    return search ? `/decisions?${search}` : "/decisions";
  };

  return (
    <PageShell archetype="default" layout="reading">
      <RouteTitle title="Decisions" />

      {/* The page name is in the sidebar and in the trail; a third copy as an
          H2 above the rows made "Decisions" the largest text on a page about
          sixteen rulings. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-2">
        <span className="font-mono text-meta tabular-nums text-muted-foreground">
          {status || repositorySlug
            ? `${visible.length.toLocaleString()} of ${decisions.length.toLocaleString()}`
            : `${decisions.length.toLocaleString()} recorded`}
          {" · "}{accepted.toLocaleString()} accepted
        </span>
        <FilterChips
          label="Filter decisions"
          chips={[
            ...statuses.map(([value, meta]) => ({ key: `status:${value}`, label: meta.label, count: meta.count, active: status === value, href: chipHref({ status: status === value ? null : value }) })),
            ...repositoryFacets.map(([value, meta]) => ({ key: `repository:${value}`, label: meta.label, count: meta.count, active: repositorySlug === value, href: chipHref({ repository: repositorySlug === value ? null : value }) })),
          ]}
        />
      </div>
      <div className="mt-6">
        {visible.length ? (
          <DecisionStream entries={visible} />
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No Decision is recorded in this release</EmptyTitle>
              <EmptyDescription>Every published Proposal is still pending, or none has been opened.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      {/* Appended, not interleaved: a withdrawal is the producer taking its own
          Proposal back, so it belongs to the Proposal axis and never to the
          authority stream above. */}
      {withdrawals.length ? (
        <section className="mt-10" aria-labelledby="withdrawn-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-2">
            <h2 id="withdrawn-heading" className="text-subtitle">Withdrawn by the producer</h2>
            <span className="font-mono text-micro tabular-nums text-muted-foreground">
              {withdrawals.length.toLocaleString()} withdrawn
            </span>
          </div>
          <ul className="mt-4 divide-y">
            {withdrawals.map((entry) => (
              <li key={`${entry.repository}:${entry.proposalId}`} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 text-compact text-muted-foreground">
                    withdrawn in{" "}
                    <Link className="underline-offset-2 hover:underline" href={`/repositories/${entry.repository}`}>
                      {entry.repositoryName}
                    </Link>
                  </p>
                  <RelativeTime className="shrink-0 text-micro text-muted-foreground" value={entry.recordedAt} />
                </div>
                <Link
                  className="mt-1 block text-body underline-offset-2 hover:underline"
                  href={`/repositories/${entry.repository}/proposals/${encodeURIComponent(entry.proposalId)}`}
                >
                  {entry.claim || entry.target || entry.proposalId}
                </Link>
                <p className="mt-1.5 text-compact text-muted-foreground">
                  Withdrawn by the producer. No repository authority ruled on it.
                </p>
                {entry.actor ? (
                  <p className="mt-1 min-w-0 truncate font-mono text-micro text-muted-foreground">{entry.actor}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageShell>
  );
}
