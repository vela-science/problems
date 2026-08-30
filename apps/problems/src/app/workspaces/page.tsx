import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight01Icon as ArrowRight, Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { listWorkspaces, type Workspace } from "@vela/activity-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vela/ui/components/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { PageShell } from "@vela/ui/vela/page-shell";
import { Performer } from "@/components/vela/actor";
import { formatDate } from "@/lib/format";
import { currentActivityAccount } from "@/lib/hosted-account";
import { discoveredProblems } from "@/lib/scientific-state";
import { workspaceProblemLinks } from "@/lib/workspace-links";
import { signInPath } from "@/app/sign-in/route";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Workspaces",
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

export default async function WorkspacesPage({ searchParams }: { searchParams: Promise<{ workspace?: string | string[] }> }) {
  const account = await currentActivityAccount();
  if (!account) redirect(signInPath("/workspaces"));
  const result = await loadWorkspaces(account.activity.id);
  const query = await searchParams;
  const selectedId = typeof query.workspace === "string" ? query.workspace : undefined;
  const selected = result.status === "ready"
    ? result.workspaces.find((workspace) => workspace.id === selectedId)
    : undefined;
  const hasContexts = result.status === "ready"
    && result.workspaces.some((workspace) => workspace.problemContexts.length > 0);
  const catalog = hasContexts
    ? await discoveredProblems().then((problems) => ({ status: "ready" as const, problems })).catch(() => ({ status: "unavailable" as const, problems: [] }))
    : { status: "ready" as const, problems: [] };

  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-8">
    <header className="flex flex-wrap items-start justify-between gap-5 border-b pb-7">
      <div>
        <h1 className="text-display">Workspaces</h1>
        <p className="mt-2 max-w-2xl text-body text-muted-foreground">Drafts and research objects you can continue. Private to your account.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Performer name={account.hosted.displayName} kind="human" detail="Private account" />
        <Button variant="outline" nativeButton={false} render={<Link href="/problems" />}>Find a Problem</Button>
      </div>
    </header>

    {result.status === "unavailable" ? <Empty className="border-0">
      <EmptyHeader>
        <EmptyTitle>Your work could not be loaded</EmptyTitle>
        <EmptyDescription>Saved work is temporarily unavailable. Public Problems and Results are unaffected.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" nativeButton={false} render={<Link href="/problems" />}>Browse Problems</Button>
      </EmptyContent>
    </Empty> : result.workspaces.length ? <section aria-label="Your workspaces" className="vela-object-surface overflow-hidden">
      <ItemGroup className="p-3">
        {result.workspaces.map((workspace) => <Item
          key={workspace.id}
          className="vela-object-row rounded-md px-2"
          variant={workspace.id === selected?.id ? "muted" : "default"}
          render={<Link href={`/workspaces?workspace=${encodeURIComponent(workspace.id)}`} aria-current={workspace.id === selected?.id ? "page" : undefined} />}
        >
          <ItemContent>
            <ItemTitle>{workspace.name}<Badge variant="secondary">{workspace.role}</Badge></ItemTitle>
            <ItemDescription>{workspace.problemContexts.length
              ? `${workspace.problemContexts.length} retained Problem ${workspace.problemContexts.length === 1 ? "context" : "contexts"} · updated ${formatDate(workspace.updatedAt)}`
              : `No retained Problem context · updated ${formatDate(workspace.updatedAt)}`}</ItemDescription>
          </ItemContent>
          <ItemActions><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4" /></ItemActions>
        </Item>)}
      </ItemGroup>
      {selected ? <div className="border-t bg-[var(--vela-surface-sunken)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-meta text-muted-foreground">Selected workspace</p><h3 className="mt-1 text-subtitle">{selected.name}</h3></div>
          <Badge variant="outline">{selected.role}</Badge>
        </div>
        {selected.problemContexts.length ? catalog.status === "unavailable" ? <div className="mt-5 rounded-lg border border-dashed bg-background p-5">
          <p className="text-label font-medium">Problem catalogue temporarily unavailable</p>
          <p className="mt-1 max-w-2xl text-meta text-muted-foreground">The context is retained; its public route cannot be checked right now.</p>
        </div> : <ItemGroup className="mt-5 gap-2">
          {workspaceProblemLinks(selected, catalog.problems).map((problem) => problem.href ? <Item key={problem.context.anchorRoot} variant="outline" render={<Link href={problem.href} />}>
            <ItemContent><ItemTitle>{problem.label}</ItemTitle><ItemDescription>{problem.state === "current" ? "Current Problem context" : "Earlier release · current state will be checked when opened"}</ItemDescription></ItemContent>
            <ItemActions><span className="text-meta font-medium text-primary">Open Work</span><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4" /></ItemActions>
          </Item> : <Item key={problem.context.anchorRoot} variant="outline">
            <ItemContent><ItemTitle>{problem.label}</ItemTitle><ItemDescription>The exact retained context does not resolve in the current public catalogue.</ItemDescription></ItemContent>
          </Item>)}
        </ItemGroup> : <div className="mt-5 rounded-lg border border-dashed bg-background p-5">
          <p className="text-label font-medium">No Problem context retained</p>
          <p className="mt-1 max-w-2xl text-meta text-muted-foreground">Identifiable, but not attachable to a Problem from its name alone.</p>
          <Button className="mt-4" size="sm" variant="outline" nativeButton={false} render={<Link href="/problems" />}>Find a Problem</Button>
        </div>}
      </div> : null}
    </section> : <Empty className="border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><HugeiconsIcon icon={Folder01Icon} aria-hidden /></EmptyMedia>
        <EmptyTitle>No saved work yet</EmptyTitle>
        {/* The workspace is reached through a Problem, never created here, so
            the action is the Problem — not a "new workspace" button this page
            has no way to honour. */}
        <EmptyDescription>A workspace opens from a Problem&apos;s Work section.</EmptyDescription>
      </EmptyHeader>
      {/* `EmptyContent` stacks by default, which is right for one action and
          wrong for two of equal weight. */}
      <EmptyContent className="max-w-none flex-row flex-wrap justify-center">
        <Button nativeButton={false} render={<Link href="/problems" />}>Browse Problems <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/import" />}>Connect code</Button>
      </EmptyContent>
    </Empty>}
  </PageShell>;
}
