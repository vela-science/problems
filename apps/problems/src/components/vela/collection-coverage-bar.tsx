/* How much of a collection actually holds anything.
 *
 * The counts were behind a disclosure, on the correct reading that five
 * numbers nobody acts on do not belong at the top of a list page. This is not
 * those five numbers: it is one figure answering the question the collection
 * raises and never answers, which is how much of it carries evidence at all.
 * On Erdős Problems the honest answer is two of 1,217, and a reader who scrolls
 * a page of rows with nothing in the Result column deserves to know that before
 * they conclude the product is broken.
 *
 * Three parts that partition the catalogue exactly: a Problem has a Decision
 * here, or a retained formal statement and no Decision, or neither. */
export type CollectionCoverage = {
  total: number;
  decided: number;
  formalOnly: number;
  identityOnly: number;
};

export function collectionCoverage(
  records: Array<{ record: { formalized?: boolean | null; local_standing?: string | null } }>,
): CollectionCoverage {
  let decided = 0;
  let formalOnly = 0;
  let identityOnly = 0;
  for (const { record } of records) {
    if (record.local_standing) decided += 1;
    else if (record.formalized) formalOnly += 1;
    else identityOnly += 1;
  }
  return { total: records.length, decided, formalOnly, identityOnly };
}

function Legend({ tone, count, label }: { tone: string; count: number; label: string }) {
  return <span className="inline-flex items-baseline gap-1.5">
    <span aria-hidden className="size-1.5 translate-y-[-0.1em] rounded-full" style={{ background: tone }} />
    <span className="font-mono font-medium tabular-nums">{count.toLocaleString()}</span>
    <span className="text-muted-foreground">{label}</span>
  </span>;
}

export function CollectionCoverageBar({ coverage }: { coverage: CollectionCoverage }) {
  const { total, decided, formalOnly, identityOnly } = coverage;
  if (!total) return null;
  const decidedTone = "var(--status-progress)";
  const formalTone = "color-mix(in oklab, var(--status-evidence) 70%, var(--background))";
  const identityTone = "color-mix(in oklab, var(--border) 85%, var(--background))";
  return <div>
    {/* The bar is the figure; the legend is its text equivalent, so the
        proportion is never carried by colour alone. */}
    <div
      className="flex h-2 gap-px overflow-hidden rounded-sm bg-muted"
      role="img"
      aria-label={`Of ${total.toLocaleString()} questions, ${decided.toLocaleString()} carry a Decision here, ${formalOnly.toLocaleString()} carry a formal statement only, and ${identityOnly.toLocaleString()} are held by identity and locator only.`}
    >
      {decided ? <div style={{ flex: decided, background: decidedTone }} /> : null}
      {formalOnly ? <div style={{ flex: formalOnly, background: formalTone }} /> : null}
      {identityOnly ? <div style={{ flex: identityOnly, background: identityTone }} /> : null}
    </div>
    <div aria-hidden className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-meta">
      <Legend tone={decidedTone} count={decided} label="with reviewed evidence here" />
      <Legend tone={formalTone} count={formalOnly} label="formal statement only" />
      <Legend tone={identityTone} count={identityOnly} label="identity and locator only" />
    </div>
  </div>;
}
