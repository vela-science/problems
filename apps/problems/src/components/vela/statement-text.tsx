import { ScientificText } from "@vela/ui/vela/scientific-text";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { cn } from "@vela/ui/lib/utils";
import type { ProblemStatementKind } from "@vela/projection-data";

/* One rendering decision for a resolved statement, shared by every surface
 * that prints one: a formal statement is source notation and sets in mono, so
 * it never poses as the question in the reader's language; prose and the
 * catalogue's own label are text. The precedence that chose the statement
 * lives in the projection (`resolveStatement`); nothing here synthesizes a
 * fallback string. */
export function StatementText({ statement, kind, className }: {
  statement: string;
  kind: ProblemStatementKind;
  className?: string;
}) {
  if (kind === "formal") {
    return <span className={cn("font-mono [overflow-wrap:anywhere]", className)}>{statement}</span>;
  }
  return <ScientificText text={decodeHtmlEntities(statement)} />;
}
