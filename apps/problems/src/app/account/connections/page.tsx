import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft01Icon as ArrowLeft,
  ArrowRight01Icon as ArrowRight,
  Github01Icon,
  LinkSquare02Icon,
  SecurityCheckIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { listGitHubConnections } from "@vela/activity-data";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@vela/ui/components/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { PageShell } from "@vela/ui/vela/page-shell";
import { currentActivityAccount } from "@/lib/hosted-account";
import { githubIdentityForUser } from "@/lib/workos-identities";
import { githubAppConfiguration } from "@/lib/github-app";
import { completeGitHubInstallation } from "@/lib/github-installation";
import { accessibleGitHubRepositoryCount } from "@/lib/github-connections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Connections",
  description: "Manage private sign-in and selected GitHub repository access.",
  robots: { index: false, follow: false },
};

function feedback(parameters: Record<string, string | string[] | undefined>) {
  if (parameters.github_install === "connected") return { title: "GitHub access updated", description: "The selected installation is connected. Repository access remains read only." };
  if (parameters.github_identity === "required") return { title: "GitHub identity required", description: "Sign in with GitHub before connecting selected repository access." };
  return null;
}

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await currentActivityAccount();
  if (!account) redirect("/sign-in?returnTo=/account/connections");
  const identity = await githubIdentityForUser(account.hosted.id);
  const parameters = await searchParams;
  if (typeof parameters.installation_id === "string") {
    if (!identity) redirect("/account/connections?github_identity=required");
    await completeGitHubInstallation({
      accountId: account.activity.id,
      workosIdentityId: identity.idpId,
      installationId: Number(parameters.installation_id),
    });
    redirect("/account/connections?github_install=connected");
  }
  const connections = await listGitHubConnections(account.activity.id);
  const accessibleRepositories = accessibleGitHubRepositoryCount(connections);
  const app = githubAppConfiguration();
  const notice = feedback(parameters);

  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-10">
    <header className="border-b pb-7">
      <Link href="/account" className="inline-flex min-h-11 items-center gap-2 text-meta text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-9"><HugeiconsIcon icon={ArrowLeft} aria-hidden className="size-4" />Account</Link>
      <p className="mt-5 text-eyebrow text-muted-foreground">Private account</p>
      <h1 className="mt-2 text-display">Connections</h1>
      <p className="mt-3 max-w-2xl text-body text-muted-foreground">Manage how you sign in and which GitHub repositories problems.science may inspect.</p>
    </header>

    {notice ? <Alert>
      <AlertTitle>{notice.title}</AlertTitle>
      <AlertDescription>{notice.description}</AlertDescription>
    </Alert> : null}

    <section aria-labelledby="identity-connections-heading">
      <div className="border-b pb-4">
        <h2 id="identity-connections-heading" className="text-title">Sign-in identities</h2>
        <p className="mt-1 text-meta text-muted-foreground">Which provider established this session, and which GitHub identity is linked to it.</p>
      </div>
      <ItemGroup className="divide-y gap-0">
        <Item className="rounded-none border-0 px-0 py-5">
          <ItemMedia variant="icon" className="size-10 rounded-md bg-muted/60"><HugeiconsIcon icon={SecurityCheckIcon} aria-hidden /></ItemMedia>
          <ItemContent>
            <ItemTitle className="line-clamp-none flex-wrap">WorkOS <Badge>Primary sign-in</Badge></ItemTitle>
            <ItemDescription className="line-clamp-none">Establishes this session. Your account name and email come from here.</ItemDescription>
          </ItemContent>
        </Item>
        <Item className="rounded-none border-0 px-0 py-5">
          <ItemMedia variant="icon" className="size-10 rounded-md bg-muted/60"><HugeiconsIcon icon={Github01Icon} aria-hidden /></ItemMedia>
          <ItemContent>
            <ItemTitle className="line-clamp-none flex-wrap">GitHub identity <Badge variant={identity ? "default" : "secondary"}>{identity ? "Connected" : "Not linked"}</Badge></ItemTitle>
            <ItemDescription className="line-clamp-none">{identity ? "Verified by the sign-in provider. Separate from repository installation access below." : "Use Continue with GitHub to link a verified GitHub identity."}</ItemDescription>
          </ItemContent>
          {!identity ? <ItemActions><Button className="min-h-11 sm:min-h-7" size="sm" variant="outline" nativeButton={false} render={<Link href="/sign-in?returnTo=/account/connections" prefetch={false} />}>Continue with GitHub</Button></ItemActions> : null}
        </Item>
      </ItemGroup>
    </section>

    <section aria-labelledby="repository-access-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <div>
          <h2 id="repository-access-heading" className="text-title">Selected repository access</h2>
          <p className="mt-1 text-meta text-muted-foreground">Metadata and Contents read access for repositories selected in GitHub.</p>
        </div>
        {identity && app.enabled ? <Button className="min-h-11 sm:min-h-8" nativeButton={false} render={<Link href="/api/github/install" />}>{connections.installations.length ? "Update GitHub access" : "Connect GitHub access"}</Button> : null}
      </div>

      <div className="grid gap-4 border-b py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted/60"><HugeiconsIcon icon={LinkSquare02Icon} aria-hidden className="size-4" /></div>
          <div>
            <p className="text-label font-medium">{connections.installations.length ? `${connections.installations.length} connected installation${connections.installations.length === 1 ? "" : "s"}` : "No GitHub App installation connected"}</p>
            <p className="mt-1 text-meta text-muted-foreground">{accessibleRepositories ? `${accessibleRepositories} selected ${accessibleRepositories === 1 ? "repository is" : "repositories are"} currently accessible.` : "No selected repositories are currently accessible."}</p>
          </div>
        </div>
        {!app.enabled ? <Badge variant="secondary">Unavailable in this environment</Badge> : null}
      </div>

      {connections.installations.length ? <ItemGroup className="divide-y gap-0">
        {connections.installations.map((installation) => <Item key={installation.installationId} className="rounded-none border-0 px-0 py-4">
          <ItemMedia variant="icon" className="size-9 rounded-md bg-muted/60"><HugeiconsIcon icon={Github01Icon} aria-hidden /></ItemMedia>
          <ItemContent>
            <ItemTitle className="line-clamp-none flex-wrap">{installation.accountLogin}<Badge variant="outline">{installation.accountType}</Badge>{installation.suspended ? <Badge variant="secondary">Suspended</Badge> : null}</ItemTitle>
            <ItemDescription>{installation.suspended ? "GitHub has suspended this installation." : "Metadata and Contents: read only."}</ItemDescription>
          </ItemContent>
          {app.enabled ? <ItemActions><Button className="min-h-11 sm:min-h-7" size="sm" variant="ghost" nativeButton={false} render={<a href={`https://github.com/settings/installations/${installation.installationId}`} />}>Manage on GitHub</Button></ItemActions> : null}
        </Item>)}
      </ItemGroup> : <div className="border-b py-8">
        <p className="text-eyebrow text-muted-foreground">No selected access</p>
        <p className="mt-2 max-w-xl text-body text-muted-foreground">Public GitHub URLs can still be inspected without an installation. Connect selected access only when you need a private or explicitly chosen repository.</p>
      </div>}
    </section>

    <section aria-labelledby="connected-codebases-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <div>
          <h2 id="connected-codebases-heading" className="text-title">Connected codebases</h2>
          <p className="mt-1 text-meta text-muted-foreground">Exact revisions retained after inspection.</p>
        </div>
        <Button className="min-h-11 sm:min-h-8" variant="outline" nativeButton={false} render={<Link href="/import" />}>Import a codebase</Button>
      </div>
      {connections.codebases.length ? <ItemGroup className="divide-y gap-0">
        {connections.codebases.map((codebase) => <Item key={codebase.id} className="group rounded-none border-0 px-0 py-4" render={<Link href={`/codebases/${codebase.id}`} />}>
          <ItemMedia variant="icon" className="size-9 rounded-md bg-muted/60"><HugeiconsIcon icon={SourceCodeIcon} aria-hidden /></ItemMedia>
          <ItemContent>
            <ItemTitle className="line-clamp-none flex-wrap">{codebase.fullName}<Badge variant="outline">{codebase.visibility}</Badge></ItemTitle>
            <ItemDescription>{codebase.inspectionStatus.replaceAll("_", " ")} · {codebase.syncState.replaceAll("_", " ")}</ItemDescription>
          </ItemContent>
          <ItemActions><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" /></ItemActions>
        </Item>)}
      </ItemGroup> : <Empty className="border-b">
        <EmptyHeader>
          <EmptyTitle>No codebase is retained</EmptyTitle>
          <EmptyDescription>Import a GitHub URL when you want to inspect and retain one exact revision.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button nativeButton={false} variant="outline" size="sm" render={<Link href="/import" />}>Import a codebase</Button>
        </EmptyContent>
      </Empty>}
    </section>
  </PageShell>;
}
