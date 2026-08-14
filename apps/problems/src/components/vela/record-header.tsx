import type { ReactNode } from "react";
import { PageHero } from "@vela/ui/vela/page-shell";

/* The header a single record gets.
 *
 * A record is not a page with a name — it is a thing with an identity, and the
 * largest text on the screen should be the record's own content rather than the
 * word "Claims". The kind sits above it as a small eyebrow, the way a document
 * names its type before its title, and provenance runs underneath as one line
 * of small facts rather than as a description paragraph.
 *
 * That is what makes this visibly not a collection: a list page opens with a
 * quiet horizontal bar and gets to its rows; a record page opens with the
 * record. */

export function RecordHeader({
  kind,
  title,
  state,
  provenance,
  description,
  actions,
}: {
  /** The object type, small and above the title: Claim, Proposal, Problem. */
  kind: string;
  title: ReactNode;
  /** Status marks. Kept beside the kind so they never outweigh the record. */
  state?: ReactNode;
  /** One line of small facts: repository, when recorded, where it came from. */
  provenance?: ReactNode;
  /** Reader-facing orientation below the identity, inside the same opener. */
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <PageHero density="compact">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-eyebrow uppercase text-muted-foreground">{kind}</p>
            {state}
          </div>
          <h1 className="mt-1.5 max-w-4xl text-display [overflow-wrap:anywhere]">{title}</h1>
          {provenance ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-muted-foreground">
              {provenance}
            </div>
          ) : null}
          {description ? <div className="mt-4 max-w-[68ch] text-body text-muted-foreground">{description}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </PageHero>
  );
}
