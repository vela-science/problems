import type { Metadata } from "next";
import Link from "next/link";
import { allRepositories, repositoryIntegrity, repositoryLoop, statusClaimCount, type SiteRepository } from "@vela/projection-data";
import { ArrowRight01Icon as ArrowRight, GitForkIcon as GitFork, MoreHorizontalIcon as Ellipsis, Shield01Icon as ShieldCheck } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@vela/ui/components/dropdown-menu";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { PageShell } from "@vela/ui/vela/page-shell";
import { PageIntro } from "@/components/vela/page-intro";
import { RepositoryMark, repositoryStages } from "@/components/vela/repository-mark";

export const metadata: Metadata = {
  title: "Repositories",
  /* No count. The body four lines down was corrected for this today and this
     was missed — it is the indexed description of the app's root destination,
     since vercel.json 308s `/` here. A number here is wrong the moment the
     projection publishes a different set, and metadata is static. */
  description: "Exact published scientific state from pinned Vela repository checkouts.",
  alternates: { canonical: "/repositories" },
};

const number = new Intl.NumberFormat("en-US");

export default async function RepositoriesPage() {
  const repositories = await allRepositories();
  const acceptedClaims = repositories.reduce((total, repository) => total + repository.status.counts.accepted_claims, 0);
  const exactRepositories = repositories.filter((repository) => {
    const integrity = repositoryIntegrity(repository);
    return integrity.replayed && integrity.strict;
  }).length;
  const pendingReview = repositories.reduce((total, repository) => total + repository.status.counts.pending_review, 0);
  const maximumClaims = Math.max(...repositories.map((repository) => statusClaimCount(repository.status)), 1);
  return (
    <PageShell archetype="data" layout="canvas" className="flex flex-col gap-6">
      <PageIntro
        title="Repositories"
        /* Counted from what the projection publishes. This read "Four exact Git
           checkouts" from the epoch that had four subject repositories, and went
           on saying it after they were consolidated into one authority — a
           header claiming four above a page listing one. */
        description="Exact Git repositories and their current scientific Standing."
        signals={[
          { label: "Repositories", value: number.format(repositories.length), detail: "exact Git custody boundaries", tone: "neutral" },
          { label: "Standing", value: number.format(acceptedClaims), detail: "accepted Repository-local Claims", tone: "progress" },
          { label: "Integrity", value: `${number.format(exactRepositories)}/${number.format(repositories.length)}`, detail: "replay verified and strict", tone: "neutral" },
          { label: "Pending Proposals", value: number.format(pendingReview), detail: "Decisions pending", tone: pendingReview ? "caution" : "neutral" },
        ]}
      />

      <section aria-labelledby="repository-state-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="repository-state-heading" className="text-subtitle">Published repositories</h2>
            <p className="mt-1 text-meta text-muted-foreground">Open a Repository to inspect current Standing and its exact source.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-meta text-muted-foreground" aria-label="State map legend">
            <span className="flex items-center gap-1.5"><span aria-hidden className="size-1.5 rounded-full bg-status-evidence" /> retained evidence</span>
            <span className="flex items-center gap-1.5"><span aria-hidden className="size-1.5 rounded-full bg-status-caution" /> attention</span>
          </div>
        </div>
        <div className="divide-y rounded-lg border bg-card px-5">
          {repositories.map((repository) => <RepositoryLedgerRow key={repository.slug} repository={repository} maximumClaims={maximumClaims} />)}
        </div>
      </section>
    </PageShell>
  );
}

function RepositoryLedgerRow({ repository, maximumClaims }: { repository: SiteRepository; maximumClaims: number }) {
  const state = repositoryIntegrity(repository);
  const base = `/repositories/${repository.slug}`;
  const claims = statusClaimCount(repository.status);
  const barWidth = 14 + (Math.log10(claims + 1) / Math.log10(maximumClaims + 1)) * 86;
  const objective = repository.status.actions.work.note;
  return (
    <article className="grid min-w-0 gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start 2xl:grid-cols-[minmax(18rem,1.35fr)_minmax(12rem,.8fr)_minmax(11rem,.65fr)_minmax(12rem,.7fr)_auto] 2xl:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {/* The dot said nothing and said it identically four times. The mark
              is the Repository's own loop state, so the four rows differ by what
              they have actually reached. */}
          <RepositoryMark
            className="text-status-progress"
            reached={repositoryStages(repositoryLoop(repository))}
          />
          <Link href={base} className="text-subtitle underline-offset-4 hover:underline">{repository.status.repository.name}</Link>
        </div>
        <p className="mt-1.5 line-clamp-2 max-w-[66ch] text-body leading-5 text-muted-foreground">{objective}</p>
      </div>

      <div className="flex min-w-0 items-center justify-start gap-1 md:justify-end 2xl:order-last">
        <Button nativeButton={false} size="sm" render={<Link href={base} />}>Open current state <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button>
        <RepositoryActions repository={repository} />
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3 text-meta">
          <span className="font-medium">Corpus</span>
          <span className="font-mono text-muted-foreground">{number.format(claims)} claims</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${number.format(claims)} claims on a logarithmic corpus scale`}>
          <div className="h-full rounded-full bg-status-evidence" style={{ width: `${barWidth}%` }} />
        </div>
        <p className="mt-1.5 text-meta text-muted-foreground">{repository.graph ? `${number.format(repository.graph.node_count)} graph nodes` : "No graph projection"}{repository.graph?.problem_count ? ` · ${number.format(repository.graph.problem_count)} problems` : ""}</p>
      </div>

      <div>
        <p className="mb-1.5 text-eyebrow uppercase text-muted-foreground">Integrity</p>
        <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-start">
          <StatusBadge state={state.replayed ? "replayed" : "strict_blocked"} className={state.replayed ? "border-border bg-muted/50 text-muted-foreground" : undefined}>{state.replayed ? "replay verified" : "replay drift"}</StatusBadge>
          <StatusBadge state={state.strict ? "strict_pass" : "strict_blocked"} className={state.strict ? "border-border bg-muted/50 text-muted-foreground" : undefined}>{state.strict ? "strict pass" : `${number.format(repository.status.integrity.blocker_count)} blockers`}</StatusBadge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-meta md:col-span-2 2xl:col-span-1 2xl:grid-cols-1 2xl:gap-1.5">
        <div><dt className="text-muted-foreground">Work path</dt><dd className="font-semibold">direct Submission</dd></div>
        <div><dt className="text-muted-foreground">Pending</dt><dd className={repository.status.counts.pending_review ? "font-semibold text-[var(--status-caution)]" : "font-semibold"}>{number.format(repository.status.counts.pending_review)}</dd></div>
      </dl>

    </article>
  );
}

function RepositoryActions({ repository }: { repository: SiteRepository }) {
  const base = `/repositories/${repository.slug}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${repository.status.repository.name}`} />}><HugeiconsIcon icon={Ellipsis} aria-hidden /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Inspect</DropdownMenuLabel>
        {repository.graph ? <DropdownMenuItem render={<Link href={`/graph?repository=${repository.slug}&lens=research`} />}><HugeiconsIcon icon={GitFork} aria-hidden />Graph</DropdownMenuItem> : null}
        <DropdownMenuItem render={<Link href={`${base}/contribute`} />}>Contribution handoff</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={`${base}/proposals${repository.status.counts.pending_review > 0 ? "?status=pending_review" : ""}`} />}><HugeiconsIcon icon={ShieldCheck} aria-hidden />Proposals</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
