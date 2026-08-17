import Link from "next/link";
import {
  ArrowRight01Icon as ArrowRight,
  Github01Icon,
  LinkSquare02Icon,
  Logout01Icon,
  Mail01Icon,
  SecurityCheckIcon,
  SourceCodeIcon,
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
import { formatDate } from "@/lib/format";

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

function SectionHeading({ id, title, description, action }: {
  id: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
    <div>
      <h2 id={id} className="text-title">{title}</h2>
      <p className="mt-1 max-w-2xl text-meta text-muted-foreground">{description}</p>
    </div>
    {action}
  </div>;
}

function EmptyWork() {
  return <div className="border-b py-8">
    <p className="text-eyebrow uppercase text-muted-foreground">Nothing retained yet</p>
    <h3 className="mt-2 text-subtitle font-medium">Start from a Problem</h3>
    <p className="mt-2 max-w-xl text-body text-muted-foreground">Choose a question, review what is known, then retain an approach or result when you are ready.</p>
    <Button className="mt-5 min-h-11 sm:min-h-8" nativeButton={false} render={<Link href="/problems" />}>Browse Problems</Button>
  </div>;
}

function Workspaces({ result }: { result: AccountProfileData["workspaces"] }) {
  if (result.status === "unavailable") return <Alert className="my-5">
    <AlertTitle>Your work could not be loaded</AlertTitle>
    <AlertDescription>Your session is still active. Public Problems and Contributions remain available.</AlertDescription>
  </Alert>;
  if (!result.value.length) return <EmptyWork />;
  return <ItemGroup className="divide-y gap-0">
    {result.value.slice(0, 4).map((workspace) => <Item key={workspace.id} className="rounded-none border-0 px-0 py-4">
      <ItemMedia variant="icon" className="mt-0.5 size-9 rounded-md bg-muted/60"><HugeiconsIcon icon={WorkIcon} aria-hidden /></ItemMedia>
      <ItemContent>
        <ItemTitle className="line-clamp-none flex-wrap">{workspace.name}<Badge variant="secondary">{workspace.role}</Badge></ItemTitle>
        <ItemDescription>Updated {formatDate(workspace.updatedAt)} · retained workspace {workspace.slug}</ItemDescription>
      </ItemContent>
    </Item>)}
  </ItemGroup>;
}

function Codebases({ result }: { result: AccountProfileData["connections"] }) {
  if (result.status === "unavailable") return <Alert className="my-5">
    <AlertTitle>Codebase connections are unavailable</AlertTitle>
    <AlertDescription>Your account remains signed in. Try Connections again before importing private repository work.</AlertDescription>
  </Alert>;
  if (!result.value.data.codebases.length) return <div className="border-b py-8">
    <p className="text-eyebrow uppercase text-muted-foreground">No connected codebases</p>
    <h3 className="mt-2 text-subtitle font-medium">Bring in an exact Git revision</h3>
    <p className="mt-2 max-w-xl text-body text-muted-foreground">Inspect a public GitHub URL now, or connect selected repository access first.</p>
    <Button className="mt-5 min-h-11 sm:min-h-8" variant="outline" nativeButton={false} render={<Link href="/import" />}>Import a codebase</Button>
  </div>;
  return <ItemGroup className="divide-y gap-0">
    {result.value.data.codebases.slice(0, 4).map((codebase) => <Item key={codebase.id} className="group rounded-none border-0 px-0 py-4" render={<Link href={`/codebases/${codebase.id}`} />}>
      <ItemMedia variant="icon" className="mt-0.5 size-9 rounded-md bg-muted/60"><HugeiconsIcon icon={SourceCodeIcon} aria-hidden /></ItemMedia>
      <ItemContent>
        <ItemTitle className="line-clamp-none flex-wrap">{codebase.fullName}<Badge variant="outline">{codebase.visibility}</Badge></ItemTitle>
        <ItemDescription>{codebase.inspectionStatus.replaceAll("_", " ")} · {codebase.syncState.replaceAll("_", " ")}</ItemDescription>
      </ItemContent>
      <ItemActions><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" /></ItemActions>
    </Item>)}
  </ItemGroup>;
}

function ConnectionRow({ icon, title, description, status }: {
  icon: typeof Github01Icon;
  title: string;
  description: string;
  status: React.ReactNode;
}) {
  return <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b py-4 last:border-b-0">
    <div className="flex size-9 items-center justify-center rounded-md bg-muted/60 text-muted-foreground"><HugeiconsIcon icon={icon} aria-hidden className="size-4" /></div>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="text-label font-medium">{title}</h3>
        {status}
      </div>
      <p className="mt-1 text-meta text-muted-foreground">{description}</p>
    </div>
  </div>;
}

export function AccountProfile({ account, workspaces, connections }: AccountProfileData) {
  const connection = connections.status === "ready" ? connections.value : null;
  const installations = connection?.data.installations ?? [];
  const accessibleRepositories = connection?.data.repositories.filter((repository) =>
    installations.some((installation) => installation.installationId === repository.installationId && !installation.suspended),
  ).length ?? 0;

  return <>
    <header className="border-b pb-8">
      <p className="text-eyebrow uppercase text-muted-foreground">Private account</p>
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar className="size-16 bg-primary/8 sm:size-20">
          <AvatarFallback className="text-title font-medium text-foreground">{account.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-display break-words">{account.displayName}</h1>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-meta text-muted-foreground">
            <HugeiconsIcon icon={Mail01Icon} aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{account.email}</span>
            <Badge variant="outline">Visible only to you</Badge>
          </div>
          <p className="mt-3 max-w-2xl text-body text-muted-foreground">Use this account for personal work and imports. Scientific attribution stays with each Contribution; repository authority stays in its Repository.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:self-end">
          <Button className="min-h-11 sm:min-h-8" nativeButton={false} render={<Link href="/my-work" />}>My work</Button>
          <Button className="min-h-11 sm:min-h-8" variant="outline" nativeButton={false} render={<Link href="/account/connections" />}>Manage connections</Button>
        </div>
      </div>
    </header>

    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
      <div className="space-y-10">
        <section aria-labelledby="account-work-heading">
          <SectionHeading id="account-work-heading" title="Continue your work" description="Private workspaces retained for questions you are exploring." action={workspaces.status === "ready" && workspaces.value.length ? <Button className="min-h-11 sm:min-h-7" size="sm" variant="ghost" nativeButton={false} render={<Link href="/my-work" />}>View all</Button> : undefined} />
          <Workspaces result={workspaces} />
        </section>

        <section aria-labelledby="account-codebases-heading">
          <SectionHeading id="account-codebases-heading" title="Connected codebases" description="Exact revisions you inspected or retained from GitHub." action={<Button className="min-h-11 sm:min-h-7" size="sm" variant="ghost" nativeButton={false} render={<Link href="/import" />}>Import</Button>} />
          <Codebases result={connections} />
        </section>
      </div>

      <aside className="space-y-8" aria-label="Account status and security">
        <section aria-labelledby="connections-heading">
          <div className="flex items-end justify-between gap-3 border-b pb-3">
            <div>
              <p className="text-eyebrow uppercase text-muted-foreground">Access</p>
              <h2 id="connections-heading" className="mt-1 text-subtitle font-medium">Connections</h2>
            </div>
            <Link href="/account/connections" className="text-meta font-medium underline-offset-4 hover:underline">Manage</Link>
          </div>
          <ConnectionRow icon={SecurityCheckIcon} title="WorkOS" description="Current sign-in identity" status={<Badge>Connected</Badge>} />
          {connection ? <>
            <ConnectionRow icon={Github01Icon} title="GitHub identity" description="Verified sign-in provider" status={<Badge variant={connection.githubIdentityConnected ? "default" : "secondary"}>{connection.githubIdentityConnected ? "Connected" : "Not linked"}</Badge>} />
            <ConnectionRow icon={LinkSquare02Icon} title="Repository access" description={connection.githubAppEnabled ? countLabel(accessibleRepositories, "selected repository", "selected repositories") : "Not configured in this environment"} status={<Badge variant="secondary">{countLabel(installations.length, "installation")}</Badge>} />
          </> : <Alert className="mt-4"><AlertTitle>Connections unavailable</AlertTitle><AlertDescription>Try the detailed Connections page again.</AlertDescription></Alert>}
        </section>

        <section aria-labelledby="session-heading" className="border-y py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground"><HugeiconsIcon icon={SecurityCheckIcon} aria-hidden className="size-4" /></div>
            <div className="min-w-0 flex-1">
              <h2 id="session-heading" className="text-label font-medium">Current session</h2>
              <p className="mt-1 text-meta text-muted-foreground">Active in this browser. Name and email come from your connected sign-in provider.</p>
              <form action={signOutAccount} className="mt-4">
                <Button className="min-h-11 sm:min-h-7" type="submit" size="sm" variant="outline"><HugeiconsIcon icon={Logout01Icon} aria-hidden />Sign out</Button>
              </form>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </>;
}
