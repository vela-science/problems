import Link from "next/link";
import {
  ArrowRight01Icon as ArrowRight,
  Github01Icon,
  LinkSquare02Icon,
  Logout01Icon,
  SecurityCheckIcon,
  SourceCodeIcon,
  UserCircle02Icon,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Avatar, AvatarFallback } from "@vela/ui/components/avatar";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@vela/ui/components/item";
import { signOutAccount } from "@/app/actions/auth";
import type { AccountIdentity } from "@/lib/auth";
import type { PublicProfile } from "@/lib/hosted-account";

type Result<T> = { status: "ready"; value: T } | { status: "unavailable" };

type AccountWorkspace = {
  id: string;
  slug: string;
  name: string;
  role: "owner" | "member";
  updatedAt: string;
};

type AccountConnections = {
  installations: Array<{ installationId: number; suspended: boolean }>;
  repositories: Array<{ installationId: number }>;
  codebases: Array<{
    id: string;
    fullName: string;
    visibility: "public" | "private" | "internal";
    inspectionStatus: "connected" | "structurally_inspected" | "natively_verified" | "unsupported";
    syncState: "pinned" | "branch_moved" | "unavailable";
  }>;
};

export type AccountProfileData = {
  account: AccountIdentity;
  publicProfile: Result<PublicProfile | null>;
  workspaces: Result<AccountWorkspace[]>;
  connections: Result<{
    githubIdentityConnected: boolean;
    githubAppEnabled: boolean;
    data: AccountConnections;
  }>;
};

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/* Sections are separated by a rule, not by a raised panel.
 *
 * This page carried six `vela-object-surface` cards, two of them holding a
 * dashed box inside — nested panels and card soup in one screen, both named in
 * DESIGN.md as things not to do. Its own children, `/account/connections` and
 * `/account/profile`, already use a flat section with a rule under the
 * heading; this page was the outlier, so it follows them now. */
function Section({ id, title, description, action, children }: {
  id: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  /* No section measure. The page header is full width, so a `max-w-3xl` here
     put two different widths on one page — the intro rule ran past every
     section rule beneath it — and left the account sitting in the left 45% of
     a wide window. The shell owns the frame; prose below keeps its own
     measure. */
  return <section aria-labelledby={id} className="min-w-0">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      <div>
        <h2 id={id} className="text-title">{title}</h2>
        <p className="mt-1 max-w-2xl text-meta text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
    {children}
  </section>;
}

/* One row per destination, carrying the state a reader came to check.
 *
 * The two lists that used to live here restated `/my-work` — which is in the
 * sidebar on every page — and `/account/connections`, one click away. Showing
 * the first four of each meant a reader met the same rows three times, and on
 * an account with nothing in it met four separate empty boxes saying so.
 * AGENTS.md: "Treat redundancy as a product defect." The count is the useful
 * part, so the count is what stays. */
function DestinationRow({ href, icon, title, state, detail }: {
  href: string;
  icon: typeof WorkIcon;
  title: string;
  state: React.ReactNode;
  detail: string;
}) {
  return <Item className="vela-object-row rounded-none border-0 px-0 py-5" render={<Link href={href} />}>
    <ItemMedia variant="icon" className="size-10 rounded-md bg-muted/60"><HugeiconsIcon icon={icon} aria-hidden /></ItemMedia>
    <ItemContent>
      <ItemTitle className="line-clamp-none flex-wrap">{title} {state}</ItemTitle>
      <ItemDescription className="line-clamp-none">{detail}</ItemDescription>
    </ItemContent>
    <ItemActions><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 text-muted-foreground transition-transform duration-150 group-hover/item:translate-x-0.5" /></ItemActions>
  </Item>;
}

function workspaceState(result: AccountProfileData["workspaces"]) {
  if (result.status === "unavailable") return { badge: <Badge variant="secondary">Unavailable</Badge>, detail: "Your session is intact; saved work could not be read just now." };
  const count = result.value.length;
  return {
    badge: count ? <Badge variant="secondary">{countLabel(count, "workspace")}</Badge> : null,
    detail: count
      ? `Most recent: ${result.value[0]?.name ?? "untitled"}`
      : "No workspace yet. Open a Problem and choose Work to start one.",
  };
}

function connectionState(result: AccountProfileData["connections"]) {
  if (result.status === "unavailable") return { badge: <Badge variant="secondary">Unavailable</Badge>, detail: "Try the Connections page again before importing repository work." };
  const { githubIdentityConnected, githubAppEnabled, data } = result.value;
  const live = data.installations.filter((installation) => !installation.suspended);
  const accessible = data.repositories.filter((repository) => live.some((installation) => installation.installationId === repository.installationId)).length;
  return {
    badge: githubIdentityConnected ? <Badge>GitHub linked</Badge> : <Badge variant="secondary">GitHub not linked</Badge>,
    detail: githubAppEnabled
      ? `${countLabel(accessible, "selected repository", "selected repositories")} · ${countLabel(data.codebases.length, "retained codebase")}`
      : "Repository access is not configured in this environment.",
  };
}

export function AccountProfile({ account, publicProfile, workspaces, connections }: AccountProfileData) {
  const work = workspaceState(workspaces);
  const connection = connectionState(connections);
  const profile = publicProfile.status === "ready" ? publicProfile.value : null;

  return <>
    <header className="border-b pb-7">
      <p className="text-eyebrow text-muted-foreground">Private account</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Avatar className="size-14 bg-primary/8">
          <AvatarFallback className="text-title font-medium text-foreground">{account.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-display break-words">{account.displayName}</h1>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-meta text-muted-foreground">
            <span className="truncate">{account.email}</span>
            <Badge variant="outline">Visible only to you</Badge>
          </p>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-body text-muted-foreground">
        This account signs you in and holds your private work. It never carries scientific authority: each Result keeps its own attribution, and a Decision is made through a Repository.
      </p>
    </header>

    <Section
      id="account-public-profile-heading"
      title="Public contributor profile"
      description="What, if anything, appears publicly beside exact attribution. Presentation only — never scientific identity or review independence."
      action={<div className="flex flex-wrap gap-2">
        {profile ? <Button className="min-h-11 sm:min-h-8" size="sm" variant="outline" nativeButton={false} render={<Link href={`/people/${profile.handle}`} />}>Preview</Button> : null}
        <Button className="min-h-11 sm:min-h-8" size="sm" nativeButton={false} render={<Link href="/account/profile" />}>{profile ? "Edit profile" : "Create profile"}</Button>
      </div>}
    >
      {publicProfile.status === "unavailable"
        ? <Alert className="mt-5"><AlertTitle>Public profile settings are unavailable</AlertTitle><AlertDescription>Your private account and scientific attribution are unchanged.</AlertDescription></Alert>
        : <p className="mt-5 text-body text-muted-foreground">
            {profile
              ? <>Published at <span className="font-mono text-foreground">problems.science/people/{profile.handle}</span>, currently <span className="text-foreground">{profile.visibility}</span>.</>
              : "No public profile has been created. Your work stays attributable without one."}
          </p>}
    </Section>

    <Section
      id="account-destinations-heading"
      title="Your work and access"
      description="Both live on their own pages; this is where they stand."
    >
      <ItemGroup className="divide-y gap-0">
        <DestinationRow href="/my-work" icon={WorkIcon} title="My work" state={work.badge} detail={work.detail} />
        <DestinationRow href="/account/connections" icon={SourceCodeIcon} title="Connections" state={connection.badge} detail={connection.detail} />
      </ItemGroup>
    </Section>

    <Section
      id="session-heading"
      title="Session and security"
      description="Signed in on this browser. Name and email come from your connected sign-in provider."
    >
      <ItemGroup className="divide-y gap-0">
        <Item className="rounded-none border-0 px-0 py-5">
          <ItemMedia variant="icon" className="size-10 rounded-md bg-muted/60"><HugeiconsIcon icon={SecurityCheckIcon} aria-hidden /></ItemMedia>
          <ItemContent>
            <ItemTitle className="line-clamp-none flex-wrap">WorkOS sign-in <Badge>Connected</Badge></ItemTitle>
            <ItemDescription className="line-clamp-none">{account.displayName} · {account.email}</ItemDescription>
          </ItemContent>
        </Item>
        <Item className="rounded-none border-0 px-0 py-5">
          <ItemMedia variant="icon" className="size-10 rounded-md bg-muted/60"><HugeiconsIcon icon={connections.status === "ready" && connections.value.githubIdentityConnected ? Github01Icon : LinkSquare02Icon} aria-hidden /></ItemMedia>
          <ItemContent>
            <ItemTitle className="line-clamp-none flex-wrap">Scientific attribution <Badge variant="outline">Separate</Badge></ItemTitle>
            <ItemDescription className="line-clamp-none">Signing in controls this account only. It does not confer authorship, review independence, or Repository authority.</ItemDescription>
          </ItemContent>
        </Item>
        <Item className="rounded-none border-0 px-0 py-5">
          <ItemMedia variant="icon" className="size-10 rounded-md bg-muted/60"><HugeiconsIcon icon={UserCircle02Icon} aria-hidden /></ItemMedia>
          <ItemContent>
            <ItemTitle className="line-clamp-none">Account data</ItemTitle>
            <ItemDescription className="line-clamp-none"><Link href="/privacy" className="font-medium text-foreground underline underline-offset-4">How account data is handled</Link></ItemDescription>
          </ItemContent>
          <ItemActions>
            <form action={signOutAccount}>
              <Button className="min-h-11 sm:min-h-8" type="submit" size="sm" variant="outline"><HugeiconsIcon icon={Logout01Icon} aria-hidden />Sign out</Button>
            </form>
          </ItemActions>
        </Item>
      </ItemGroup>
    </Section>
  </>;
}
