import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight01Icon as ArrowRight,
  PuzzleIcon,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { PageHero, PageSection, PageShell } from "@vela/ui/vela/page-shell";
import { ContributionStepper } from "@/components/vela/contribution-stepper";

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
        <span id="contribution-path-heading" className="sr-only">Contribution path</span>
        <ContributionStepper current={1} />
        <p className="mt-6 max-w-[76ch] border-l-2 border-status-evidence pl-4 text-compact text-muted-foreground">Before attaching new work, read accepted and partial results and check retained approaches. Similarity can suggest overlap, but exact identity remains authoritative.</p>
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
