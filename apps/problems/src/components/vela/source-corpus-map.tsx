import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@vela/ui/components/table";
import type { ObservedSourceCorpusMap } from "@/lib/scientific-state";
import { Disclosure } from "@/components/vela/disclosure";

type Corpus = ObservedSourceCorpusMap["corpora"][number];
type SourceKind = ObservedSourceCorpusMap["inventory"]["source_kinds"][number];

const number = new Intl.NumberFormat("en-US");

function words(value: string): string {
  const normalized = value.replaceAll("_", " ");
  return normalized.charAt(0).toLocaleUpperCase("en-US") + normalized.slice(1);
}

function sourceHref(sourceId: string): string {
  return `/sources/${encodeURIComponent(sourceId)}`;
}

function CompositionStrip({
  label,
  values,
  total,
}: {
  label: string;
  values: Array<{ key: string; count: number }>;
  total: number;
}) {
  if (total === 0) {
    return <div role="img" aria-label={`${label}: no retained records`} className="h-2 rounded-full bg-muted" />;
  }
  return (
    <div
      role="img"
      aria-label={`${label}: ${number.format(total)} total; exact values follow in the table`}
      className="flex h-2 gap-px overflow-hidden rounded-full bg-muted"
    >
      {values.filter(({ count }) => count > 0).map(({ key, count }) => (
        <span
          key={key}
          aria-hidden
          data-corpus-segment
          className="min-w-px basis-0 bg-foreground/20"
          style={{ flexGrow: count }}
        />
      ))}
    </div>
  );
}

function SourceKindInventory({ sourceKinds }: { sourceKinds: SourceKind[] }) {
  const total = sourceKinds.reduce((sum, sourceKind) => sum + sourceKind.native_record_count, 0);
  return (
    <div className="mt-6 grid gap-5 border-y py-5 lg:grid-cols-[minmax(16rem,.7fr)_minmax(24rem,1fr)] lg:items-center lg:gap-10">
      <div className="min-w-0">
        <CompositionStrip
          label="Retained record volume by declared Source kind"
          total={total}
          values={sourceKinds.map((sourceKind) => ({
            key: sourceKind.source_kind,
            count: sourceKind.native_record_count,
          }))}
        />
        <p className="mt-2 text-micro text-muted-foreground">
          Record volume by declared Source kind. Segment size is inventory only, never scientific rank.
        </p>
      </div>
      <Table className="min-w-0 text-left text-meta">
        <caption className="sr-only">Retained Source kinds</caption>
        <TableHeader className="text-micro text-muted-foreground">
          <TableRow>
            <TableHead className="pb-2 font-medium">Declared kind</TableHead>
            <TableHead className="pb-2 text-right font-medium">Sources</TableHead>
            <TableHead className="pb-2 text-right font-medium">Records</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sourceKinds.map((sourceKind) => (
            <TableRow key={sourceKind.source_kind}>
              <TableHead scope="row" className="py-2 font-normal text-foreground">{words(sourceKind.source_kind)}</TableHead>
              <TableCell className="py-2 text-right font-mono tabular-nums">{number.format(sourceKind.source_count)}</TableCell>
              <TableCell className="py-2 text-right font-mono tabular-nums">{number.format(sourceKind.native_record_count)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CorpusLane({ corpus }: { corpus: Corpus }) {
  const assignmentLabel = corpus.facet.multi_valued ? "source assignments" : "classified records";
  return (
    <article className="min-w-0 px-4 py-6 sm:px-6">
      <p className="text-eyebrow text-muted-foreground">{corpus.role_label}</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-subtitle">
          <Link
            href={sourceHref(corpus.source_id)}
            className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {corpus.source_label}
          </Link>
        </h3>
        <span className="font-mono text-label tabular-nums">{number.format(corpus.record_count)}</span>
      </div>
      <p className="mt-1 text-meta text-muted-foreground">
        {number.format(corpus.facet.values.length)} {corpus.facet.label.toLocaleLowerCase("en-US")}
        {corpus.facet.missing_records > 0 ? `; ${number.format(corpus.facet.missing_records)} records missing the field` : "; complete field coverage"}.
      </p>

      <div className="mt-5">
        <CompositionStrip
          label={`${corpus.source_label} ${corpus.facet.label}`}
          total={corpus.facet.assignment_count}
          values={corpus.facet.values.map(({ value, record_count }) => ({ key: value, count: record_count }))}
        />
        <p className="mt-2 text-micro text-muted-foreground">
          {number.format(corpus.facet.assignment_count)} {assignmentLabel}; values remain source-authored.
        </p>
      </div>

      <div
        role="region"
        aria-label={`${corpus.source_label} complete ${corpus.facet.label.toLocaleLowerCase("en-US")} table`}
        tabIndex={0}
        className="mt-4 max-h-72 min-w-0 overflow-auto rounded-lg bg-muted/35 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {/* Native, not the `Table` primitive: this scrolls vertically inside a
            capped height with a sticky header, and the primitive owns its own
            horizontal-only container, which would nest a second scroller here
            and drop the cap. */}
        <table className="w-full text-left text-meta">
          <caption className="sr-only">
            {corpus.source_label} complete {corpus.facet.label.toLocaleLowerCase("en-US")}
          </caption>
          <thead className="sticky top-0 bg-muted text-micro text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Source value</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Records</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {corpus.facet.values.map((value) => (
              <tr key={value.value}>
                <th scope="row" className="px-3 py-2 font-normal text-foreground">{value.value}</th>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{number.format(value.record_count)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-3 py-2 font-normal text-muted-foreground">Missing or not supplied</th>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{number.format(corpus.facet.missing_records)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

/**
 * Exact source inventory orientation. The quantitative strips show retained
 * record composition only; the complete source-authored buckets remain present
 * as semantic tables and no category color carries scientific status.
 */
export function SourceCorpusMap({ corpus }: { corpus: ObservedSourceCorpusMap }) {
  return (
    <section aria-labelledby="observed-corpora-heading" className="@container/source-corpus min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="text-eyebrow text-muted-foreground">Observed corpora</p>
          <h2 id="observed-corpora-heading" className="mt-1 text-title">
            {number.format(corpus.inventory.native_record_count)} source-native records across {number.format(corpus.inventory.source_count)} exact Sources
          </h2>
        </div>
        <Link href="/sources" className="text-meta font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
          Inspect Source registry
        </Link>
      </div>
      <p className="mt-3 max-w-[84ch] text-compact text-muted-foreground">
        The Problem directory admits only explicitly profiled problem catalogues. This release also retains formal statements, attributed activity, proof manifests, references, and sequences as separate source-native records.
      </p>
      <p className="mt-2 max-w-[84ch] text-micro text-muted-foreground">
        Counts are inventory, not scientific rank. Source-authored fields remain attribution. Proximity here does not establish shared Problem identity, equivalence, Verification, Decision, or Standing.
      </p>

      <SourceKindInventory sourceKinds={corpus.inventory.source_kinds} />

      <div className="mt-8 overflow-hidden border-y lg:grid lg:grid-cols-3 lg:divide-x">
        {corpus.corpora.map((entry) => <CorpusLane key={`${entry.source_id}/${entry.native_kind}`} corpus={entry} />)}
      </div>

      <dl className="mt-5 grid min-w-0 gap-x-8 gap-y-3 text-micro text-muted-foreground sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="font-medium text-foreground">Projection release</dt>
          <dd><code className="break-all font-mono">{corpus.release_root}</code></dd>
        </div>
        <div className="min-w-0">
          <dt className="font-medium text-foreground">Corpus profiles</dt>
          <dd><code className="break-all font-mono">{corpus.profile_root}</code></dd>
        </div>
      </dl>

      <Disclosure
        className="mt-5 border-t pt-4 text-meta"
        summaryClassName="font-medium text-foreground"
        summary={<>All {number.format(corpus.inventory.source_count)} exact Sources and observation roots</>}
      >
        <div className="mt-4 max-h-96 min-w-0 overflow-auto rounded-lg bg-muted/35">
          <table className="w-full min-w-[44rem] text-left text-meta">
            <caption className="sr-only">All retained Sources in this exact release</caption>
            <thead className="sticky top-0 bg-muted text-micro text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Exact Source</th>
                <th scope="col" className="px-3 py-2 font-medium">Declared kind</th>
                <th scope="col" className="px-3 py-2 font-medium">Coverage</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Records</th>
                <th scope="col" className="px-3 py-2 font-medium">Observation root</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {corpus.inventory.sources.map((source) => (
                <tr key={source.source_id}>
                  <th scope="row" className="px-3 py-2 font-normal">
                    <Link href={sourceHref(source.source_id)} className="font-mono text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
                      {source.source_id}
                    </Link>
                  </th>
                  <td className="px-3 py-2">{words(source.source_kind)}</td>
                  <td className="px-3 py-2">{source.coverage_status}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{number.format(source.native_record_count)}</td>
                  <td className="px-3 py-2"><code className="break-all font-mono text-micro">{source.observation_root}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Disclosure>
    </section>
  );
}
