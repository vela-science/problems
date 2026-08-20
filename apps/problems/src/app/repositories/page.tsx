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
  /* No count. `/` is a real Home page and this is not it: apps/problems's
     vercel.json redirects only /hubs, /work and /docs, so the claim this
     comment used to make about a 308 was false. A number here is wrong the moment the
     projection publishes a different set, and metadata is static. */
  description: "The repositories that publish current scientific state to problems.science.",
  alternates: { canonical: "/repositories" },
};

const number = new Intl.NumberFormat("en-US");

export default async function RepositoriesPage() {
  const repositories = await allRepositories();
  const maximumClaims = Math.max(...repositories.map((repository) => statusClaimCount(repository.status)), 1);
  return (
    <PageShell archetype="data" layout="canvas" className="flex flex-col gap-6">
      <PageIntro
        title="Repositories"
        /* Counted from what the projection publishes. This read "Four exact Git
           checkouts" from the epoch that had four subject repositories, and went
           on saying it after they were consolidated into one authority — a
           header claiming four above a page listing one. */
        description="Source repositories and the scientific state each one currently publishes."
        /* No signal grid. `composition-bar.tsx` says why in its own header:
           the metric tile is what root DESIGN.md lists under Avoid, and it was
           "the first thing on the Repositories page". Four tiles over a list of
           one repository restated what that row already shows — the count is
           the list's length, and Standing, Integrity and Pending are per
           Repository and drawn in each row. DESIGN.md:461 forbids the KPI slab;
           PRODUCT.md:253 asks for one dominant object, and here it is the
           list. */
      />

      <section aria-labelledby="repository-state-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="repository-state-heading" className="text-subtitle">Published repositories</h2>
            {/* Said once, not once per row. "direct Submission" sat in each
                row's <dl> beside Pending, which is real per-Repository data, so
                a literal that is identical everywhere read as a fact that
                varies. It is a property of the release, so it belongs here. */}
            <p className="mt-1 text-meta text-muted-foreground">Open a Repository to inspect current Standing and its exact source. Every Repository in this release takes work by direct Submission.</p>
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
          <Link href={base} className="inline-flex min-h-6 items-center text-subtitle underline-offset-4 hover:underline">{repository.status.repository.name}</Link>
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
        <p className="mb-1.5 text-eyebrow text-muted-foreground">Integrity</p>
        <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-start">
          <StatusBadge state={state.replayed ? "replayed" : "strict_blocked"} className={state.replayed ? "border-border bg-muted/50 text-muted-foreground" : undefined}>{state.replayed ? "replay verified" : "replay drift"}</StatusBadge>
          <StatusBadge state={state.strict ? "strict_pass" : "strict_blocked"} className={state.strict ? "border-border bg-muted/50 text-muted-foreground" : undefined}>{state.strict ? "strict pass" : `${number.format(repository.status.integrity.blocker_count)} blockers`}</StatusBadge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-meta md:col-span-2 2xl:col-span-1 2xl:grid-cols-1 2xl:gap-1.5">
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
