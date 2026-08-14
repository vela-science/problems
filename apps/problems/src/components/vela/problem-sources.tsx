import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ProblemSourceReadResult } from "@vela/projection-data";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@vela/ui/components/collapsible";
import { ScientificText } from "@vela/ui/vela/scientific-text";

type Occurrence = ProblemSourceReadResult["occurrences"][number];
type RelationKind = Exclude<Occurrence["relation_kind"], null>;

const number = new Intl.NumberFormat("en-US");

const relationLabels: Record<RelationKind, string> = {
  formal_statement_reference: "Formal statement reference",
  proof_manifest_reference: "Proof manifest reference",
  attributed_activity_reference: "Attributed activity reference",
  attributed_classification_reference: "Attributed classification reference",
};

function words(value: string): string {
  return value.replaceAll("_", " ");
}

function occurrenceLabel(occurrence: Occurrence): string {
  const status: Occurrence["occurrence_status"] | "canonical_anchor" = occurrence.occurrence_status;
  if (status === "canonical_anchor") return "Canonical source occurrence";
  return status === "reviewed_reference" ? "Reviewed reference" : "Number candidate";
}

function displayedOccurrenceKey(value: string): string {
  return value.split("\u0000").join(" · ");
}

/**
 * A Problem-source reading instrument, not a scientific-state axis.
 *
 * The coverage matrix remains visible at every viewport. Full statement text is
 * next in the reading order, while the longer exact occurrence ledger is one
 * disclosure away. Source-authored labels are intentionally rendered as record
 * text, never as Vela Standing or verification badges.
 */
export function ProblemSources({ sources }: { sources: ProblemSourceReadResult }) {
  const reviewed = sources.coverage.reduce((total, source) => total + source.reviewed_occurrences, 0);

  return (
    <section aria-labelledby="problem-sources-heading" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h2 id="problem-sources-heading" className="text-title">Source coverage</h2>
        <p className="font-mono text-micro tabular-nums text-muted-foreground">
          {number.format(sources.occurrences.length)} occurrences · {number.format(sources.statements.length)} statements
        </p>
      </div>

      <p className="mt-3 max-w-[76ch] text-compact text-muted-foreground">
        Within the <span className="font-mono">{sources.resolution_namespace}</span> source family, shared numbers are candidate navigation only. They do not establish occurrence or statement identity,
        implication, or equivalence, and they have no authority effect.
      </p>

      {sources.entity ? (
        <p className="mt-3 max-w-[76ch] text-compact">
          <span className="font-medium">{sources.entity.label}</span> is a reviewed navigation grouping across {number.format(reviewed)} exact source {reviewed === 1 ? "occurrence" : "occurrences"}.
        </p>
      ) : (
        <p className="mt-3 max-w-[76ch] text-compact">
          No reviewed navigation grouping covers this source record. Its canonical occurrence remains exact; every other same-number record below remains candidate navigation only.
        </p>
      )}

      <div data-source-coverage className="mt-6 min-w-0 border-y">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">Problem source coverage</caption>
          <colgroup>
            <col className="w-[46%] sm:w-[58%]" />
            <col className="w-[18%] sm:w-[14%]" />
            <col className="w-[18%] sm:w-[14%]" />
            <col className="w-[18%] sm:w-[14%]" />
          </colgroup>
          <thead className="border-b text-micro text-muted-foreground">
            <tr>
              <th scope="col" className="py-2.5 pr-2 font-medium">Source</th>
              <th scope="col" aria-label="Source occurrences" className="px-1 py-2.5 text-right font-medium sm:px-2">
                <span aria-hidden>Records</span>
              </th>
              <th scope="col" aria-label="Reviewed occurrences" className="px-1 py-2.5 text-right font-medium sm:px-2">
                <span aria-hidden className="sm:hidden">Review</span><span aria-hidden className="hidden sm:inline">Reviewed</span>
              </th>
              <th scope="col" aria-label="Statement occurrences" className="py-2.5 pl-1 text-right font-medium sm:pl-2">
                <span aria-hidden className="sm:hidden">Text</span><span aria-hidden className="hidden sm:inline">Statements</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sources.coverage.map((source) => (
              <tr key={source.source_id}>
                <th scope="row" className="py-3 pr-2 align-top font-normal">
                  <span className="block text-compact font-medium [overflow-wrap:anywhere]">{source.label}</span>
                  <span className="mt-0.5 block text-micro capitalize text-muted-foreground">{words(source.source_role)}</span>
                </th>
                <td className="px-1 py-3 text-right align-top font-mono text-meta tabular-nums sm:px-2">{number.format(source.source_occurrences)}</td>
                <td className="px-1 py-3 text-right align-top font-mono text-meta tabular-nums sm:px-2">{number.format(source.reviewed_occurrences)}</td>
                <td className="py-3 pl-1 text-right align-top font-mono text-meta tabular-nums sm:pl-2">{number.format(source.statement_occurrences)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="source-statements-heading" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 id="source-statements-heading" className="text-subtitle">Retained statement text</h3>
          <span className="text-meta text-muted-foreground">{number.format(sources.statements.length)} exact {sources.statements.length === 1 ? "statement" : "statements"}</span>
        </div>
        {sources.statements.length ? (
          <ol aria-label="Retained source statements" className="mt-3 divide-y">
            {sources.statements.map((statement) => (
              <li key={statement.statement_id} className="min-w-0 py-5 first:pt-4 last:pb-4">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-micro text-muted-foreground">
                  <span className="font-medium text-foreground">{statement.source_id}</span>
                  <code className="min-w-0 break-all font-mono">{displayedOccurrenceKey(statement.occurrence_key)}</code>
                </div>
                <p className="mt-3 max-w-[90ch] text-body leading-7">
                  <ScientificText text={statement.text} />
                </p>
                <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-micro text-muted-foreground">
                  {statement.locator_url ? (
                    <a className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground" href={statement.locator_url}>
                      Open source location
                    </a>
                  ) : <span>No source location retained</span>}
                  <code className="min-w-0 break-all font-mono">{statement.row_root}</code>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 py-4 text-compact text-muted-foreground">
            No statement text is retained in this reviewed source set. Exact source occurrences remain available below.
          </p>
        )}
      </section>

      <Collapsible className="group/source-ledger mt-8 border-t pt-5">
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4">
          <span>
            <span id="source-occurrences-heading" className="block text-subtitle">All exact occurrences</span>
            <span className="mt-1 block text-meta text-muted-foreground">{number.format(sources.occurrences.length)} source records, including unresolved number candidates</span>
          </span>
          <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden className="size-5 shrink-0 transition-transform duration-200 group-data-open/source-ledger:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-open:animate-in data-open:fade-in data-open:slide-in-from-top-1 data-closed:animate-out data-closed:fade-out data-closed:slide-out-to-top-1">
          <div role="region" aria-labelledby="source-occurrences-heading" className="pt-4">
            <ol aria-label="Exact source occurrences" className="divide-y">
              {sources.occurrences.map((occurrence) => (
                <li key={occurrence.row_root} className="grid min-w-0 gap-3 py-4 first:pt-3 last:pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)] sm:gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-label">{occurrence.source_label}</span>
                      <span className="rounded-full border px-2 py-0.5 text-micro text-muted-foreground">{occurrenceLabel(occurrence)}</span>
                    </div>
                    <p className="mt-2 text-compact font-medium">{occurrence.title}</p>
                    <p className="mt-1 font-mono text-micro break-all text-muted-foreground">{occurrence.native_id}</p>
                  </div>
                  <div className="min-w-0 text-micro text-muted-foreground sm:text-right">
                    <p className="capitalize">{words(occurrence.native_kind)}</p>
                    <p className="mt-1">{occurrence.relation_kind ? relationLabels[occurrence.relation_kind] : "No reviewed relation"}</p>
                    <p className="mt-1">Statement identity not established · no authority effect</p>
                    {occurrence.locators.length ? (
                      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 sm:justify-end">
                        {occurrence.locators.map((locator) => (
                          <a key={locator.locator_id} className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground" href={locator.url}>
                            {words(locator.kind)}
                          </a>
                        ))}
                      </p>
                    ) : <p className="mt-2">No source location retained</p>}
                    <code className="mt-2 block min-w-0 break-all font-mono">{occurrence.row_root}</code>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
