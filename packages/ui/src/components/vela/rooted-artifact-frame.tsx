import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { ExactValue } from "./exact-value";

export type RootedArtifactFact = {
  kind: string;
  path: string;
  contentRoot: string;
  byteSize?: number | null;
  mediaType?: string | null;
  locator?: string | null;
};

/**
 * A bounded inspection frame for an already-rooted artifact reference.
 *
 * The pane hierarchy was adapted from shadcn.io Pro artifact/workbench source
 * reviewed on 2026-08-11. Vela deliberately omits generated previews,
 * reasoning logs, agent status, and "apply" actions: this component displays
 * exact retained metadata and never treats a hosted reference as evidence of
 * scientific authority.
 */
export function RootedArtifactFrame({
  artifact,
  className,
}: {
  artifact: RootedArtifactFact;
  className?: string;
}) {
  return (
    <article className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <header className="flex min-w-0 flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3">
        <Badge variant="outline">{artifact.kind}</Badge>
        <p className="min-w-0 flex-1 truncate font-mono text-meta" title={artifact.path}>{artifact.path}</p>
        {artifact.byteSize != null ? <span className="font-mono text-micro tabular-nums text-muted-foreground">{artifact.byteSize.toLocaleString()} B</span> : null}
      </header>
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,.35fr)]">
        <div className="min-w-0">
          <p className="text-eyebrow text-muted-foreground">Content root</p>
          <ExactValue className="mt-2" value={artifact.contentRoot} label={`${artifact.kind} content root`} />
        </div>
        <dl className="grid content-start gap-3 border-t pt-4 text-meta sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          {artifact.mediaType ? <div><dt className="text-muted-foreground">Media type</dt><dd className="mt-1 break-words font-mono">{artifact.mediaType}</dd></div> : null}
          {artifact.locator ? <div><dt className="text-muted-foreground">Locator</dt><dd className="mt-1 break-all font-mono">{artifact.locator}</dd></div> : null}
          {!artifact.mediaType && !artifact.locator ? <div><dt className="text-muted-foreground">Custody</dt><dd className="mt-1">Referenced outside the hosted activity plane</dd></div> : null}
        </dl>
      </div>
    </article>
  );
}
