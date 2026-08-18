import Link from "next/link";
import { Button } from "@vela/ui/components/button";
import { FormalStatementCard, formalFilePath } from "@/components/vela/formal-statement-card";
import { ProblemActivityRecords } from "@/components/vela/problem-activity-records";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* What a reader gets when this Repository has reviewed nothing — which is the
 * ordinary case for 1,215 of 1,217 Problems. "No current contribution" was
 * true and useless: the release holds retained declarations, proof manifests
 * and source-reported activity for this exact Problem, and none of it is a
 * Contribution. Saying what does exist, and whose claim it is, is the whole
 * job of this surface. */
export function WhatIsKnown({ state, basePath }: { state: State; basePath: string }) {
  const occurrences = state.sources?.occurrences ?? [];
  /* A Problem with retired Contributions has been worked on; it just has no
     current one. Those are listed on their own below, so this surface must not
     claim the Repository reviewed nothing. */
  const retired = (state.claims ?? []).length > 0;
  const declarations = occurrences.filter((occurrence) => occurrence.formal && occurrence.summary?.trim());
  const manifests = occurrences.filter((occurrence) => occurrence.source_role === "proof_manifest");
  const lead = declarations[0] ?? null;
  const leadPath = lead ? formalFilePath(lead) : null;

  return <div className="mt-6 space-y-8">
    <section aria-labelledby="known-heading" className="min-w-0">
      <h2 id="known-heading" className="text-title">No current result</h2>
      <p className="mt-2 max-w-[68ch] text-compact text-muted-foreground">
        {retired
          ? `Earlier Results and their Repository decisions appear below.`
          : `No reviewed Result is current in ${state.repositoryName}. Retained source material is shown below.`}
      </p>

      {lead ? <div className="mt-6 min-w-0 rounded-lg border">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-2.5">
          <div className="min-w-0">
            <h3 className="text-micro uppercase tracking-wide text-muted-foreground">Retained declaration</h3>
            {leadPath ? <code className="mt-0.5 block truncate font-mono text-meta text-foreground">{leadPath}</code> : null}
          </div>
          <p className="text-meta text-muted-foreground">{lead.source_label}</p>
        </header>
        <div className="min-w-0 px-4 py-4">
          <FormalStatementCard occurrence={lead} showDocstring={false} />
        </div>
        {declarations.length > 1 ? <footer className="border-t px-4 py-2.5">
          <Button nativeButton={false} size="sm" variant="ghost" render={<Link href={`${basePath}?view=sources`} />}>
            Browse all {declarations.length} declarations
          </Button>
        </footer> : null}
      </div> : null}

      {manifests.length ? <div className="mt-6">
        <h3 className="text-subtitle">Proof manifests naming this Problem</h3>
        <ul className="mt-2 divide-y rounded-lg border">
          {manifests.map((manifest) => <li key={manifest.occurrence_key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
            <span className="min-w-0 truncate text-compact">{manifest.source_label}</span>
            <code className="min-w-0 truncate font-mono text-meta text-muted-foreground">{manifest.native_id}</code>
          </li>)}
        </ul>
      </div> : null}

      {!lead && !manifests.length ? <p className="mt-6 rounded-lg border px-4 py-6 text-center text-compact text-muted-foreground">
        No source in this release retained material for this Problem beyond its catalogue entry.
      </p> : null}
    </section>

    <ProblemActivityRecords state={state} />

    <section aria-labelledby="next-heading">
      <h2 id="next-heading" className="text-title">Continue</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href={`${basePath}?view=work`} />}>Start a contribution</Button>
        <Button nativeButton={false} variant="outline" render={<Link href={`${basePath}?view=sources`} />}>Browse the source files</Button>
        {state.locator ? <Button nativeButton={false} variant="outline" render={<a href={state.locator} />}>Open the collection entry</Button> : null}
      </div>
    </section>
  </div>;
}
