import Link from "next/link";
import { Badge } from "@vela/ui/components/badge";
import { formatAgo, formatDate } from "@/lib/format";
import type { recentScientificChanges } from "@/lib/scientific-state";

export type ScientificChange = Awaited<ReturnType<typeof recentScientificChanges>>[number];

function plainChangeTitle(subject: string) {
  if (subject === "vela: review review_accept") return "Reviewed evidence was updated";
  if (subject === "vela: verification import") return "A contribution check was recorded";
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
  return <ol className="relative before:absolute before:bottom-5 before:left-[.275rem] before:top-5 before:w-px before:bg-border">
    {changes.map(({ repository, commit }) => {
      const transitionSummary = commit.transition && plainLanguage ? plainTransitionSummary(commit.transition) : null;
      return <li key={`${repository.slug}/${commit.sha}`} className={compact ? "relative py-3 pl-6" : "relative py-5 pl-8 sm:grid sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:gap-4"}>
      <span className={`absolute left-0 top-[1.45rem] z-10 size-2.5 rounded-full border-2 border-background ${commit.transition ? "bg-foreground/70" : "bg-muted-foreground/45"}`} aria-hidden />
      {!compact ? <time dateTime={commit.committed_at} title={formatDate(commit.committed_at)} className="text-meta text-muted-foreground">{formatAgo(commit.committed_at)}</time> : null}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/repositories/${repository.slug}/commits`} className={`${compact ? "text-label" : "text-subtitle"} font-medium underline-offset-4 hover:underline`}>{plainLanguage ? plainChangeTitle(commit.subject) : commit.subject}</Link>
          {commit.transition
            ? <Badge>{plainLanguage ? "Evidence update" : "State change"}</Badge>
            : <Badge variant="secondary">{plainLanguage ? "Source update" : "Repository commit"}</Badge>}
          {commit.machine ? <Badge variant="outline">{plainLanguage ? "Automated update" : "machine-authored"}</Badge> : null}
        </div>
        <p className="mt-1 text-meta text-muted-foreground">{repository.name}{compact ? ` · ${formatAgo(commit.committed_at)}` : ` · ${commit.author_name}`}</p>
        {commit.transition && !plainLanguage ? <p className="mt-2 text-meta">{commit.transition.accepted_added.length} accepted local assertions added · {commit.transition.accepted_removed.length} removed · {commit.transition.pending_added.length} pending added</p> : null}
        {transitionSummary ? <p className="mt-2 text-meta">{transitionSummary}</p> : null}
      </div>
      {!compact ? <code className="mt-2 font-mono text-meta text-muted-foreground sm:mt-0">{commit.sha.slice(0, 10)}</code> : null}
    </li>})}
  </ol>;
}
