import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageShell } from "@vela/ui/vela/page-shell";

/* Without this the layout default applied, so every 404 sat in the tab and in
   browser history as a bare "problems.science" — indistinguishable from the
   site's own front door, which is exactly the moment a reader is trying to work
   out where they landed.

   `robots` is restated rather than left to Next's automatic not-found
   `noindex`, because the root layout declares `index, follow` and that default
   still reaches this head. Without the override the 404 carried two
   contradictory robots tags; with it, both say noindex. */
export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <PageShell archetype="default" className="grid min-h-[64svh] content-center">
      <p className="font-mono text-meta tracking-[0.01em] text-primary tabular-nums">404 / page not found</p>
      {/* The page's only heading, so it is the page's h1. It was an h2, which
          left every 404 with no top-level heading at all. */}
      <h1 className="mt-4 max-w-3xl text-display tracking-tight">Nothing is published at this address.</h1>
      {/* Absence is a fact this site can state precisely, and saying so is the
          point. problems.science serves one published release at a time, so
          "not here" means "not retained by the release this page is serving" —
          not "missing", and not "private", which the previous wording implied
          of a read-only public projection. */}
      <p className="mt-3 max-w-xl text-body leading-6 text-muted-foreground">
        This site serves one published release, and only what that release retains is reachable. A Problem&rsquo;s address is its collection and its number, and that address does not change between releases.
      </p>
      {/* Around twenty `notFound()` call sites land here — an unknown Problem,
          Source, codebase, Claim or commit — and every one of them was sent on
          to the advanced record inspector. Problems is the product's centre
          and the place a reader can start again from. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/problems" className="inline-flex h-11 w-fit items-center gap-2 rounded-sm text-body text-primary hover:underline md:h-9"><HugeiconsIcon icon={ArrowLeft} aria-hidden className="size-4" /> Open Problems</Link>
        <p className="text-meta text-muted-foreground">or press <kbd className="rounded border px-1.5 py-0.5 font-mono text-micro">⌘K</kbd> to search</p>
      </div>
    </PageShell>
  );
}
