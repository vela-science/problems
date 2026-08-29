import Link from "next/link";
import { Activity01Icon, GitCommitIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Actor } from "@/components/vela/actor";
import { formatAgo, formatDate } from "@/lib/format";
import type { recentScientificChanges } from "@/lib/scientific-state";

export type ScientificChange = Awaited<ReturnType<typeof recentScientificChanges>>[number];

function plainChangeTitle(subject: string) {
  if (subject === "vela: review review_accept") return "Reviewed evidence was updated";
  if (subject === "vela: verification import") return "A result check was recorded";
  return subject;
}

function plainTransitionSummary(transition: NonNullable<ScientificChange["commit"]["transition"]>) {
  const parts = [
    transition.accepted_added.length
      ? `${transition.accepted_added.length} accepted ${transition.accepted_added.length === 1 ? "item" : "items"} added`
      : null,
    transition.accepted_removed.length
      ? `${transition.accepted_removed.length} ${transition.accepted_removed.length === 1 ? "item" : "items"} removed`
      : null,
    transition.pending_added.length
      ? `${transition.pending_added.length} awaiting review`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/* One heading per day, in the order rows already arrive — same shape as the
   Repository commits ledger. */
function groupByDay(changes: ScientificChange[]): { label: string; entries: ScientificChange[] }[] {
  const days: { label: string; entries: ScientificChange[] }[] = [];
  for (const change of changes) {
    const label = new Date(change.commit.committed_at).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const current = days.at(-1);
    if (current?.label === label) current.entries.push(change);
    else days.push({ label, entries: [change] });
  }
  return days;
}

export function ScientificChangeFeed({
  changes,
  compact = false,
  plainLanguage = false,
}: {
  changes: ScientificChange[];
  compact?: boolean;
  plainLanguage?: boolean;
}) {
  /* Composition adapted from shadcn.io Pro `dashboard-activity-feed`,
     `timeline-filterable`, and `timeline-commit-log`. The rail distinguishes
     state transitions from ordinary repository commits. */
  /* Grouped by day, the way `/repositories/<slug>/commits` already groups its
     own rows. Two chronological lists of the same objects were reading two
     different ways, and an undated run of "3d ago" is hard to scan for "what
     happened on the day X landed". Headings are skipped in `compact`, where
     the feed is a sidebar preview rather than the page. */
  const days = compact ? null : groupByDay(changes);

  const rows = (entries: ScientificChange[]) => <ol className="relative before:absolute before:bottom-7 before:left-[.8125rem] before:top-7 before:w-px before:bg-border">
    {entries.map(({ repository, commit }) => {
      const transitionSummary = commit.transition && plainLanguage ? plainTransitionSummary(commit.transition) : null;
      const kindBadge = commit.transition
        ? <Badge>{plainLanguage ? "Evidence update" : "State change"}</Badge>
        : <Badge variant="secondary">{plainLanguage ? "Source update" : "Repository commit"}</Badge>;
      return <li key={`${repository.slug}/${commit.sha}`} className={`${compact ? "relative py-3 pl-10" : "relative py-5 pl-10 sm:grid sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:gap-4"} vela-object-row rounded-md pe-2`}>
      <span className={`absolute left-0 top-[.8rem] z-10 grid size-7 place-items-center rounded-full border border-background ring-1 ring-border forced-colors:border-2 ${commit.transition ? "bg-status-evidence/15 text-status-evidence" : "bg-muted text-muted-foreground"}`} aria-hidden><HugeiconsIcon aria-hidden icon={commit.transition ? Activity01Icon : GitCommitIcon} className="size-3.5" /></span>
      {!compact ? <time dateTime={commit.committed_at} title={formatDate(commit.committed_at)} className="text-meta text-muted-foreground">{formatAgo(commit.committed_at)}</time> : null}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link data-slot="text-action" href={`/repositories/${repository.slug}/commits`} className={`${compact ? "text-label" : "text-subtitle"} font-medium underline-offset-4 hover:underline`}>{plainLanguage ? plainChangeTitle(commit.subject) : commit.subject}</Link>
          {/* The kind rides the trailing column on a wide row, not this one.
              Sharing a wrapping flex line with the title meant a long commit
              message pushed it onto its own line, so consecutive rows in the
              same feed put the same badge in two different places. It stays
              inline in the compact variant, which has no trailing column. */}
          {compact ? kindBadge : null}
          {commit.machine ? <Badge variant="outline">{plainLanguage ? "Automated update" : "machine-authored"}</Badge> : null}
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-foreground">
          <Actor name={commit.author_name} kind={commit.machine ? "agent" : "human"} />
          <span aria-hidden>·</span>
          <span>{repository.name}</span>
          {compact ? <><span aria-hidden>·</span><time dateTime={commit.committed_at}>{formatAgo(commit.committed_at)}</time></> : null}
        </div>
        {commit.transition && !plainLanguage ? <p className="mt-2 text-meta">{commit.transition.accepted_added.length} accepted local assertions added · {commit.transition.accepted_removed.length} removed · {commit.transition.pending_added.length} pending added</p> : null}
        {transitionSummary ? <p className="mt-2 text-meta">{transitionSummary}</p> : null}
      </div>
      {!compact ? <div className="mt-2 flex items-center gap-2 sm:mt-0 sm:flex-col sm:items-end sm:gap-1.5">
        {kindBadge}
        <code className="font-mono text-meta text-muted-foreground">{commit.sha.slice(0, 10)}</code>
      </div> : null}
    </li>})}
  </ol>;

  if (!days) return rows(changes);
  return <div className="space-y-6">
    {days.map(({ label, entries }) => <section key={label} aria-label={label}>
      <h3 className="sticky top-0 z-10 bg-background/95 py-1 text-eyebrow text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-background/75">{label}</h3>
      {rows(entries)}
    </section>)}
  </div>;
}
