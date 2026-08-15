import type { ReactNode } from "react";
import Link from "next/link";
import type {
  RepositorySourceBinding,
  MathSourceRegistryReadResult,
  MathSourceRegistryRelease,
  NativeSourceRecord,
  ProjectedMathSource,
} from "@vela/projection-data";
import { formalConjecturesAuditProjection } from "@vela/projection-data";
import {
  ArrowRight01Icon as ArrowRight,
  Database01Icon as Database,
  LinkSquare01Icon as ExternalLink,
} from "@hugeicons/core-free-icons";
import { slugForRepositoryId } from "@vela/projection-data";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@vela/ui/components/empty";
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
import { RootFact } from "@/components/vela/root-fact";
import {
  SourceRegistryFilters,
  type SourceRegistryFilterState,
} from "./source-registry-filters";
import { PageIntro } from "@/components/vela/page-intro";
import { formatDate, machineInstant } from "@/lib/format";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";

export type SourceRegistryViewModel = MathSourceRegistryReadResult & {
  source_registry: MathSourceRegistryRelease;
};

const number = new Intl.NumberFormat("en-US");

/* A binding names a repository by its protocol identity. A reader navigates by
   the handle, so that is what a link and a label carry; the raw UUID shows only
   for a repository the registry does not know, where there is nothing better
   to say. */
function repositoryHandle(repositoryId: string) {
  return slugForRepositoryId(repositoryId) ?? repositoryId;
}

function words(value: string) {
  return value.replaceAll("_", " ");
}

function attributedNativeState(record: NativeSourceRecord): string | null {
  const state = record.metadata.source_declared_state;
  if (typeof state === "string") return `source: ${words(state)}`;
  const done = record.metadata.source_declared_done;
  if (typeof done === "boolean") return done ? "source: implemented" : "source: planned";
  return null;
}

function latestObservation(source: ProjectedMathSource) {
  return source.observation;
}

function sourceHref(
  sourceId: string,
) {
  return `/sources/${encodeURIComponent(sourceId)}`;
}

function recordSearchActive(filters: SourceRegistryFilterState) {
  return Boolean(
    filters.query
      || filters.sourceId
      || filters.nativeId
      || filters.nativeKind
      || filters.repositorySlug,
  );
}

function sourceRegistryJsonHref(
  releaseRoot: string,
  filters: SourceRegistryFilterState,
) {
  const params = new URLSearchParams({ root: releaseRoot });
  if (recordSearchActive(filters)) params.set("include", "records");
  if (filters.query) params.set("q", filters.query);
  if (filters.sourceId) params.set("source", filters.sourceId);
  if (filters.nativeId) params.set("native_id", filters.nativeId);
  if (filters.nativeKind) params.set("kind", filters.nativeKind);
  if (filters.repositorySlug) params.set("repository", filters.repositorySlug);
  if (filters.cursor) params.set("cursor", filters.cursor);
  return `/sources.json?${params.toString()}`;
}

function sourceRegistryPageHref(
  filters: SourceRegistryFilterState,
  cursor: string,
) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.sourceId) params.set("source", filters.sourceId);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.coverage) params.set("coverage", filters.coverage);
  if (filters.nativeId) params.set("native_id", filters.nativeId);
  if (filters.nativeKind) params.set("record_kind", filters.nativeKind);
  if (filters.repositorySlug) params.set("repository", filters.repositorySlug);
  params.set("cursor", cursor);
  return `/sources?${params.toString()}#source-native-results`;
}

function sourcePageHref({
  sourceId,
  cursor,
  bindingCursor,
  query,
  nativeKind,
  anchor,
}: {
  sourceId: string;
  cursor?: string | null;
  bindingCursor?: string | null;
  query?: string | null;
  nativeKind?: string | null;
  anchor: string;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (nativeKind) params.set("record_kind", nativeKind);
  if (cursor) params.set("cursor", cursor);
  if (bindingCursor) params.set("binding", bindingCursor);
  const serialized = params.toString();
  return `/sources/${encodeURIComponent(sourceId)}${serialized ? `?${serialized}` : ""}#${anchor}`;
}

/* A binding names a governed object, and the only governed object is a Claim.
   There was a `problem` branch here and it was unreachable: the builder never
   emitted a problem-kind binding, because it looked one up through a graph node
   and a graph node exists only where a Claim does. Deleted with the loop that
   would have fed it — a Problem is derived from its Source, owns nothing, and
   already carries the source it came from on the native record. */
function bindingHref(binding: RepositorySourceBinding): string | null {
  if (binding.repository_object_kind === "claim") {
    return `/repositories/${repositoryHandle(binding.repository_id)}/claims/${binding.repository_object_id}`;
  }
  return null;
}

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
            <Button className="min-h-11" nativeButton={false} variant="outline" render={<Link href="/sources/source%3Aformal-conjectures-pr-audit" />}>Inspect {formalConjecturesAuditProjection.records.length} records</Button>
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
          <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-compact font-medium">
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

export function SourceRecordView({
  source,
  releaseRoot,
  nativeRecords,
  repositoryBindings,
  cursor,
  bindingCursor,
  query,
  nativeKind,
  nextCursor,
  nextBindingCursor,
}: {
  source: ProjectedMathSource;
  releaseRoot: string;
  nativeRecords: NativeSourceRecord[];
  repositoryBindings: RepositorySourceBinding[];
  cursor?: string | null;
  bindingCursor?: string | null;
  query?: string | null;
  nativeKind?: string | null;
  nextCursor?: string | null;
  nextBindingCursor?: string | null;
}) {
  const observation = latestObservation(source);
  const declaration = source.declaration;
  const jsonParams = new URLSearchParams({
    root: releaseRoot,
    source: declaration.source_id,
    include: "records",
  });
  if (query) jsonParams.set("q", query);
  if (nativeKind) jsonParams.set("kind", nativeKind);
  const jsonHref = `/sources.json?${jsonParams.toString()}`;
  /* The panel belongs to records whose publisher labels their state, not to the
     one native kind that today's only such adapter emits. */
  const hasAttributedState = nativeRecords.some(
    (record) => attributedNativeState(record) !== null,
  );

  return (
    <article id="source-record" aria-labelledby="source-record-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{words(declaration.source_kind)}</Badge>
            <Badge variant="outline">{declaration.rights.access}</Badge>
            <span className="font-mono text-meta text-muted-foreground">
              {declaration.source_id}
            </span>
          </div>
          <h1 id="source-record-heading" className="text-display tracking-tight">
            {declaration.publisher_or_maintainer}
          </h1>
          <p className="mt-1 text-body text-muted-foreground">
            Native namespace <span className="font-mono text-foreground">{declaration.native_namespace}</span>
          </p>
        </div>
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          className="self-start"
          render={<Link href={jsonHref} />}
        >
          Exact JSON
          <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" />
        </Button>
      </div>

      <p className="mt-4 font-mono text-meta text-muted-foreground">
        {number.format(source.native_record_count)} source-native objects · {number.format(source.repository_binding_count)} Repository bindings
      </p>

      {hasAttributedState ? (
        <section className="mt-6 rounded-lg border bg-muted/25 p-4" aria-labelledby="native-api-map-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <h2 id="native-api-map-heading" className="text-subtitle">
                Native API map
              </h2>
              <p className="mt-1 text-body leading-6 text-muted-foreground">
                Browse {number.format(source.native_record_count)} source-attributed requirements from the exact native revision. Implemented and planned are publisher labels, never Vela Standing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {query || nativeKind ? (
                <Button
                  nativeButton={false}
                  size="sm"
                  variant="ghost"
                  render={<Link href={sourceHref(declaration.source_id)} />}
                >
                  All requirements
                </Button>
              ) : null}
              {/* These two search a retained prose summary rather than the
                  declared-state field beside it, and "Planned" matches both
                  `planned` and `planned_with_partial_location`, so its label is
                  narrower than its result set. A structured facet needs a
                  `declaredState` parameter on the registry read: native records
                  are keyset-paginated twenty at a time, so filtering in memory
                  would describe one page rather than the source. That is a
                  change to the read contract and its JSON mirror, which is why
                  it has not been made here. */}
              <Button
                nativeButton={false}
                size="sm"
                variant={query === "source reports planned" ? "secondary" : "outline"}
                render={<Link href={`${sourceHref(declaration.source_id)}?q=source+reports+planned&record_kind=api_requirement#source-native-records`} />}
              >
                Planned requirements
              </Button>
              <Button
                nativeButton={false}
                size="sm"
                variant={query === "source reports implemented" ? "secondary" : "outline"}
                render={<Link href={`${sourceHref(declaration.source_id)}?q=source+reports+implemented&record_kind=api_requirement#source-native-records`} />}
              >
                Implemented requirements
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-10 2xl:grid-cols-2">
        <NativeRecordLedger
          sourceId={declaration.source_id}
          records={nativeRecords}
          nextCursor={nextCursor}
          bindingCursor={bindingCursor}
          query={query}
          nativeKind={nativeKind}
        />
        <RepositoryBindingLedger
          sourceId={declaration.source_id}
          bindings={repositoryBindings}
          nativeCursor={cursor}
          nextCursor={nextBindingCursor}
          query={query}
          nativeKind={nativeKind}
        />
      </div>

      <Collapsible className="mt-8 rounded-lg border">
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-compact font-medium">
          Source metadata
          <span className="text-meta text-muted-foreground">observation, coverage, identity, and rights</span>
        </CollapsibleTrigger>
        <CollapsibleContent keepMounted className="bg-muted/20 p-4 sm:p-5">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="source-observation-heading">
            <h3 id="source-observation-heading" className="mb-3 text-subtitle">
              Exact observation
            </h3>
            {observation ? (
              <ItemGroup className="grid gap-1.5">
                <FactItem
                  title="Observation"
                  description={observation.observation_id}
                />
                <FactItem
                  title="Native version"
                  description={`${observation.native_revision.kind}: ${observation.native_revision.value}`}
                />
                <FactItem
                  title="Observed"
                  description={
                    <time dateTime={machineInstant(observation.observed_at)}>
                      {formatDate(observation.observed_at)}
                    </time>
                  }
                />
                <FactItem
                  title="Snapshot"
                  description={`${words(observation.snapshot_state)} · ${words(declaration.snapshot_policy.retention)} retention`}
                />
              </ItemGroup>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No retained observation</EmptyTitle>
                  <EmptyDescription>
                    The source is declared, but this release carries no exact observation.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>

          <section aria-labelledby="source-projection-heading">
            <h3 id="source-projection-heading" className="mb-3 text-subtitle">
              Source-native objects and Repository bindings
            </h3>
            <ItemGroup className="grid gap-1.5">
              <FactItem
                title="Projected source-native rows"
                description={`${number.format(source.native_record_count)} exact source-native objects`}
              />
              <FactItem
                title="Observation-declared rows"
                description={observation
                  ? `${number.format(observation.projected_record_count)} rows · ${words(observation.coverage.status)} coverage`
                  : "No observation is present"}
              />
              <FactItem
                title="Repository bindings"
                description={`${number.format(source.repository_binding_count)} exact links to local Repository records`}
              />
            </ItemGroup>
          </section>

          <section aria-labelledby="source-coverage-heading">
            <h3 id="source-coverage-heading" className="mb-3 text-subtitle">
              Coverage and omissions
            </h3>
            <ItemGroup className="grid gap-1.5">
              {(observation?.coverage.included ?? []).map((included) => (
                <Item key={included} className="items-start rounded-md bg-background/60 px-3 py-3">
                  <ItemMedia variant="icon">
                    <HugeiconsIcon icon={Database} aria-hidden />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>Included</ItemTitle>
                    <ItemDescription className="line-clamp-none">
                      {included}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
              {(observation?.omissions ?? []).map((omission) => (
                <Item key={omission.code} className="items-start rounded-md bg-background/60 px-3 py-3">
                  <ItemContent>
                    <ItemTitle>{words(omission.code)}</ItemTitle>
                    <ItemDescription className="line-clamp-none">
                      {omission.description}
                    </ItemDescription>
                  </ItemContent>
                  <Badge variant="outline">omission</Badge>
                </Item>
              ))}
            </ItemGroup>
          </section>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Source identity and rights">
          <section>
            <h3 className="mb-3 text-subtitle">Attributed identity</h3>
            <ItemGroup className="grid gap-1.5">
              {declaration.attributed_claims.map((claim) => (
                <FactItem
                  key={`${claim.role}:${claim.name}`}
                  title={words(claim.role)}
                  description={`${claim.name} · ${claim.basis_locator_id}`}
                />
              ))}
            </ItemGroup>
          </section>

          <section>
            <h3 className="mb-3 text-subtitle">Rights and retention</h3>
            <ItemGroup className="grid gap-1.5">
              <FactItem title="License" description={declaration.rights.license_expression ?? "Not established"} />
              <FactItem title="Access" description={words(declaration.rights.access)} />
              <FactItem title="Redistribution" description={words(declaration.rights.redistribution)} />
              <FactItem title="Snapshot mode" description={words(declaration.snapshot_policy.mode)} />
            </ItemGroup>
          </section>

          <section>
            <h3 className="mb-3 text-subtitle">Source locators</h3>
            <ItemGroup className="grid gap-1.5">
              {declaration.locators.map((locator) => (
                <Item key={locator.locator_id} className="items-start rounded-md bg-background/60 px-3 py-3">
                  <ItemContent>
                    <ItemTitle>{words(locator.kind)}</ItemTitle>
                    <ItemDescription className="line-clamp-1">
                      {locator.url}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Open ${locator.kind} source locator`}
                      render={
                        <a href={locator.url} rel="noreferrer" target="_blank" />
                      }
                    >
                      <HugeiconsIcon icon={ExternalLink} aria-hidden />
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </section>
        </aside>
      </div>
        </CollapsibleContent>
      </Collapsible>

      <p className="mt-8 max-w-3xl text-body leading-6 text-muted-foreground">
        Source declarations, observations, source-native object rows, and
        Repository bindings record provenance. None creates scientific Standing;
        only an admitted local Claim can enter the attributed Decision path.
      </p>

      <Collapsible className="mt-6 rounded-lg border">
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-compact font-medium">
          Exact roots
          <span className="text-meta text-muted-foreground">
            {observation ? 8 : 4} values
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent keepMounted className="bg-muted/20 p-4">
          <SourceRootList
            roots={[
              { label: "Release root", value: releaseRoot },
              {
                label: "Declaration root",
                value: declaration.declaration_root,
              },
              { label: "Adapter root", value: declaration.adapter.adapter_root },
              { label: "Source row root", value: source.declaration_row_root },
              ...(observation
                ? [
                    {
                      label: "Acquisition root",
                      value: observation.acquisition_root,
                    },
                    {
                      label: "Observation root",
                      value: observation.observation_root,
                    },
                    {
                      label: "Projected source-native rows root",
                      value: observation.projected_records_root,
                    },
                    {
                      label: "Snapshot root",
                      value: observation.snapshot_root ?? "not retained",
                    },
                  ]
                : []),
            ]}
          />
        </CollapsibleContent>
      </Collapsible>
    </article>
  );
}

function NativeRecordLedger({
  sourceId,
  records,
  nextCursor,
  bindingCursor,
  query,
  nativeKind,
}: {
  sourceId: string;
  records: NativeSourceRecord[];
  nextCursor?: string | null;
  bindingCursor?: string | null;
  query?: string | null;
  nativeKind?: string | null;
}) {
  return (
    <section id="source-native-records" aria-labelledby="source-native-records-heading" className="min-w-0 scroll-mt-16">
      <div className="mb-3">
        <h3 id="source-native-records-heading" className="text-subtitle">
          Source-native objects
        </h3>
        <p className="mt-1 text-meta text-muted-foreground">
          Stable native key order · {number.format(records.length)} shown
        </p>
      </div>
      {records.length > 0 ? (
        <>
          <div className="hidden max-h-[34rem] overflow-auto rounded-lg border md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Object</TableHead>
                  <TableHead className="w-32">Kind</TableHead>
                  <TableHead className="w-28">Availability</TableHead>
                  <TableHead className="w-16"><span className="sr-only">Source link</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.row_root}>
                    <TableCell className="max-w-xl whitespace-normal py-3 align-top">
                      {/* The desktop table has its own row renderer, and both
                          print upstream source text. Fixing only the mobile
                          Item left the table — the view this page actually
                          shows — still printing `&#60;` and raw TeX. */}
                      <p className="font-medium"><ScientificText text={decodeHtmlEntities(record.title)} /></p>
                      <p className="mt-1 break-all font-mono text-meta text-muted-foreground">
                        {record.native_id}
                      </p>
                      {record.summary ? (
                        <p className="mt-1 line-clamp-2 text-meta leading-5 text-muted-foreground">
                          <ScientificText text={decodeHtmlEntities(record.summary)} />
                        </p>
                      ) : null}
                      {attributedNativeState(record) ? (
                        <Badge variant="outline" className="mt-2">
                          {attributedNativeState(record)}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-normal align-top text-meta text-muted-foreground">
                      {words(record.native_kind)}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline">{words(record.availability)}</Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      {record.locators[0] ? (
                        <Button
                          nativeButton={false}
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Open source for ${record.title}`}
                          render={<a href={record.locators[0].url} rel="noreferrer" target="_blank" />}
                        >
                          <HugeiconsIcon icon={ExternalLink} aria-hidden />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ItemGroup className="grid gap-2 md:hidden">
            {records.map((record) => (
              <Item key={record.row_root} className="items-start rounded-lg bg-muted/30 px-3 py-4">
                <ItemContent>
                  {/* Same upstream text as the table cell above, so it gets the
                      same treatment. This branch was missed when the table was
                      fixed, and a phone still read `&#60;` and raw TeX. */}
                  <ItemTitle className="line-clamp-none">
                    <ScientificText text={decodeHtmlEntities(record.title)} />
                  </ItemTitle>
                  <ItemDescription className="line-clamp-none">
                    {words(record.native_kind)} · {words(record.availability)}
                  </ItemDescription>
                  <p className="break-all font-mono text-meta text-muted-foreground">
                    {record.native_id}
                  </p>
                  {attributedNativeState(record) ? (
                    <Badge variant="outline" className="mt-1">
                      {attributedNativeState(record)}
                    </Badge>
                  ) : null}
                </ItemContent>
                {record.locators[0] ? (
                  <ItemActions>
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Open source for ${record.title}`}
                      render={<a href={record.locators[0].url} rel="noreferrer" target="_blank" />}
                    >
                      <HugeiconsIcon icon={ExternalLink} aria-hidden />
                    </Button>
                  </ItemActions>
                ) : null}
              </Item>
            ))}
          </ItemGroup>
        </>
      ) : (
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>No materialized objects on this page</ItemTitle>
            <ItemDescription>
              The declaration may retain only an exact reference or omission.
            </ItemDescription>
          </ItemContent>
        </Item>
      )}
      {nextCursor ? (
        <Pagination className="mt-4 justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationNext
                text="Next objects"
                href={sourcePageHref({
                  sourceId,
                  cursor: nextCursor,
                  bindingCursor,
                  query,
                  nativeKind,
                  anchor: "source-native-records",
                })}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </section>
  );
}

function RepositoryBindingLedger({
  sourceId,
  bindings,
  nativeCursor,
  nextCursor,
  query,
  nativeKind,
}: {
  sourceId: string;
  bindings: RepositorySourceBinding[];
  nativeCursor?: string | null;
  nextCursor?: string | null;
  query?: string | null;
  nativeKind?: string | null;
}) {
  return (
    <section id="source-repository-bindings" aria-labelledby="source-repository-bindings-heading" className="min-w-0 scroll-mt-16">
      <div className="mb-3">
        <h3 id="source-repository-bindings-heading" className="text-subtitle">
          Repository bindings
        </h3>
        <p className="mt-1 text-meta text-muted-foreground">
          Exact local relationships · {number.format(bindings.length)} shown
        </p>
      </div>
      {bindings.length > 0 ? (
        <ItemGroup className="grid max-h-[34rem] gap-2 overflow-auto pr-1">
          {bindings.map((binding) => {
            const href = bindingHref(binding);
            return (
              <Item
                key={binding.binding_root}
                className="items-start rounded-lg bg-muted/30 px-3 py-3"
              >
                <ItemContent className="min-w-0">
                  <ItemTitle className="min-w-0 break-all font-mono text-meta leading-5 line-clamp-none">
                    {href ? (
                      <Link href={href} className="underline-offset-4 hover:underline">
                        {binding.repository_object_id}
                      </Link>
                    ) : binding.repository_object_id}
                  </ItemTitle>
                  <ItemDescription className="line-clamp-none">
                    {repositoryHandle(binding.repository_id)} · {words(binding.repository_object_kind)}
                    {" · "}
                    {words(binding.binding_kind)}
                  </ItemDescription>
                  <p className="break-all font-mono text-meta text-muted-foreground">
                    {binding.native_id ?? "no source-native identity"}
                  </p>
                </ItemContent>
                <Badge variant="outline" className="shrink-0">
                  {words(binding.local_standing_effect)}
                </Badge>
              </Item>
            );
          })}
        </ItemGroup>
      ) : (
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>No Repository bindings on this page</ItemTitle>
            <ItemDescription>
              A source observation does not create a local scientific record.
            </ItemDescription>
          </ItemContent>
        </Item>
      )}
      {nextCursor ? (
        <Pagination className="mt-4 justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationNext
                text="Next bindings"
                href={sourcePageHref({
                  sourceId,
                  cursor: nativeCursor,
                  bindingCursor: nextCursor,
                  query,
                  nativeKind,
                  anchor: "source-repository-bindings",
                })}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </section>
  );
}

function FactItem({ title, description }: { title: string; description: ReactNode }) {
  return (
    <Item className="items-start rounded-md bg-background/60 px-3 py-3">
      <ItemContent>
        <ItemTitle className="capitalize">{title}</ItemTitle>
        <ItemDescription className="line-clamp-none">{description}</ItemDescription>
      </ItemContent>
    </Item>
  );
}

function SourceRootList({
  roots,
  columns = "two",
}: {
  roots: Array<{ label: string; value: string }>;
  columns?: "two" | "three";
}) {
  return (
    <dl
      className={
        columns === "three"
          ? "grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          : "grid min-w-0 gap-4 sm:grid-cols-2"
      }
    >
      {roots.map(({ label, value }) => (
        <RootFact key={label} label={label} value={value} />
      ))}
    </dl>
  );
}
