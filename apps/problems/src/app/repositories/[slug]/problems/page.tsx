import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GitForkIcon, Search01Icon as Search } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { repositoryBySlug, problemsForRepository } from "@vela/projection-data";
import { Button } from "@vela/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@vela/ui/components/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@vela/ui/components/input-group";
import { FacetRail, liveFacetGroups } from "@/components/vela/facet-rail";
import { LedgerPager } from "@/components/vela/ledger-pager";
import { RouteTitle } from "@/components/vela/route-title";
import { plural } from "@/lib/format";
import { pageFromSearchParams, queryHref, type QueryUpdate } from "@/lib/query-state";
import { ProblemList } from "./problem-list";

export async function generateMetadata({
  params,
}: PageProps<"/repositories/[slug]/problems">): Promise<Metadata> {
  const { slug } = await params;
  const repository = await repositoryBySlug(slug);
  return repository
    ? {
        title: `${repository.status.repository.name}: problems`,
        description: `Source-native problems retained in the ${repository.status.repository.name} repository.`,
        /* As on the Claim ledger: without this the inherited canonical is
           `/repositories`, which asks a crawler to drop this surface. */
        alternates: { canonical: `/repositories/${slug}/problems` },
      }
    : {};
}
const pageSize = 50;

export default async function ProblemsPage({
  params,
  searchParams,
}: PageProps<"/repositories/[slug]/problems">) {
  const { slug } = await params;
  const query = await searchParams;
  const repository = await repositoryBySlug(slug);
  if (!repository) notFound();
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string).trim() : "");
  const q = text("q");
  const status = text("status");
  const formalization = text("formalization");
  const tag = text("tag");
  const source = text("source");
  const sort = (["number", "sources"] as const).find((value) => value === text("sort")) ?? "number";
  const filter = { q, status, formalization, tag, source, sort } as const;
  const initialPage = pageFromSearchParams(query);
  let result = await problemsForRepository(slug, {
    ...filter,
    limit: pageSize,
    offset: (initialPage - 1) * pageSize,
  });
  /* The count comes from the Problem ledger itself. It used to come from
     `graph.problem_count`, which counts problem-kind graph nodes — and a graph
     node exists only where a Claim does, so a repository holding a thousand
     open questions and no accepted assertion short-circuited to "No problems
     recorded" before this query ever ran. */
  const problemCount = result.total;
  const pages = Math.max(1, Math.ceil(result.total / pageSize));
  const page = Math.min(initialPage, pages);
  if (page !== initialPage)
    result = await problemsForRepository(slug, {
      ...filter,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
  const active: Record<string, string> = {
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(formalization ? { formalization } : {}),
    ...(tag ? { tag } : {}),
    ...(source ? { source } : {}),
    ...(sort !== "number" ? { sort } : {}),
  };
  const activeParams = new URLSearchParams(active);
  /* Any narrowing returns to page one: keeping an offset across a filter change
     lands the reader on an empty page of a smaller result set. */
  const withParams = (updates: QueryUpdate) =>
    queryHref(`/repositories/${slug}/problems`, activeParams, updates);
  const narrowed = Object.keys(active).filter((key) => key !== "sort" && key !== "q");
  /* Declared status is the page's figure, drawn in the rail rather than above
     it: the same list a reader filters by is the distribution they read. */
  const groups = [
    {
      name: "status",
      label: "Declared status",
      values: result.facets.status,
      note: `Status and formalization as the source record declares them, across two upstream serializations this product does not merge. Neither is a Vela standing. These ${problemCount.toLocaleString()} are source-native problems, not Claims: no Claim binds them and none carries a Verification.`,
    },
    { name: "formalization", label: "Formalization", values: result.facets.formalization },
    { name: "tag", label: "Subject tag", values: result.facets.tag, moreLabel: "subjects" },
    { name: "source", label: "Contributing source", values: result.facets.source },
  ];
  const rail = liveFacetGroups(groups);
  return (
    <PageShell archetype="data" layout="canvas">
      <RouteTitle title="Problems" scope={repository.status.repository.name} />
      {problemCount > pageSize || q ? (
        <form className="mb-5 flex gap-2" action={`/repositories/${slug}/problems`}>
          <InputGroup className="h-10 flex-1">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search} aria-hidden />
            </InputGroupAddon>
            {/* The field was digits-only, which made the statement, the subject
                and the source unsearchable on the only surface that reaches
                them. The server dispatches on what was typed. */}
            <InputGroupInput name="q" defaultValue={q} placeholder="Search statements, or a problem number" />
          </InputGroup>
          <Button type="submit">Filter</Button>
          {q ? (
            <Button nativeButton={false} variant="outline" render={<Link href={withParams({ q: null, page: null })} />}>
              Clear
            </Button>
          ) : null}
        </form>
      ) : null}
      {narrowed.length ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-eyebrow text-muted-foreground">Narrowed to</span>
          {narrowed.map((key) => (
            <Button key={key} nativeButton={false} variant="outline" size="sm" render={<Link href={withParams({ [key]: null, page: null })} />}>
              {active[key]!.replaceAll("_", " ")} ×
            </Button>
          ))}
          <Button nativeButton={false} variant="ghost" size="sm" render={<Link href={withParams(Object.fromEntries(narrowed.map((key) => [key, null])))} />}>Clear all</Button>
        </div>
      ) : null}
      {/* No rail, no gutter: at one value per group the figure cannot exist and
          a 13rem column would be empty space where an argument was. */}
      <div className={rail.length ? "grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]" : ""}>
        <FacetRail
          className="order-2 lg:order-1"
          groups={groups}
          selected={{ status, formalization, tag, source }}
          hrefFor={(name, value) => withParams({ [name]: value, page: null })}
        />
        <div className="order-1 min-w-0 lg:order-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-subtitle">Problem ledger</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-micro tabular-nums text-muted-foreground">
                {plural(result.total, "problem")}{pages > 1 ? ` · ${page}/${pages}` : ""}
              </span>
              {result.total > pageSize ? (
                <span className="flex items-center gap-1">
                  {([["number", "Number"], ["sources", "Sources"]] as const).map(([value, label]) => (
                    <Button key={value} nativeButton={false} size="sm" variant={sort === value ? "outline" : "ghost"} aria-current={sort === value ? "true" : undefined} render={<Link href={withParams({ sort: value === "number" ? null : value, page: null })} />}>{label}</Button>
                  ))}
                </span>
              ) : null}
              {/* One control for the collection, where 1,217 per-row controls
                  each opened a two-node star. */}
              {repository.graph ? (
                <Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/graph?repository=${slug}&lens=research`} />}>
                  <HugeiconsIcon icon={GitForkIcon} aria-hidden />
                  Graph view
                </Button>
              ) : null}
            </div>
          </div>
          {result.items.length ? (
            <ProblemList
              problems={result.items}
              slug={slug}
              tagHref={(value) => withParams({ tag: value, page: null })}
            />
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No problems</EmptyTitle>
                {/* A repository that retains no problem at all and a filter
                    that matched none of the ones it does are different facts,
                    and saying the second when the first is true tells a reader
                    to go looking for a filter they never set. */}
                <EmptyDescription>
                  {q || narrowed.length
                    ? "No problem matches this filter."
                    : "This repository retains no source-native problem at this release."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <LedgerPager
            page={page}
            pages={pages}
            hrefFor={(nextPage) => withParams({ page: nextPage })}
            label="Problem pages"
          />
        </div>
      </div>
    </PageShell>
  );
}
