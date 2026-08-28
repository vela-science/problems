import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight01Icon as ArrowRight, Telescope01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { listFollowedProblems, type FollowedProblem } from "@vela/activity-data";
import { scientificAnchorRoot, type ScientificAnchor } from "@vela/activity-data/contracts";
import { slugForRepositoryId } from "@vela/projection-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vela/ui/components/empty";
import { PageShell } from "@vela/ui/vela/page-shell";
import { formatDate } from "@/lib/format";
import { currentActivityAccount } from "@/lib/hosted-account";
import { problemWatch, problemWatchSentence, type ProblemWatch } from "@/lib/problem-watch";
import { discoveredProblems, scientificProblemState } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Watching",
  description: "Scientific questions you follow, and what has moved on their records since you started.",
  robots: { index: false, follow: false },
};

/* A researcher's relationship with an open question lasts years, and until now
   this product could only be visited. Reading a whole account's follows at once
   is the read the store never had; everything a row says is still derived at
   read time by comparing two exact states. */
const LIMIT = 24;

type Row = {
  key: string;
  label: string;
  collection: string;
  href: string | null;
  followedAt: string;
  workspaceName: string;
  watch: ProblemWatch | null;
  /* The retained anchor no longer resolves in the current catalogue. Said
     rather than dropped: a follow that silently disappears is worse than one
     that reports it cannot be placed. */
  unresolved: boolean;
};

async function rowFor(follow: FollowedProblem, catalog: Awaited<ReturnType<typeof discoveredProblems>>): Promise<Row> {
  const base = {
    key: `${follow.workspaceId}:${follow.anchor.root}`,
    followedAt: follow.followedAt,
    workspaceName: follow.workspaceName,
  };
  const slug = slugForRepositoryId(follow.anchor.repositoryId);
  const matches = slug
    ? catalog.filter((problem) => problem.repository === slug && problem.record.node_id === follow.anchor.problemId)
    : [];
  const entry = matches.length === 1 ? matches[0] : null;
  if (!entry?.canonicalPath || !slug) {
    return { ...base, label: "Problem context unavailable", collection: "", href: null, watch: null, unresolved: true };
  }
  const label = entry.record.label || `Problem ${entry.problem}`;
  const collection = entry.collection?.name ?? "";
  try {
    const state = await scientificProblemState(slug, entry.problem);
    if (!state) throw new Error("the current release does not retain this Problem");
    const watch = await problemWatch(state, {
      anchors: [follow.anchor],
      following: follow.anchor.root === scientificAnchorRoot(state.anchor as ScientificAnchor),
      followedAnchorRoots: [follow.anchor.root],
    });
    return { ...base, label, collection, href: entry.canonicalPath, watch, unresolved: false };
  } catch {
    return { ...base, label, collection, href: entry.canonicalPath, watch: null, unresolved: true };
  }
}

export default async function WatchingPage() {
  const account = await currentActivityAccount();
  if (!account) redirect("/sign-in?returnTo=/watching");

  let follows: FollowedProblem[] | null = null;
  try {
    follows = await listFollowedProblems(account.activity.id);
  } catch {
    follows = null;
  }

  const catalog = follows?.length
    ? await discoveredProblems().catch(() => null)
    : [];
  const shown = follows ? follows.slice(0, LIMIT) : [];
  const rows = catalog ? await Promise.all(shown.map((follow) => rowFor(follow, catalog))) : null;
  const moved = rows?.filter((row) => row.watch) ?? [];

  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-8">
    <header className="flex flex-wrap items-start justify-between gap-5 border-b pb-7">
      <div>
        <h1 className="text-display">Watching</h1>
        {/* What a watch is, and what it refuses to become. Both belong here:
            a reader deciding whether to follow anything is deciding whether
            this product is going to start competing for their attention. */}
        <p className="mt-2 max-w-2xl text-body text-muted-foreground">Questions you follow, and what has moved on their records since.</p>
      </div>
      <Button variant="outline" nativeButton={false} render={<Link href="/problems" />}>Find a Problem</Button>
    </header>

    {follows === null || rows === null ? <Empty className="border-0">
      <EmptyHeader>
        <EmptyTitle>Your watches could not be loaded</EmptyTitle>
        <EmptyDescription>Your sign-in is intact. Public Problems and Results are unaffected.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Button variant="outline" nativeButton={false} render={<Link href="/problems" />}>Browse Problems</Button></EmptyContent>
    </Empty> : rows.length ? <section aria-label="Questions you follow" className="flex flex-col gap-5">
      <p className="text-meta text-muted-foreground">
        {moved.length
          ? `${moved.length} of ${rows.length} ${moved.length === 1 ? "record has" : "records have"} moved since you started watching.`
          : `${rows.length} ${rows.length === 1 ? "record" : "records"}, none of them moved since you started watching.`}
        {follows.length > rows.length ? ` Showing the ${rows.length} most recent of ${follows.length}.` : ""}
      </p>
      <div className="vela-object-surface overflow-hidden">
        <ul className="divide-y">
          {rows.map((row) => <li key={row.key}>
            <WatchRow row={row} />
          </li>)}
        </ul>
      </div>
    </section> : <Empty className="border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><HugeiconsIcon icon={Telescope01Icon} aria-hidden /></EmptyMedia>
        <EmptyTitle>You are not watching anything yet</EmptyTitle>
        <EmptyDescription>Follow a question from its Work section.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Button nativeButton={false} render={<Link href="/problems" />}>Browse Problems <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button></EmptyContent>
    </Empty>}
  </PageShell>;
}

function WatchRow({ row }: { row: Row }) {
  const body = <>
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="min-w-0 text-compact font-medium">{row.label}</p>
      {row.watch ? <Badge variant="secondary">Moved</Badge> : row.unresolved ? <Badge variant="outline">Unresolved</Badge> : null}
    </div>
    <p className="mt-1.5 text-meta text-muted-foreground">
      {row.watch
        ? problemWatchSentence(row.watch)
        : row.unresolved
          ? "The exact state you followed does not resolve in the current catalogue, so this page cannot compare it."
          : "Reaches exactly as far as it did when you started watching."}
    </p>
    <p className="mt-1 text-micro text-muted-foreground">
      {row.collection ? `${row.collection} · ` : ""}Watching since {formatDate(row.followedAt)} · {row.workspaceName}
    </p>
  </>;
  return row.href
    ? <Link href={`${row.href}/work`} className="vela-object-row block px-4 py-3.5">{body}</Link>
    : <div className="px-4 py-3.5">{body}</div>;
}
