import Link from "next/link";
import type { ReviewedProblemSourceCoverage } from "@/lib/scientific-state";

type CoverageProblem = ReviewedProblemSourceCoverage["problems"][number];
type CoverageSource = ReviewedProblemSourceCoverage["sources"][number];

const number = new Intl.NumberFormat("en-US");

function words(value: string): string {
  return value.replaceAll("_", " ");
}

function coverageFor(problem: CoverageProblem, source: CoverageSource) {
  return problem.coverage.find(({ source_id }) => source_id === source.source_id) ?? null;
}

function Reading({ problem, source }: { problem: CoverageProblem; source: CoverageSource }) {
  const coverage = coverageFor(problem, source);
  if (!coverage) return <span aria-label="Outside this resolver source family" className="text-muted-foreground/45">·</span>;
  const candidates = coverage.source_occurrences - coverage.reviewed_occurrences;
  return (
    <span className="inline-flex min-w-0 flex-col items-end gap-0.5">
      <span
        aria-label={`${number.format(coverage.reviewed_occurrences)} reviewed of ${number.format(coverage.source_occurrences)} exact occurrences`}
        className="font-mono text-label tabular-nums"
      >
        {number.format(coverage.reviewed_occurrences)}<span aria-hidden className="px-0.5 text-muted-foreground">/</span>{number.format(coverage.source_occurrences)}
      </span>
      {candidates > 0 ? <span data-number-candidates className="text-micro text-muted-foreground">{number.format(candidates)} number {candidates === 1 ? "candidate" : "candidates"}</span> : null}
    </span>
  );
}

/**
 * A directory-level reading instrument over exact reviewed resolver entities.
 * Counts describe source occurrence coverage only. They are deliberately not
 * bars, scores, scientific status, popularity or local Standing.
 */
export function ProblemSourceCoverage({ coverage }: { coverage: ReviewedProblemSourceCoverage }) {
  if (coverage.problems.length === 0) return null;
  const bounds = [...new Set(coverage.problems.map(({ candidate_limit }) => candidate_limit))];
  const boundLabel = bounds.length === 1
    ? `${number.format(bounds[0]!)}-record`
    : `${bounds.map((bound) => number.format(bound)).join("/")}-record`;

  return (
    <section aria-labelledby="source-coverage-heading" className="@container/source-coverage min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="text-eyebrow text-muted-foreground">Reviewed source coverage</p>
          <h2 id="source-coverage-heading" className="mt-1 text-title">
            {number.format(coverage.problems.length)} reviewed Problems across {number.format(coverage.sources.length)} exact Sources
          </h2>
        </div>
        <p className="font-mono text-micro tabular-nums text-muted-foreground">reviewed / current records</p>
      </div>
      <p className="mt-3 max-w-[84ch] text-compact text-muted-foreground">
        Each reading compares reviewed occurrences with every exact same-number record in the configured resolver source family. Shared numbers remain navigation candidates only. They do not establish statement identity, equivalence, Verification, Decision, or Standing.
      </p>

      <div className="mt-6 min-w-0 rounded-xl bg-muted/35 p-3 sm:p-4">
        <table data-coverage-table className="block w-full min-w-0 text-left @4xl/source-coverage:table @4xl/source-coverage:table-fixed @4xl/source-coverage:border-collapse">
          <caption className="sr-only">Reviewed Problem source occurrence coverage</caption>
          <colgroup className="hidden @4xl/source-coverage:table-column-group">
            <col className="w-[28%]" />
            {coverage.problems.map(({ entity_id }) => <col key={entity_id} />)}
          </colgroup>
          <thead className="hidden @4xl/source-coverage:table-header-group">
            <tr className="text-micro text-muted-foreground">
              <th scope="col" className="px-3 py-3 font-medium">Exact Source</th>
              {coverage.problems.map((problem) => (
                <th key={problem.entity_id} scope="col" className="px-2 py-3 text-right align-bottom font-medium">
                  <Link href={problem.route} className="inline-flex min-h-8 flex-col items-end justify-center text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
                    <span className="text-label">{problem.entity_label}</span>
                    <span className="font-mono text-micro font-normal text-muted-foreground">{problem.resolution_namespace}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block space-y-1 @4xl/source-coverage:table-row-group">
            {coverage.sources.map((source) => {
              const present = coverage.problems.filter((problem) => (coverageFor(problem, source)?.source_occurrences ?? 0) > 0);
              return (
                <tr key={source.source_id} className="block rounded-lg px-3 py-4 odd:bg-background/40 @4xl/source-coverage:table-row @4xl/source-coverage:px-0 @4xl/source-coverage:py-0 @4xl/source-coverage:odd:bg-transparent @4xl/source-coverage:hover:bg-background/55">
                  <th scope="row" className="block align-middle font-normal @4xl/source-coverage:table-cell @4xl/source-coverage:rounded-s-lg @4xl/source-coverage:px-3 @4xl/source-coverage:py-3.5">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 @4xl/source-coverage:block">
                      <Link href={`/sources/${encodeURIComponent(source.source_id)}`} className="text-compact font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">{source.label}</Link>
                      <span className="text-micro capitalize text-muted-foreground @4xl/source-coverage:mt-0.5 @4xl/source-coverage:block">{words(source.source_role)}</span>
                    </span>
                    {present.length === 0 ? <span className="mt-2 block text-meta text-muted-foreground @4xl/source-coverage:hidden">No exact records among these reviewed Problems.</span> : null}
                  </th>
                  {coverage.problems.map((problem) => {
                    const isPresent = (coverageFor(problem, source)?.source_occurrences ?? 0) > 0;
                    return (
                      <td key={problem.entity_id} className={`${isPresent ? "flex" : "hidden"} min-w-0 items-center justify-between gap-4 py-1.5 text-right align-middle @4xl/source-coverage:table-cell @4xl/source-coverage:px-2 @4xl/source-coverage:py-3.5 @4xl/source-coverage:last:rounded-e-lg`}>
                        <Link href={problem.route} className="min-w-0 text-left text-meta font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 @4xl/source-coverage:hidden">
                          {problem.entity_label} <span className="font-mono text-micro text-muted-foreground">{problem.resolution_namespace}</span>
                        </Link>
                        <Reading problem={problem} source={source} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 max-w-[84ch] text-micro text-muted-foreground">
        Successful reads are untruncated. The reader refuses rather than clips a Problem above its {boundLabel} exact-occurrence bound. Source-authored status, activity, and classification labels remain source facts, not scientific authority.
      </p>
      <dl className="mt-4 grid min-w-0 gap-x-8 gap-y-3 text-micro text-muted-foreground sm:grid-cols-2">
        <div className="min-w-0"><dt className="font-medium text-foreground">Projection release</dt><dd><code className="break-all font-mono">{coverage.release_root}</code></dd></div>
        <div className="min-w-0"><dt className="font-medium text-foreground">Reviewed resolver</dt><dd><code className="break-all font-mono">{coverage.resolver_root}</code></dd></div>
      </dl>
    </section>
  );
}
