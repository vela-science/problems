import {
  SourceRegistryViewModel,
  SourceRootList,
  bindingHref,
  latestObservation,
  number,
  recordSearchActive,
  repositoryHandle,
  sourceHref,
  sourceRegistryJsonHref,
  sourceRegistryPageHref,
  words,
} from "./shared";
import Link from "next/link";
import type {
  ProjectedMathSource,
} from "@vela/projection-data";
import { formalConjecturesAuditProjection } from "@vela/projection-data";
import {
  ArrowRight01Icon as ArrowRight,
  Database01Icon as Database,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@vela/ui/components/collapsible";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@vela/ui/components/item";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
} from "@vela/ui/components/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vela/ui/components/table";
import {
  SourceRegistryFilters,
  type SourceRegistryFilterState,
} from "@/app/sources/source-registry-filters";
import { PageIntro } from "@/components/vela/page-intro";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";

export function SourceRegistryView({
  registry,
  filters = {},
}: {
  registry: SourceRegistryViewModel;
  filters?: SourceRegistryFilterState;
}) {
  const normalizedQuery = filters.query?.toLocaleLowerCase("en-US");
  const visibleSources = registry.sources.filter((source) => {
    const { declaration, observation } = source;
    if (
      filters.sourceId
      && declaration.source_id !== filters.sourceId
    ) return false;
    if (
      filters.kind
      && declaration.source_kind !== filters.kind
    ) return false;
    if (
      filters.coverage
      && observation?.coverage.status !== filters.coverage
    ) return false;
    if (!normalizedQuery) return true;
    return [
      declaration.source_id,
      declaration.native_namespace,
      declaration.publisher_or_maintainer,
      declaration.source_kind,
      observation?.observation_id,
      observation?.native_revision.value,
    ].some((value) => value?.toLocaleLowerCase("en-US").includes(normalizedQuery));
  });
  const sourceKinds = [...new Set(
    registry.sources.map(({ declaration }) => declaration.source_kind),
  )].sort();
  const coverageStates = [...new Set(
    registry.sources.flatMap(({ observation }) => (
      observation ? [observation.coverage.status] : []
    )),
  )].sort();
  const repositories = [...new Set(
    registry.sources.flatMap(
      ({ declaration }) => declaration.coverage.repository_slugs,
    ),
  )].sort();
  const sourceOptions = registry.sources.map(({ declaration }) => ({
    id: declaration.source_id,
    label: declaration.publisher_or_maintainer,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title="Sources"
        description="Root-bound source inventory for the current release. Declarations, observations, source-native objects, and Repository bindings remain separate records."
        actions={<Button
          nativeButton={false}
          variant="outline"
          render={
            <Link
              href={sourceRegistryJsonHref(registry.release_root, filters)}
            />
          }
        >
          JSON record
          <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
        </Button>}
      />

      <section aria-labelledby="source-local-projections-heading">
        <div className="mb-3">
          <h2 id="source-local-projections-heading" className="text-subtitle">Source-local read projections</h2>
          <p className="mt-1 text-meta text-muted-foreground">Rooted observations that remain outside the scientific Source Registry and have no authority effect.</p>
        </div>
        <Item className="items-start rounded-lg border-0 bg-muted/25 px-4 py-4">
          <ItemMedia><HugeiconsIcon icon={Database} aria-hidden className="size-5" /></ItemMedia>
          <ItemContent>
            <ItemTitle>Formal Conjectures PR audit</ItemTitle>
            <ItemDescription className="line-clamp-none">Five exact source records · public Apache-2.0 custody · no automatic Verification, Decision, or Standing effect</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button nativeButton={false} variant="outline" render={<Link href="/sources/source%3Aformal-conjectures-pr-audit" />}>Inspect {formalConjecturesAuditProjection.records.length} records</Button>
          </ItemActions>
        </Item>
      </section>

      <section aria-labelledby="source-registry-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="source-registry-heading" className="text-subtitle">
              Registry lookup
            </h2>
            <p className="mt-1 text-meta text-muted-foreground">
              Search {number.format(registry.source_registry.native_record_count)} source-native
              records or inspect {number.format(registry.sources.length)} declarations
            </p>
          </div>
          <dl className="flex max-w-[70ch] flex-wrap gap-x-4 gap-y-1 text-meta text-muted-foreground">
            <div className="flex gap-1"><dt>Sources</dt><dd className="font-mono text-foreground">{number.format(registry.source_registry.source_count)}</dd></div>
            <div className="flex gap-1"><dt>Observations</dt><dd className="font-mono text-foreground">{number.format(registry.source_registry.observation_count)}</dd></div>
            <div className="flex gap-1"><dt>Native records</dt><dd className="font-mono text-foreground">{number.format(registry.source_registry.native_record_count)}</dd></div>
            <div className="flex gap-1"><dt>Bindings</dt><dd className="font-mono text-foreground">{number.format(registry.source_registry.repository_binding_count)}</dd></div>
          </dl>
        </div>

        <div className="mb-4">
          <SourceRegistryFilters
            filters={filters}
            kinds={sourceKinds}
            sources={sourceOptions}
            coverageStates={coverageStates}
            repositories={repositories}
          />
        </div>

        {recordSearchActive(filters) ? (
          <NativeRecordSearchResults registry={registry} filters={filters} />
        ) : null}

        <div className="mb-3">
          <h2 className="text-subtitle">Source declarations</h2>
          <p className="mt-1 text-meta text-muted-foreground">
            {number.format(visibleSources.length)} of{" "}
            {number.format(registry.sources.length)} sources in this exact release
          </p>
        </div>

        {visibleSources.length === 0 ? (
          <Item variant="outline">
            <ItemContent>
              <ItemTitle>No matching sources</ItemTitle>
              <ItemDescription>
                Change or clear the source filters to inspect this release.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href="/sources" />}
              >
                Clear filters
              </Button>
            </ItemActions>
          </Item>
        ) : null}

        <div className={visibleSources.length > 0 ? "hidden overflow-hidden rounded-lg border lg:block" : "hidden"}>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44%]">Source declaration</TableHead>
                <TableHead className="w-48">Exact observation</TableHead>
                <TableHead className="w-36">Projected objects</TableHead>
                <TableHead className="w-32">Repository bindings</TableHead>
                <TableHead className="w-20">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSources.map((source) => (
                <SourceTableRow
                  key={source.declaration.source_id}
                  source={source}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        <ItemGroup className={visibleSources.length > 0 ? "grid gap-2 lg:hidden" : "hidden"}>
          {visibleSources.map((source) => (
            <SourceMobileItem
              key={source.declaration.source_id}
              source={source}
            />
          ))}
        </ItemGroup>

        <Collapsible className="mt-4 rounded-lg border">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-compact font-medium">
            Inventory roots
            <span className="text-meta text-muted-foreground">
              3 values
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent keepMounted className="bg-muted/20 p-4">
            <SourceRootList
              columns="three"
              roots={[
                { label: "Release root", value: registry.release_root },
                {
                  label: "Declaration root",
                  value: registry.source_registry.declaration_root,
                },
                {
                  label: "Observation bundle root",
                  value: registry.source_registry.observation_bundle_root,
                },
              ]}
            />
          </CollapsibleContent>
        </Collapsible>
      </section>
    </div>
  );
}

function NativeRecordSearchResults({
  registry,
  filters,
}: {
  registry: SourceRegistryViewModel;
  filters: SourceRegistryFilterState;
}) {
  const sources = new Map(
    registry.sources.map((source) => [source.declaration.source_id, source]),
  );

  return (
    <section
      id="source-native-results"
      aria-labelledby="source-native-results-heading"
      className="mb-8 border-b pb-8"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="source-native-results-heading" className="text-subtitle">
            Source-native records
          </h2>
          <p className="mt-1 text-meta text-muted-foreground">
            {number.format(registry.native_records.length)} bounded matches from
            this exact release
          </p>
        </div>
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={<Link href={sourceRegistryJsonHref(registry.release_root, filters)} />}
        >
          Exact query JSON
          <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
        </Button>
      </div>

      {registry.native_records.length === 0 ? (
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>No matching source-native records</ItemTitle>
            <ItemDescription>
              Change the text, exact ID, record kind, or Repository filter.
            </ItemDescription>
          </ItemContent>
        </Item>
      ) : (
        <ItemGroup className="grid gap-2">
          {registry.native_records.map((record) => {
            const source = sources.get(record.source_id);
            const bindings = registry.repository_bindings.filter((binding) => (
              binding.source_id === record.source_id
              && binding.observation_root === record.observation_root
              && binding.native_id === record.native_id
            ));
            return (
              <Item
                key={`${record.observation_root}:${record.native_id}`}
                className="items-start rounded-lg border-0 bg-muted/30 px-3 py-4"
              >
                <ItemMedia variant="icon">
                  <HugeiconsIcon icon={Database} aria-hidden />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="line-clamp-none">
                    <ScientificText text={decodeHtmlEntities(record.title)} />
                  </ItemTitle>
                  {/* The summary is upstream source text: TeX, and HTML-encoded
                      on the way in. Interpolated bare it printed
                      `Let $A=\{n_1&#60;n_2&#60;\cdots\}$` as characters, in
                      the primary column of the source carrying 2,439 bindings.
                      The Problems ledger already decodes and typesets exactly
                      this kind of blob; this is the same two calls. Clamped, so
                      twenty statements stay a table. */}
                  <ItemDescription className="line-clamp-2">
                    {source?.declaration.publisher_or_maintainer ?? record.source_id}
                    {record.summary
                      ? <> · <ScientificText text={decodeHtmlEntities(record.summary)} /></>
                      : null}
                  </ItemDescription>
                  <p className="break-all font-mono text-meta text-muted-foreground">
                    {record.native_id}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
                    <Badge variant="outline">{words(record.native_kind)}</Badge>
                    <span>{words(record.availability)}</span>
                    {bindings.length > 0 ? (
                      <span>
                        {number.format(bindings.length)} returned Repository {bindings.length === 1 ? "binding" : "bindings"}
                      </span>
                    ) : (
                      <span>No returned Repository binding</span>
                    )}
                  </div>
                  {bindings.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-meta">
                      {bindings.map((binding) => {
                        const href = bindingHref(binding);
                        const label = `${repositoryHandle(binding.repository_id)} · ${words(binding.repository_object_kind)}`;
                        return href ? (
                          <Link
                            key={binding.binding_id}
                            href={href}
                            className="underline underline-offset-4 hover:text-primary"
                          >
                            {label}
                          </Link>
                        ) : (
                          <span key={binding.binding_id}>{label}</span>
                        );
                      })}
                    </div>
                  ) : null}
                </ItemContent>
                <ItemActions className="basis-full justify-end sm:basis-auto">
                  <Button
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    render={<Link href={sourceHref(record.source_id)} />}
                  >
                    Source
                  </Button>
                </ItemActions>
              </Item>
            );
          })}
        </ItemGroup>
      )}

      {registry.next_cursor ? (
        <Pagination className="mt-4 justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationNext
                href={sourceRegistryPageHref(filters, registry.next_cursor)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </section>
  );
}

function SourceTableRow({
  source,
}: {
  source: ProjectedMathSource;
}) {
  const observation = latestObservation(source);
  const declaration = source.declaration;
  return (
    <TableRow>
      <TableCell className="max-w-xl whitespace-normal py-4 align-top">
        <Link
          href={sourceHref(declaration.source_id)}
          className="font-medium underline-offset-4 hover:underline"
        >
          {declaration.publisher_or_maintainer}
        </Link>
        <p className="mt-1 font-mono text-meta text-muted-foreground [overflow-wrap:anywhere]">
          {declaration.source_id}
        </p>
        <p className="mt-1 text-meta text-muted-foreground">
          {words(declaration.source_kind)} · {declaration.native_namespace}
        </p>
      </TableCell>
      <TableCell className="whitespace-normal align-top">
        {observation ? (
          <>
            <p className="font-mono text-meta text-foreground">
              {observation.observation_id}
            </p>
            <p className="mt-1 text-meta text-muted-foreground [overflow-wrap:anywhere]">
              {observation.native_revision.value}
            </p>
          </>
        ) : (
          <Badge variant="outline">Not observed</Badge>
        )}
      </TableCell>
      <TableCell className="whitespace-normal align-top text-meta leading-5 text-muted-foreground">
        <strong className="font-medium text-foreground">
          {number.format(source.native_record_count)}
        </strong>{" "}
        source-native rows
        <br />
        {observation ? `${words(observation.coverage.status)} coverage` : "no observation"}
      </TableCell>
      <TableCell className="whitespace-normal align-top text-meta leading-5 text-muted-foreground">
        <strong className="font-medium text-foreground">
          {number.format(source.repository_binding_count)}
        </strong>{" "}
        exact links
      </TableCell>
      <TableCell className="align-top">
        <div className="flex justify-end">
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href={sourceHref(declaration.source_id)} />}
          >
            Inspect
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SourceMobileItem({
  source,
}: {
  source: ProjectedMathSource;
}) {
  const declaration = source.declaration;
  return (
    <Item className="items-start rounded-lg bg-muted/30 px-3 py-4">
      <ItemContent>
        <ItemTitle>
          <Link href={sourceHref(declaration.source_id)}>
            {declaration.publisher_or_maintainer}
          </Link>
        </ItemTitle>
        <ItemDescription className="line-clamp-none">
          {declaration.native_namespace} · {words(declaration.source_kind)}
        </ItemDescription>
        <p className="text-meta text-muted-foreground">
          {number.format(source.native_record_count)} projected source-native
          rows · {number.format(source.repository_binding_count)} Repository bindings
        </p>
      </ItemContent>
      <ItemActions className="basis-full justify-end">
        <Button
          nativeButton={false}
          size="sm"
          render={<Link href={sourceHref(declaration.source_id)} />}
        >
          Inspect
          <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
        </Button>
      </ItemActions>
    </Item>
  );
}

