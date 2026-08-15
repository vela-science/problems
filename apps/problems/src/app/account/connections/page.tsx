import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listGitHubConnections } from "@vela/activity-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { PageShell } from "@vela/ui/vela/page-shell";
import { PageIntro } from "@/components/vela/page-intro";
import { currentActivityAccount } from "@/lib/hosted-account";
import { githubIdentityForUser } from "@/lib/workos-identities";
import { githubAppConfiguration } from "@/lib/github-app";
import { completeGitHubInstallation } from "@/lib/github-installation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connections", robots: { index: false, follow: false } };

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
  const app = githubAppConfiguration();
  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-6">
    <PageIntro title="Connections" description="Identity and read access for connected scientific codebases. None of these grant Vela authority."
      signals={[{ label: "WorkOS", value: "Signed in", tone: "evidence" }, { label: "Authority", value: "None", tone: "neutral" }]} />
    <ItemGroup className="max-w-3xl">
      <Item variant="outline"><ItemContent><ItemTitle>{account.hosted.displayName}<Badge variant="secondary">WorkOS account</Badge></ItemTitle>
        <ItemDescription>{account.hosted.email}. Hosted identity only; not a Vela actor or authority principal.</ItemDescription></ItemContent></Item>
      <Item variant="outline"><ItemContent><ItemTitle>GitHub identity {identity ? <Badge>Connected</Badge> : <Badge variant="secondary">Not linked</Badge>}</ItemTitle>
        <ItemDescription>{identity ? "Verified by WorkOS and kept separate from repository installation access." : "Use Continue with GitHub on sign-in to link a verified GitHub identity to this account."}</ItemDescription>
        {!identity && <Button nativeButton={false} render={<Link href="/sign-in?returnTo=/account/connections" />} variant="outline" className="mt-3">Continue with GitHub</Button>}
      </ItemContent></Item>
      <Item variant="outline"><ItemContent><ItemTitle>Selected repository access</ItemTitle>
        <ItemDescription>{connections.installations.length ? `${connections.installations.length} installation${connections.installations.length === 1 ? "" : "s"}; ${connections.repositories.length} accessible codebase${connections.repositories.length === 1 ? "" : "s"}.` : "No GitHub App installation is connected."}</ItemDescription>
        {identity && app.enabled && <Button nativeButton={false} render={<Link href="/api/github/install" />} className="mt-3">Install or update GitHub access</Button>}
        {!app.enabled && <p className="mt-3 text-body text-muted-foreground">Repository connection is not configured in this deployment.</p>}
      </ItemContent></Item>
      {connections.installations.map((installation) => <Item key={installation.installationId} variant="outline"><ItemContent>
        <ItemTitle>{installation.accountLogin}<Badge variant="secondary">{installation.accountType}</Badge></ItemTitle>
        <ItemDescription>{installation.suspended ? "Access suspended" : "Metadata and Contents: read only"}. Manage repository selection in GitHub.</ItemDescription>
        {app.enabled && <Button nativeButton={false} render={<a href={`https://github.com/settings/installations/${installation.installationId}`} />} variant="ghost" className="mt-2">Manage on GitHub</Button>}
      </ItemContent></Item>)}
    </ItemGroup>
    <div><Button nativeButton={false} render={<Link href="/import" />} variant="outline">Import a codebase</Button></div>
  </PageShell>;
}
