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
          <div className="flex flex-wrap items-center gap-2">{roles.map((role) => <Badge key={role} variant="outline">{role}</Badge>)}{states.map((state) => <Badge key={state} variant="secondary">{state.replaceAll("_", " ")}</Badge>)}</div>
          <time className="text-meta text-muted-foreground" dateTime={occurredAt ?? undefined}>{formatDate(occurredAt)}</time>
        </div>
        <div className="p-4">
          <Link href={entry.problemHref} className="inline-flex min-h-8 items-center text-meta font-medium text-primary hover:underline">{entry.collectionLabel}</Link>
          <h3 className="mt-1 text-subtitle font-medium"><Link data-slot="text-action" href={entry.problemHref} className="hover:underline"><AssertionText text={entry.problemLabel} /></Link></h3>
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

  const activityPanel = <section className="min-w-0" aria-labelledby="public-activity-heading">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b pb-4"><div><h2 id="public-activity-heading" className="text-title">Public activity</h2><p className="mt-1 text-meta text-muted-foreground">Exact Results, Decisions, and advisory checks. Each role remains distinct.</p></div>{activity.length ? <span className="text-meta text-muted-foreground">{activity.length} attributed {activity.length === 1 ? "role" : "roles"}</span> : null}</div>
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
