import {
  FactItem,
  SourceRootList,
  attributedNativeState,
  bindingHref,
  latestObservation,
  number,
  repositoryHandle,
  sourceHref,
  sourcePageHref,
  words,
} from "./shared";
import Link from "next/link";
import type {
  RepositorySourceBinding,
  NativeSourceRecord,
  ProjectedMathSource,
} from "@vela/projection-data";
import {
  ArrowRight01Icon as ArrowRight,
  Database01Icon as Database,
  LinkSquare01Icon as ExternalLink,
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
import { formatDate, machineInstant } from "@/lib/format";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";

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
  /* The panel belongs to API-map requirements. It used to key on any record
     whose publisher labels its state, which was the same set until the Palomar
     adapter began declaring `registered` as a source state on registry entries
     — records this panel's requirement copy and planned/implemented filters do
     not describe. The chip beside each record still renders every attributed
     state; only the requirement-browsing panel is kind-gated. */
  const hasAttributedState = nativeRecords.some(
    (record) => record.native_kind === "api_requirement"
      && attributedNativeState(record) !== null,
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
            <h2 id="source-observation-heading" className="mb-3 text-subtitle">
              Exact observation
            </h2>
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
            <h2 id="source-projection-heading" className="mb-3 text-subtitle">
              Source-native objects and Repository bindings
            </h2>
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
            <h2 id="source-coverage-heading" className="mb-3 text-subtitle">
              Coverage and omissions
            </h2>
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
            <h2 className="mb-3 text-subtitle">Attributed identity</h2>
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
            <h2 className="mb-3 text-subtitle">Rights and retention</h2>
            <ItemGroup className="grid gap-1.5">
              <FactItem title="License" description={declaration.rights.license_expression ?? "Not established"} />
              <FactItem title="Access" description={words(declaration.rights.access)} />
              <FactItem title="Redistribution" description={words(declaration.rights.redistribution)} />
              <FactItem title="Snapshot mode" description={words(declaration.snapshot_policy.mode)} />
            </ItemGroup>
          </section>

          <section>
            <h2 className="mb-3 text-subtitle">Source locators</h2>
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
        <h2 id="source-native-records-heading" className="text-subtitle">
          Source-native objects
        </h2>
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
        <h2 id="source-repository-bindings-heading" className="text-subtitle">
          Repository bindings
        </h2>
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

