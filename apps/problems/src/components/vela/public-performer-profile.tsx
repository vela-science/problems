import Link from "next/link";
import { ArrowRight01Icon, LinkSquare02Icon, UserCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar, AvatarFallback } from "@vela/ui/components/avatar";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { AssertionText } from "@/components/vela/assertion-text";
import { exactResultHeadline } from "@/components/vela/problem-overview-reference";
import { formatDate } from "@/lib/format";
import type { PublicProfile } from "@/lib/hosted-account";
import type { PublicPerformerActivity, PublicPerformerKind } from "@/lib/performer-activity";
import { Disclosure } from "@/components/vela/disclosure";

function initials(name: string, kind: PublicPerformerKind | "account") {
  if (kind === "agent") return "AI";
  if (kind === "organization") return "ORG";
  return name.split(/[:\s._-]+/u).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function performerKindLabel(kind: PublicPerformerKind | "account") {
  if (kind === "agent") return "Agent or tool";
  if (kind === "organization") return "Organization";
  if (kind === "human") return "Human performer";
  if (kind === "account") return "Contributor profile";
  return "Performer kind not retained";
}

/* What this performer has done here, counted rather than scored.
 *
 * The page already loads every attributed row — role, state, question,
 * collection, timestamp — and showed one number from it: "4 attributed roles".
 * A profile's job is to answer "what has this performer done here" before the
 * reader opens a single card, and every part of that answer was already in
 * memory.
 *
 * Tallies only. No score, no ranking, no reputation: PRODUCT.md refuses those,
 * and a profile is the surface where they would appear first. */
type ActivityLedger = {
  roles: Array<{ label: string; count: number }>;
  questions: number;
  collections: string[];
  first: string | null;
  latest: string | null;
};

function summarizeActivity(activity: PublicPerformerActivity[]): ActivityLedger {
  const roles = new Map<string, number>();
  const questions = new Set<string>();
  const collections = new Set<string>();
  const dates: string[] = [];
  for (const entry of activity) {
    roles.set(entry.role, (roles.get(entry.role) ?? 0) + 1);
    questions.add(entry.problemHref);
    if (entry.collectionLabel) collections.add(entry.collectionLabel);
    if (entry.occurredAt) dates.push(entry.occurredAt);
  }
  dates.sort();
  return {
    /* The product's own three roles, in the order the record acquires them.
       Counted under a plain noun: "2 Result performer" reads as a broken
       plural, and the role's full name is already the row's own vocabulary. */
    roles: ([
      ["Result performer", "Results"],
      ["Decision performer", "Decisions"],
      ["Advisory check", "Checks"],
    ] as const).map(([role, label]) => ({ label, count: roles.get(role) ?? 0 })),
    questions: questions.size,
    collections: [...collections],
    first: dates[0] ?? null,
    latest: dates.at(-1) ?? null,
  };
}

/* What this performer did to one object, from its roles and the state the
   record carries. A restatement, not a summary: every clause maps to a row. */
function actLine(roles: string[], state: string): string {
  const decided = roles.includes("Decision performer");
  const produced = roles.includes("Result performer");
  const checked = roles.includes("Advisory check");
  const ruling = state === "accepted" ? "Accepted" : state === "rejected" ? "Rejected" : `Decided (${state.replaceAll("_", " ")})`;
  const parts: string[] = [];
  if (produced && decided) parts.push(`Produced this Result and ${ruling.toLocaleLowerCase("en-US")} it`);
  else if (decided) parts.push(`${ruling} this Result`);
  else if (produced) parts.push("Produced this Result");
  if (checked) parts.push(parts.length ? "ran an advisory check" : "Ran an advisory check");
  return parts.join(", and ") || "Attributed on this record";
}

function ActivityRows({ activity }: { activity: PublicPerformerActivity[] }) {
  if (!activity.length) return <div className="rounded-lg border border-dashed p-6">
    <h2 className="text-subtitle font-medium">No linked public activity</h2>
    <p className="mt-2 max-w-xl text-body text-muted-foreground">No current Result, Decision, or advisory check is joined to this profile by an exact verified performer link.</p>
    <Button className="mt-5" variant="outline" nativeButton={false} render={<Link href="/problems" />}>Browse Problems</Button>
  </div>;
  const groups = [...activity.reduce((byObject, entry) => {
    const key = `${entry.problemHref}\0${entry.objectHref}`;
    const current = byObject.get(key);
    if (current) current.push(entry);
    else byObject.set(key, [entry]);
    return byObject;
  }, new Map<string, PublicPerformerActivity[]>()).values()];
  return <ol className="relative space-y-0 before:absolute before:bottom-6 before:left-[1.125rem] before:top-6 before:w-px before:bg-border">
    {groups.map((entries) => {
      const entry = entries[0]!;
      const roles = [...new Set(entries.map(({ role }) => role))];
      const states = [...new Set(entries.map(({ state }) => state))];
      const limitations = entries.filter(({ limitation }) => limitation).map(({ role, limitation }) => ({ role, limitation: limitation! }));
      const objectLabel = exactResultHeadline(entry.objectLabel) ?? entry.objectLabel;
      const occurredAt = entries.map(({ occurredAt }) => occurredAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
      return <li key={`${entry.problemHref}:${entry.objectHref}`} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
      <span className="relative z-10 mt-4 grid size-9 place-items-center rounded-full border bg-background text-primary"><HugeiconsIcon icon={UserCircle02Icon} aria-hidden className="size-4" /></span>
      <article className="vela-object-surface vela-object-row min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">{states.map((state) => <Badge key={state} variant="secondary">{state.replaceAll("_", " ")}</Badge>)}</div>
          <time className="text-meta text-muted-foreground" dateTime={occurredAt ?? undefined}>{formatDate(occurredAt)}</time>
        </div>
        <div className="p-4">
          {/* The act leads. Both cards on a two-row profile opened with the
              same Problem statement, so the part that varies between rows —
              what this performer actually did — was the smallest text on it.
              The question drops to one truncated line of context, which is
              what it is on a page about a performer. */}
          <h3 className="text-subtitle font-medium">{actLine(roles, entry.state)}</h3>
          <p className="mt-1.5 truncate text-meta text-muted-foreground">
            <Link data-slot="text-action" href={entry.problemHref} className="hover:underline">
              {entry.collectionLabel}
            </Link>
            {" · "}<AssertionText text={entry.problemLabel} />
          </p>
          <p className="mt-2 text-body text-muted-foreground"><AssertionText text={objectLabel} /></p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href={entry.objectHref} className="inline-flex min-h-8 items-center gap-1 text-meta font-medium text-primary hover:underline">Open exact context <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-3.5" /></Link>
            {limitations.length ? <Disclosure className="text-meta" summaryClassName="min-h-8 font-medium text-foreground" summary={limitations.length === 1 ? "Role scope" : `${limitations.length} role details`}><ul className="mt-2 space-y-2 text-muted-foreground">{limitations.map(({ role, limitation }, index) => <li key={`${role}:${index}`}><span className="font-medium text-foreground">{role}:</span> {limitation}</li>)}</ul></Disclosure> : null}
          </div>
        </div>
      </article>
    </li>;
    })}
  </ol>;
}

export function PublicPerformerProfile({
  profile,
  performer,
  activity,
}: {
  profile: PublicProfile | null;
  performer: { id: string; name: string; kind: PublicPerformerKind } | null;
  activity: PublicPerformerActivity[];
}) {
  const name = profile?.displayName ?? performer?.name ?? "Unknown performer";
  const kind: PublicPerformerKind | "account" = performer?.kind ?? "account";
  const links = profile ? Object.entries(profile.links) : [];

  const avatar = <Avatar className={`${profile ? "size-20" : "size-14"} shrink-0 ${kind === "agent" ? "rounded-xl vela-machine-mark" : "bg-primary/8"}`}>
    <AvatarFallback className={kind === "agent" ? "rounded-xl text-label font-semibold" : "text-title"}>{initials(name, kind)}</AvatarFallback>
  </Avatar>;
  const badges = <div className="flex flex-wrap gap-2">
    <Badge>{performerKindLabel(kind)}</Badge>
    {profile?.ownerPreview ? <Badge variant="secondary">Private preview</Badge> : null}
    {profile?.visibility === "unlisted" ? <Badge variant="outline">Unlisted</Badge> : null}
  </div>;
  const exactIdentity = performer
    ? <Disclosure className="text-meta" summaryClassName="min-h-8 font-medium" summary="Exact performer identity"><p className="mt-2 break-all font-mono text-micro text-muted-foreground">{performer.id}</p></Disclosure>
    : null;

  const ledger = summarizeActivity(activity);
  const attributed = ledger.roles.reduce((total, role) => total + role.count, 0);
  const span = ledger.first && ledger.latest
    ? ledger.first.slice(0, 10) === ledger.latest.slice(0, 10)
      ? formatDate(ledger.latest)
      : `${formatDate(ledger.first)} – ${formatDate(ledger.latest)}`
    : null;
  /* One sentence, every clause a tally. */
  const summary = attributed ? [
    `${attributed} attributed ${attributed === 1 ? "role" : "roles"}`,
    `on ${ledger.questions} ${ledger.questions === 1 ? "question" : "questions"}`,
    ledger.collections.length ? `in ${ledger.collections.join(" and ")}` : null,
  ].filter(Boolean).join(" ") : null;

  const activityPanel = <section className="min-w-0" aria-labelledby="public-activity-heading">
    {/* The count moved into the summary below, where it carries the
        questions and the span with it, and the three-role ledger under
        that shows the roles distinctly — so the sentence saying they stay
        distinct is the picture's own caption. */}
    <div className="mb-4 border-b pb-3"><h2 id="public-activity-heading" className="text-title">Public activity</h2></div>
    {summary ? <div className="mb-5 flex flex-col gap-3">
      <p className="text-body">{summary}{span ? <span className="text-muted-foreground">{" · "}{span}</span> : null}</p>
      <dl className="grid grid-cols-3 gap-2">
        {ledger.roles.map((role) => <div key={role.label} className="rounded-lg border px-3 py-2.5">
          <dd className="font-mono text-title tabular-nums">{role.count}</dd>
          <dt className="mt-0.5 text-micro text-muted-foreground">{role.label}</dt>
        </div>)}
      </dl>
    </div> : null}
    <ActivityRows activity={activity} />
  </section>;

  /* A performer with no hosted profile gets a header, not a rail.
   *
   * The rail is 17rem wide and exists to hold a bio, an affiliation and
   * declared links. A bare performer — which is what every attributed identity
   * in the record actually is — has none of those, so the rail held an avatar,
   * a name, one badge and a disclosure: 172px of content in a 272px column,
   * beside an activity list that had been clamped to two lines a block. The
   * page truncated its only real content to protect a column that was empty. */
  if (!profile) return <div className="flex flex-col gap-8">
    {/* No aria-label: inside `<main>` a `<header>` is generic, so a label on it
        names nothing. The h1 names this page, exactly as on /account. */}
    <header className="flex flex-wrap items-center gap-4 border-b pb-6">
      {avatar}
      <div className="min-w-0">
        <h1 className="break-words text-display">{name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">{badges}{exactIdentity}</div>
      </div>
    </header>
    {activityPanel}
  </div>;

  return <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
    <aside className="lg:sticky lg:top-16" aria-label="Contributor identity">
      {avatar}
      <h1 className="mt-4 break-words text-display">{name}</h1>
      <div className="mt-2">{badges}</div>
      <p className="mt-3 text-meta text-muted-foreground">Account presentation; scientific attribution is linked only from exact performer records.</p>
      {profile.affiliation ? <p className="mt-4 text-body font-medium">{profile.affiliation}</p> : null}
      {profile.bio ? <p className="mt-3 text-body leading-6 text-muted-foreground">{profile.bio}</p> : null}
      {links.length ? <ul className="mt-5 space-y-2">{links.map(([linkKind, href]) => <li key={linkKind}><a href={href} rel={linkKind === "lab" ? "noreferrer" : "me noreferrer"} className="inline-flex max-w-full items-center gap-2 text-meta font-medium text-primary hover:underline"><HugeiconsIcon icon={LinkSquare02Icon} aria-hidden className="size-4 shrink-0" /><span className="truncate capitalize">{linkKind}</span></a></li>)}</ul> : null}
      {exactIdentity ? <div className="mt-5">{exactIdentity}</div> : null}
      {profile.ownerPreview ? <Button className="mt-5 w-full" variant="outline" nativeButton={false} render={<Link href="/account/profile" />}>Edit profile</Button> : null}
    </aside>
    {activityPanel}
  </div>;
}
