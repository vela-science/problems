import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight01Icon as ArrowRight, Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { listWorkspaces, type Workspace } from "@vela/activity-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { PageShell } from "@vela/ui/vela/page-shell";
import { Performer } from "@/components/vela/actor";
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
    <header className="flex flex-wrap items-start justify-between gap-5 border-b pb-7">
      <div>
        <h1 className="text-display">My work</h1>
        <p className="mt-2 max-w-2xl text-body text-muted-foreground">Workspaces, research objects, and drafts you can continue.</p>
      </div>
      <Performer name={account.hosted.displayName} kind="human" detail="Private account" />
    </header>

    {result.status === "unavailable" ? <section aria-labelledby="work-unavailable-heading" className="vela-object-surface p-6">
      <h2 id="work-unavailable-heading" className="text-title">Your work could not be loaded</h2>
      <p className="mt-2 max-w-2xl text-body text-muted-foreground">Your sign-in is intact, but saved work is temporarily unavailable. Public Problems and Results are still available.</p>
      <Button className="mt-5" variant="outline" nativeButton={false} render={<Link href="/problems" />}>Browse Problems</Button>
    </section> : result.workspaces.length ? <section aria-labelledby="retained-work-heading" className="vela-object-surface overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b p-5">
        <div>
          <h2 id="retained-work-heading" className="text-title">Your workspaces</h2>
          <p className="mt-1 text-meta text-muted-foreground">Open a Problem&apos;s Work section to continue its approaches, Attempts, and handoff.</p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/problems" />}>Find a Problem</Button>
      </div>
      <ItemGroup className="p-3">
        {result.workspaces.map((workspace) => <Item key={workspace.id} className="vela-object-row rounded-md px-2" variant="default">
          <ItemContent>
            <ItemTitle>{workspace.name}<Badge variant="secondary">{workspace.role}</Badge></ItemTitle>
            <ItemDescription>Updated {formatDate(workspace.updatedAt)} · workspace {workspace.slug}</ItemDescription>
          </ItemContent>
        </Item>)}
      </ItemGroup>
    </section> : <section aria-labelledby="empty-work-heading" className="vela-object-surface overflow-hidden sm:grid sm:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="p-6 sm:p-8">
        <span className="grid size-10 place-items-center rounded-md bg-accent text-primary"><HugeiconsIcon icon={Folder01Icon} aria-hidden className="size-5" /></span>
        <h2 id="empty-work-heading" className="mt-5 text-title">No saved work yet</h2>
        <p className="mt-2 max-w-xl text-body text-muted-foreground">Open a Problem and choose Work to start an approach, note, or Result draft.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Button nativeButton={false} render={<Link href="/problems" />}>Browse Problems <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button><Button variant="outline" nativeButton={false} render={<Link href="/import" />}>Connect code</Button></div>
      </div>
      <div className="border-t bg-[var(--vela-surface-sunken)] p-5 sm:border-l sm:border-t-0"><p className="text-meta font-semibold">A workspace can hold</p><ul className="mt-3 divide-y text-compact"><li className="py-3">Approaches and Attempts</li><li className="py-3">Research Blocks and notes</li><li className="py-3">Unsigned Result handoffs</li></ul></div>
    </section>}
  </PageShell>;
}
