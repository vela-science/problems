import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GitForkIcon, Search01Icon as Search } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  allRepositories,
  claimsForRepository,
  repositoryBySlug,
  statusClaimCount,
} from "@vela/projection-data";
import { Button } from "@vela/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@vela/ui/components/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@vela/ui/components/input-group";
import { ItemGroup } from "@vela/ui/components/item";
import { RouteTitle } from "@/components/vela/route-title";
import { ClaimRow } from "@/components/vela/claim-row";
import { EvidenceLadder } from "@/components/vela/evidence-ladder";
import { FacetRail } from "@/components/vela/facet-rail";
import { LedgerPager } from "@/components/vela/ledger-pager";
import { pageFromSearchParams, queryHref, type QueryUpdate } from "@/lib/query-state";

export const dynamicParams = false;
export async function generateStaticParams() {
  return (await allRepositories()).map((repository) => ({ slug: repository.slug }));
}
export async function generateMetadata({
  params,
}: PageProps<"/repositories/[slug]/claims">): Promise<Metadata> {
  const { slug } = await params;
  const repository = await repositoryBySlug(slug);
  return repository
    ? {
        title: `${repository.status.repository.name}: claims`,
        description: `Searchable claim records in the ${repository.status.repository.name} repository.`,
        /* Without this the root layout's `/repositories` canonical is inherited,
           which tells a crawler this ledger is a duplicate of the repository
           list. The bare path, not the current query: the filters and pages are
           views of one record set. Every sibling surface declares its own. */
        alternates: { canonical: `/repositories/${slug}/claims` },
      }
    : {};
}
const pageSize = 50;

export default async function ClaimsPage({
  params,
  searchParams,
}: PageProps<"/repositories/[slug]/claims">) {
  const { slug } = await params;
  const query = await searchParams;
  const repository = await repositoryBySlug(slug);
  if (!repository) notFound();
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string).trim() : "");
  const q = text("q");
  const standing = text("standing");
  const assertionKind = text("kind");
  const sourceType = text("source");
  const disposition = text("disposition");
  const sort = (["recent", "identifier", "evidence"] as const).find((value) => value === text("sort")) ?? "recent";
  const filter = { q, standing, assertionKind, sourceType, disposition, sort } as const;
  const initialPage = pageFromSearchParams(query);
  let result = await claimsForRepository(slug, {
    ...filter,
    limit: pageSize,
    offset: (initialPage - 1) * pageSize,
  });
  const pages = Math.max(1, Math.ceil(result.total / pageSize));
  const page = Math.min(initialPage, pages);
  if (page !== initialPage)
    result = await claimsForRepository(slug, {
      ...filter,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

  /* Verification Records, keyed on the Claim they were recorded against.
     `projection.reviews` carries both `target` and `claim`; `target` is the
     one holding a Claim identifier, and `buildClaimStandingView` is the
     authority for that choice. Fifteen Claims in the release have one. */
  const verified = new Set(
    repository.reviews
      .filter((review) => review.verification_status === "pass")
      .map((review) => review.target),
  );

  const active: Record<string, string> = {
    ...(q ? { q } : {}),
    ...(standing ? { standing } : {}),
    ...(assertionKind ? { kind: assertionKind } : {}),
    ...(sourceType ? { source: sourceType } : {}),
    ...(disposition ? { disposition } : {}),
    ...(sort !== "recent" ? { sort } : {}),
  };
  const activeParams = new URLSearchParams(active);
  /* Any narrowing returns to page one: keeping an offset across a filter change
     lands the reader on an empty page of a smaller result set. */
  const withParams = (updates: QueryUpdate) =>
    queryHref(`/repositories/${slug}/claims`, activeParams, updates);
  const narrowed = Object.keys(active).filter((key) => key !== "sort");

  /* A control that cannot change the result does not render. `FacetRail` has
     always applied this to its own groups; here it decides the whole toolbar.
     The page's shape comes from the repository's own Claim count rather than
     from the filtered total, so the search field does not appear and vanish
     underneath a reader who is narrowing. A sort key is the exception: it is
     gated on how many values it takes over the active set, because a sort that
     cannot reorder the rows on screen is dead whatever the repository holds. */
  const searchable = statusClaimCount(repository.status) > pageSize;
  const sorts = (
    [
      ["recent", "Recent", result.variance.created > 1],
      ["evidence", "Evidence", result.variance.evidence_count > 1],
      ["identifier", "Identifier", result.total > 1],
    ] as const
  ).filter(([, , varies]) => varies);
  const kindHref = result.facets.assertion_kind.length > 1
    ? (kind: string) => withParams({ kind, page: null })
    : null;

  const first = (page - 1) * pageSize + 1;
  const last = (page - 1) * pageSize + result.items.length;

  return (
    <PageShell archetype="data" layout="canvas">
      <RouteTitle title="Assertions" scope={repository.status.repository.name} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Range-of-total phrasing adapted from Tailwind Plus (licensed for this
            repository); the counts are the projection's own. */}
        <span className="font-mono text-micro tabular-nums text-muted-foreground">
          {pages > 1
            ? `Showing ${first.toLocaleString()}–${last.toLocaleString()} of ${result.total.toLocaleString()}`
            : `${result.total.toLocaleString()} ${result.total === 1 ? "assertion" : "assertions"}`}
        </span>

        {searchable ? (
          <form className="flex" action={`/repositories/${slug}/claims`}>
            {/* The narrowing already in the URL is carried through the submit,
                so searching does not silently discard a chip beside it. */}
            {Object.entries(active)
              .filter(([key]) => key !== "q")
              .map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
            <InputGroup className="h-8 w-56 sm:w-72">
              <InputGroupAddon>
                <HugeiconsIcon icon={Search} aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                name="q"
                defaultValue={q}
                placeholder="Search assertion, source, or exact ID"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="submit">Search</InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        ) : null}

        {sorts.length > 1 ? (
          <span className="flex items-center gap-1">
            {sorts.map(([value, label]) => (
              <Button
                key={value}
                nativeButton={false}
                size="sm"
                variant={sort === value ? "outline" : "ghost"}
                aria-current={sort === value ? "true" : undefined}
                render={<Link href={withParams({ sort: value === "recent" ? null : value, page: null })} />}
              >
                {label}
              </Button>
            ))}
          </span>
        ) : null}

        {/* The graph is this ledger drawn as a graph — a view of the
            collection, so it sits with the collection's other views. */}
        {repository.graph ? (
          <Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/graph?repository=${slug}&lens=research`} />}>
            <HugeiconsIcon icon={GitForkIcon} aria-hidden />
            Graph view
          </Button>
        ) : null}
      </div>

      {narrowed.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {narrowed.map((key) => (
            <Button key={key} nativeButton={false} variant="outline" size="sm" render={<Link href={withParams({ [key]: null, page: null })} />}>
              {/* A facet value is a token and reads better spaced; a search
                  term is what the reader typed and is quoted back verbatim. */}
              {key === "q" ? active[key] : active[key]!.replaceAll("_", " ")} ×
            </Button>
          ))}
          <Button nativeButton={false} variant="ghost" size="sm" render={<Link href={withParams(Object.fromEntries(narrowed.map((key) => [key, null])))} />}>Clear all</Button>
        </div>
      ) : null}

      {/* The rows come first in source order and the rail is ordered back to
          the left column on a wide screen. The rail was first in the markup, so
          below `lg` a reader on a phone scrolled a four-step figure and four
          facet groups — roughly a full screen of controls — before reaching the
          first Claim. A collection "gets to its rows" (DESIGN.md), and on the
          viewport where that matters most it did the opposite. */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="order-2 min-w-0 lg:order-1">
          <EvidenceLadder
            className="mb-6"
            total={result.ladder.claims}
            steps={[
              { id: "claim", label: "Claim recorded", count: result.ladder.claims },
              { id: "evidence", label: "Evidence retained", count: result.ladder.with_evidence },
              { id: "proposal", label: "Proposal recorded", count: result.ladder.with_proposal },
            ]}
            caption="Each row counts the Claims in this result that reached that stratum. A gold rule carries where one stratum is contained in the one above it."
          />
          <FacetRail
            groups={[
              { name: "standing", label: "Standing", values: result.facets.standing },
              { name: "disposition", label: "Disposition", values: result.facets.disposition },
              { name: "kind", label: "Assertion kind", values: result.facets.assertion_kind },
              { name: "source", label: "Source type", values: result.facets.source_type },
            ]}
            selected={{ standing, disposition, kind: assertionKind, source: sourceType }}
            hrefFor={(name, value) => withParams({ [name]: value, page: null })}
          />
        </div>

        <section className="order-1 min-w-0 lg:order-2" aria-labelledby="ledger-heading">
          <h2 id="ledger-heading" className="sr-only">Claim ledger</h2>
          {result.items.length ? (
            <ItemGroup className="divide-y">
              {result.items.map((claim) => (
                <ClaimRow
                  key={claim.id}
                  claim={claim}
                  href={`/repositories/${slug}/claims/${claim.id}`}
                  verified={verified.has(claim.id)}
                  kindHref={claim.assertion_type && kindHref ? kindHref(claim.assertion_type) : undefined}
                />
              ))}
            </ItemGroup>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{narrowed.length ? "No matching Claim" : "No Claim yet"}</EmptyTitle>
                {/* Retaining none and matching none are different facts, and
                    only one of them is true of a repository that has admitted
                    nothing. This said "matches the current narrowing" at zero
                    total, on a page drawing no filter control at all. */}
                <EmptyDescription>{narrowed.length
                  ? "No Claim in this repository matches the current narrowing."
                  : "This repository has admitted no Claim. Nothing has been through a Decision here yet."}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent><Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/repositories/${slug}/proposals`} />}>See proposed changes</Button></EmptyContent>
            </Empty>
          )}

          <LedgerPager
            page={page}
            pages={pages}
            hrefFor={(nextPage) => withParams({ page: nextPage })}
            label="Claim pages"
          />
        </section>
      </div>
    </PageShell>
  );
}
