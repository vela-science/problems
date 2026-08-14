import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight01Icon as ArrowRight,
  PuzzleIcon,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { allRepositories } from "@vela/projection-data";
import { Button } from "@vela/ui/components/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contribute",
  description: "Start bounded source-owned work and prepare an exact local Submission.",
};

export default async function WorkPage() {
  const repositories = await allRepositories();

  return (
    <PageShell archetype="work">
      <PageHero density="compact">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={WorkIcon} aria-hidden className="size-5" />
          <p className="text-eyebrow uppercase text-muted-foreground">Source-owned contribution</p>
        </div>
        <h1 className="mt-3 text-display">Contribute</h1>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          Choose a scientific Problem, work in its native repository or local workbench, then hand
          off bounded evidence as an exact Submission. Vela does not publish a central ranked queue.
        </p>
      </PageHero>

      <PageSection>
        <PageSectionHeader>
          <div>
            <p className="text-eyebrow uppercase text-muted-foreground">Current contribution paths</p>
            <h2 className="mt-1 text-title">Repository handoffs</h2>
          </div>
          <Button nativeButton={false} size="sm" variant="outline" render={<Link href="/problems" />}>
            Browse Problems
          </Button>
        </PageSectionHeader>
        <ItemGroup className="gap-1">
          {repositories.map((repository) => {
            const action = repository.status.actions.work;
            return (
              <Item key={repository.slug} className="rounded-lg border-0 px-3 py-5 hover:bg-muted/30">
                <ItemContent className="gap-2">
                  <ItemTitle className="line-clamp-none text-subtitle">{repository.status.repository.name}</ItemTitle>
                  <ItemDescription className="line-clamp-none max-w-[76ch]">{action.note}</ItemDescription>
                  <code className="w-fit max-w-full rounded bg-command px-2 py-1 font-mono text-micro break-all text-command-foreground">
                    {action.command}
                  </code>
                </ItemContent>
                <ItemActions className="ml-auto">
                  <Button nativeButton={false} render={<Link href={`/repositories/${repository.slug}/contribute`} />}>
                    Open handoff <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
                  </Button>
                </ItemActions>
              </Item>
            );
          })}
        </ItemGroup>
      </PageSection>

      <PageSection as="nav" aria-label="Other ways into the scientific map" className="grid gap-1 rounded-xl bg-muted/25 p-2 md:grid-cols-2">
        {[
          { href: "/problems", icon: PuzzleIcon, title: "Browse Problems", detail: "Start from the scientific question" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="group flex min-h-24 items-start gap-3 rounded-lg px-4 py-4 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2">
            <HugeiconsIcon icon={item.icon} aria-hidden className="mt-0.5 size-5" />
            <span>
              <span className="block text-label font-medium">{item.title}</span>
              <span className="mt-1 block text-meta text-muted-foreground">{item.detail}</span>
            </span>
            <HugeiconsIcon icon={ArrowRight} aria-hidden className="ml-auto mt-0.5 size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </PageSection>
    </PageShell>
  );
}
