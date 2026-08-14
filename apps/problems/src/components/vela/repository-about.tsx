import Link from "next/link";
import type { ReactNode } from "react";
import { ExactValue } from "@vela/ui/vela/exact-value";
import { remoteHost } from "@/lib/format";

/* The About rail — GitHub's right column, Hugging Face's model sidebar.
 *
 * A repository page answers "what is this, where does it come from, and how big
 * is it" beside the content rather than inside it. The Problems had none of
 * that: the Git remote and the exact roots were buried in a Snapshot details
 * sheet, so the one fact that makes a Repository checkable — it is an ordinary Git
 * repository at this commit — was the hardest thing on the page to find.
 *
 * Counts link into the collection they count, so the rail is navigation as well
 * as description. */

export function RepositoryAbout({
  description,
  remote,
  commit,
  roots,
  facts,
}: {
  description: ReactNode;
  remote: string;
  commit: string;
  /* `statusStateRoots()` already returns the canonical pair with its own
     labels. The rail used to print one of them under a hand-typed "Release
     root", which is a wrong label on an exact value. */
  roots: Array<{ label: string; value: string }>;
  facts: Array<{ label: string; value: string; href?: string }>;
}) {
  const host = remoteHost(remote);
  return (
    <aside aria-labelledby="about-heading" className="min-w-0 rounded-lg border bg-card p-5 lg:sticky lg:top-3">
      <h2 id="about-heading" className="text-eyebrow uppercase text-muted-foreground">About</h2>
      <div className="mt-2 text-compact leading-6">{description}</div>

      <dl className="mt-4 divide-y">
        {facts.map((fact) => (
          <div key={fact.label} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-meta text-muted-foreground">{fact.label}</dt>
            <dd className="min-w-0 font-mono text-micro tabular-nums">
              {fact.href
                ? <Link className="underline-offset-2 hover:underline" href={fact.href}>{fact.value}</Link>
                : fact.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-3">
        <div className="min-w-0">
          <p className="text-meta text-muted-foreground">Source repository</p>
          <a
            className="mt-0.5 block min-w-0 truncate font-mono text-micro underline underline-offset-2 hover:text-foreground"
            href={remote}
            rel="noreferrer nofollow"
            target="_blank"
            title={remote}
          >
            {host}
          </a>
        </div>
        <div className="min-w-0">
          <p className="text-meta text-muted-foreground">Commit</p>
          <div className="mt-0.5"><ExactValue value={commit} label="Source commit" /></div>
        </div>
        {roots.map((root) => (
          <div key={root.label} className="min-w-0">
            <p className="text-meta text-muted-foreground">{root.label}</p>
            <div className="mt-0.5"><ExactValue value={root.value} label={root.label} /></div>
          </div>
        ))}
      </div>
    </aside>
  );
}
