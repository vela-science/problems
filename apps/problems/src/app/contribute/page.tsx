import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight01Icon as ArrowRight,
  BookOpen01Icon,
  PuzzleIcon,
  SearchList01Icon,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { PageHero, PageSection, PageShell } from "@vela/ui/vela/page-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Add a contribution",
  description: "Start from a Problem, check prior work, and prepare bounded evidence.",
};

export default function WorkPage() {
  return (
    <PageShell archetype="work">
      <PageHero density="compact">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={WorkIcon} aria-hidden className="size-5" />
          <p className="text-eyebrow uppercase text-muted-foreground">Source-owned contribution</p>
        </div>
        <h1 className="mt-3 text-display">Add a contribution</h1>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          Contributions belong to a scientific Problem. Choose the question first so scope,
          prior work, sources, and the correct repository handoff are already in view.
        </p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/problems" />}>
          Choose a Problem <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
        </Button>
      </PageHero>

      <PageSection aria-labelledby="contribution-path-heading">
        <p className="text-eyebrow uppercase text-muted-foreground">The public path</p>
        <h2 id="contribution-path-heading" className="mt-1 text-title">Question before machinery</h2>
        <ItemGroup className="mt-5 border-y">
          {[
            { icon: BookOpen01Icon, title: "Read what is known", detail: "Orient on accepted Contributions, partial and negative results, exact artifacts, and the unresolved gap." },
            { icon: SearchList01Icon, title: "Check prior work", detail: "Compare the approach with retained work. Possible overlap is advisory; exact identity remains authoritative." },
            { icon: WorkIcon, title: "Continue locally", detail: "Use the Problem's Work section to open its repository or agent workflow, then return a bounded Contribution with assumptions, environment, outcome, and retry boundary." },
          ].map((step, index) => <Item key={step.title} className="px-0" variant="default">
            <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-muted text-meta font-semibold">{index + 1}</span>
            <HugeiconsIcon icon={step.icon} aria-hidden className="size-5 text-muted-foreground" />
            <ItemContent>
              <ItemTitle>{step.title}</ItemTitle>
              <ItemDescription className="line-clamp-none max-w-[76ch]">{step.detail}</ItemDescription>
            </ItemContent>
          </Item>)}
        </ItemGroup>
      </PageSection>

      <PageSection as="nav" aria-label="Choose a scientific Problem">
        {[
          { href: "/problems", icon: PuzzleIcon, title: "Browse Problems", detail: "Start from the scientific question, not an internal record type" },
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
