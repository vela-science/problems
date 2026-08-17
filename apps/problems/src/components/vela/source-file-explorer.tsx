import { Button } from "@vela/ui/components/button";
import { FormalStatementCard, formalFilePath } from "@/components/vela/formal-statement-card";
import type { ProblemSourceOccurrence } from "@vela/projection-data";

/* Formal declarations grouped the way their library actually stores them: by
 * file. Each group carries the repository-relative path and the pinned-blob
 * link, and each declaration renders whole — docstring, notation, and the
 * library's own proof facts — instead of as one line in a flat list. The
 * grouping is the file path the record declares; nothing is inferred. */
export function SourceFileExplorer({ occurrences }: { occurrences: ProblemSourceOccurrence[] }) {
  const files = new Map<string, ProblemSourceOccurrence[]>();
  for (const occurrence of occurrences) {
    const path = formalFilePath(occurrence) ?? `${occurrence.source_id} (no module retained)`;
    files.set(path, [...(files.get(path) ?? []), occurrence]);
  }
  return <div className="mt-4 space-y-8">
    {[...files.entries()].map(([path, declarations]) => {
      const exactBlob = declarations[0]!.locators.find(({ url }) => url?.includes("/blob/"))?.url ?? null;
      return <section key={path} aria-label={path} className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-2">
          <code className="min-w-0 flex-1 truncate font-mono text-compact text-foreground/90">{path}</code>
          <span className="text-micro text-muted-foreground">{declarations.length} {declarations.length === 1 ? "declaration" : "declarations"} · {declarations[0]!.source_label}</span>
          {exactBlob ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={exactBlob} />}>Exact file</Button> : null}
        </div>
        <div className="mt-4 space-y-6">
          {declarations.map((occurrence) => <FormalStatementCard key={occurrence.occurrence_key} occurrence={occurrence} />)}
        </div>
      </section>;
    })}
  </div>;
}
