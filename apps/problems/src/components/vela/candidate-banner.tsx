import Link from "next/link";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { RecordId } from "@/components/vela/record-id";
import { StatusBadge } from "@vela/ui/vela/status-badge";

/* An unsigned candidate, said out loud.
 *
 * The draft already had a home: a node in the Workspace object tree, with its
 * roots and a four-step handoff. That is the right place to inspect it and the
 * wrong place to notice it, and noticing is the whole point — this is the
 * moment a machine's work stops and a person's judgement starts, and it was
 * three clicks deep.
 *
 * What it deliberately does not do is congratulate anyone. There is no
 * progress bar and no "ready to submit" tick, because nothing has been
 * established yet. The two facts on the face of it are the Standing this
 * Problem holds right now, and the fact that saving a candidate did not touch
 * it. */
export function CandidateBanner({
  draft,
  exportHref,
  workbenchHandoff,
  target,
}: {
  draft: { id: string; payloadRoot: string; version: number; updatedAt: string };
  exportHref: string;
  workbenchHandoff?: string | null;
  target: { claimId: string | null; standing: string | null };
}) {
  return (
    <section
      aria-labelledby="candidate-heading"
      className="overflow-hidden rounded-lg border border-status-caution/40 bg-status-caution/5"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-status-caution/30 px-4 py-3">
        <h2 id="candidate-heading" className="text-label font-medium">
          Unsigned candidate, awaiting a person
        </h2>
        <Badge variant="secondary">unsigned</Badge>
        <Badge variant="outline">authority effect · none</Badge>
        <span className="ml-auto font-mono text-micro text-muted-foreground">v{draft.version}</span>
      </header>

      <div className="grid gap-5 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,.4fr)]">
        <div className="min-w-0">
          <p className="max-w-[70ch] text-compact">
            A <code className="font-mono text-[0.92em]">vela.submission.v3</code> payload is prepared
            and validated in this Workspace. It proposes a change; it has not made one. This
            application holds no signing key and cannot submit on anyone&rsquo;s behalf.
          </p>
          <ol aria-label="What has to happen next" className="mt-4 grid gap-1.5 text-meta text-muted-foreground">
            <li>1 · Download the candidate, or open it in Workbench.</li>
            <li>2 · Sign it locally with a key only you hold.</li>
            <li>3 · Submit it to the Vela Repository, where Verification runs.</li>
            <li>4 · An authorised, attributed Decision accepts or rejects it. Only that moves Standing.</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button nativeButton={false} render={<Link href={exportHref} prefetch={false} />}>
              Download unsigned candidate
            </Button>
            {workbenchHandoff ? (
              <Button nativeButton={false} variant="outline" render={<a href={workbenchHandoff} />}>
                Open in Workbench
              </Button>
            ) : null}
          </div>
        </div>

        <dl className="grid content-start gap-3 border-t pt-4 text-meta sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div>
            <dt className="text-muted-foreground">Standing now</dt>
            <dd className="mt-1.5 flex flex-wrap items-center gap-2">
              {target.standing ? (
                <StatusBadge axis="standing" state={target.standing}>{target.standing.replaceAll("_", " ")}</StatusBadge>
              ) : (
                <span className="text-muted-foreground">No bound Claim</span>
              )}
              <span className="text-micro text-muted-foreground">unchanged</span>
            </dd>
          </div>
          {target.claimId ? (
            <div className="min-w-0">
              <dt className="text-muted-foreground">Targets</dt>
              <dd className="mt-1.5"><RecordId value={target.claimId} /></dd>
            </div>
          ) : null}
          <div className="min-w-0">
            <dt className="text-muted-foreground">Payload root</dt>
            <dd className="mt-1.5"><RecordId value={draft.payloadRoot} /></dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
