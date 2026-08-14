import Link from "next/link";
import { ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageShell } from "@vela/ui/vela/page-shell";

export default function NotFound() {
  return (
    <PageShell archetype="default" className="grid min-h-[64svh] content-center">
      <p className="font-mono text-meta tracking-[0.01em] text-primary tabular-nums">404 / no published record</p>
      <h2 className="mt-4 max-w-3xl text-display tracking-tight">Nothing is projected at this path.</h2>
      <p className="mt-3 max-w-xl text-body leading-6 text-muted-foreground">The requested route is absent from this exact build. No repository state has been inferred or substituted.</p>
      <Link href="/repositories" className="mt-5 inline-flex h-11 w-fit items-center gap-2 rounded-sm text-body text-primary hover:underline md:h-9"><HugeiconsIcon icon={ArrowLeft} aria-hidden className="size-4" /> Return to repositories</Link>
    </PageShell>
  );
}
