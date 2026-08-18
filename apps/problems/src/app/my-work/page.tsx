import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listWorkspaces, type Workspace } from "@vela/activity-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { PageShell } from "@vela/ui/vela/page-shell";
import { PageIntro } from "@/components/vela/page-intro";
import { formatDate } from "@/lib/format";
import { currentActivityAccount } from "@/lib/hosted-account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My work",
  description: "Your private workspaces and saved work on scientific Problems.",
  robots: { index: false, follow: false },
};

type WorkspacesResult =
  | { status: "ready"; workspaces: Workspace[] }
  | { status: "unavailable" };

async function loadWorkspaces(accountId: string): Promise<WorkspacesResult> {
  try {
    return { status: "ready", workspaces: await listWorkspaces(accountId) };
  } catch {
    return { status: "unavailable" };
  }
}

export default async function MyWorkPage() {
  const account = await currentActivityAccount();
  if (!account) redirect("/sign-in?returnTo=/my-work");
  const result = await loadWorkspaces(account.activity.id);

  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-8">
    <PageIntro
      className="vela-work-hero"
      title="My work"
      description="Return to the Problems where you are comparing approaches, recording results, or preparing a contribution."
      signals={[
        { label: "Account", value: account.hosted.displayName, tone: "neutral" },
        { label: "Surface", value: "Private work", detail: "Shared coordination", tone: "neutral" },
      ]}
    />

    {result.status === "unavailable" ? <section aria-labelledby="work-unavailable-heading" className="border-y py-8">
      <h2 id="work-unavailable-heading" className="text-title">Your work could not be loaded</h2>
      <p className="mt-2 max-w-2xl text-body text-muted-foreground">Your sign-in is intact, but saved work is temporarily unavailable. Public Problems and Results are still available.</p>
      <Button className="mt-5" variant="outline" nativeButton={false} render={<Link href="/problems" />}>Browse Problems</Button>
    </section> : result.workspaces.length ? <section aria-labelledby="retained-work-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div>
          <h2 id="retained-work-heading" className="text-title">Your workspaces</h2>
          <p className="mt-1 text-meta text-muted-foreground">Open a Problem&apos;s Work section to continue its approaches, Attempts, and handoff.</p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/problems" />}>Find a Problem</Button>
      </div>
      <ItemGroup>
        {result.workspaces.map((workspace) => <Item key={workspace.id} className="px-0" variant="default">
          <ItemContent>
            <ItemTitle>{workspace.name}<Badge variant="secondary">{workspace.role}</Badge></ItemTitle>
            <ItemDescription>Updated {formatDate(workspace.updatedAt)} · workspace {workspace.slug}</ItemDescription>
          </ItemContent>
        </Item>)}
      </ItemGroup>
    </section> : <section aria-labelledby="empty-work-heading" className="border-y py-10">
      <p className="text-eyebrow uppercase text-muted-foreground">No saved work yet</p>
      <h2 id="empty-work-heading" className="mt-2 text-title">Start from a Problem</h2>
      <p className="mt-2 max-w-2xl text-body text-muted-foreground">Read what is known, check prior work, then open Work when you have an approach or result to share.</p>
      <Button className="mt-5" nativeButton={false} render={<Link href="/problems" />}>Browse Problems</Button>
    </section>}
  </PageShell>;
}
