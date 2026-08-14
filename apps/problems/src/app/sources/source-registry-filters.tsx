"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@vela/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vela/ui/components/select";

export interface SourceRegistryFilterState {
  query?: string;
  sourceId?: string;
  kind?: string;
  coverage?: string;
  nativeId?: string;
  nativeKind?: string;
  repositorySlug?: string;
  cursor?: string;
}

export function SourceRegistryFilters({
  filters,
  kinds,
  sources,
  coverageStates,
  repositories,
}: {
  filters: SourceRegistryFilterState;
  kinds: string[];
  sources: Array<{ id: string; label: string }>;
  coverageStates: string[];
  repositories: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(values: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("cursor");
    params.delete("binding");
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  const hasFilters = Boolean(
    filters.query
      || filters.sourceId
      || filters.kind
      || filters.coverage
      || filters.nativeId
      || filters.nativeKind
      || filters.repositorySlug,
  );
  const advancedFilterCount = [
    filters.nativeId,
    filters.nativeKind,
    filters.kind,
    filters.coverage,
  ].filter(Boolean).length;

  return (
    <form
      role="search"
      aria-label="Filter source registry"
      className="grid gap-2 xl:grid-cols-[minmax(18rem,1fr)_13rem_12rem_auto_auto] xl:items-center"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const query = String(data.get("q") ?? "").trim();
        const nativeId = String(data.get("native_id") ?? "").trim();
        const nativeKind = String(data.get("record_kind") ?? "").trim();
        update({
          q: query || null,
          native_id: nativeId || null,
          record_kind: nativeKind || null,
        });
      }}
    >
      <InputGroup className="min-w-0">
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          key={filters.query ?? ""}
          name="q"
          defaultValue={filters.query ?? ""}
          placeholder="Search record IDs, titles, or summaries"
          aria-label="Search source-native records"
        />
      </InputGroup>
      <Select
        value={filters.sourceId ?? "all"}
        onValueChange={(value) => update({
          source: value && value !== "all" ? value : null,
        })}
      >
        <SelectTrigger aria-label="Filter records by source" className="w-full">
          <SelectValue>
            {sources.find(({ id }) => id === filters.sourceId)?.label ?? "All sources"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="all">All sources</SelectItem>
          {sources.map((source) => (
            <SelectItem key={source.id} value={source.id}>
              {source.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.repositorySlug ?? "all"}
        onValueChange={(value) => update({
          repository: value && value !== "all" ? value : null,
        })}
      >
        <SelectTrigger aria-label="Filter records by Repository" className="w-full">
          <SelectValue>
            {filters.repositorySlug ?? "All Repositories"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="all">All Repositories</SelectItem>
          {repositories.map((repository) => (
            <SelectItem key={repository} value={repository}>
              {repository}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="outline">
        Search
      </Button>
      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            router.push(pathname, { scroll: false });
          }}
        >
          <HugeiconsIcon icon={Cancel01Icon} aria-hidden data-icon="inline-start" />
          Clear
        </Button>
      ) : null}
      <details className="group rounded-lg bg-muted/30 px-3 xl:col-span-5" open={advancedFilterCount > 0}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-compact font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <span>Advanced filters</span>
          <span className="text-right text-meta text-muted-foreground">
            {advancedFilterCount ? `${advancedFilterCount} active` : <><span className="xl:hidden">4 exact filters</span><span className="hidden xl:inline">Exact ID, record kind, source kind, coverage</span></>}
          </span>
        </summary>
        <div className="grid gap-2 bg-background/35 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <InputGroup className="min-w-0">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              key={filters.nativeId ?? ""}
              name="native_id"
              defaultValue={filters.nativeId ?? ""}
              placeholder="Exact native ID"
              aria-label="Find an exact native record ID"
            />
          </InputGroup>
          <InputGroup className="min-w-0">
            <InputGroupInput
              key={filters.nativeKind ?? ""}
              name="record_kind"
              defaultValue={filters.nativeKind ?? ""}
              placeholder="Record kind"
              aria-label="Filter by native record kind"
            />
          </InputGroup>
          <Select
            value={filters.kind ?? "all"}
            onValueChange={(value) => update({
              kind: value && value !== "all" ? value : null,
            })}
          >
            <SelectTrigger aria-label="Filter by source kind" className="w-full">
              <SelectValue>
                {filters.kind
                  ? filters.kind.replaceAll("_", " ")
                  : "All source kinds"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">All source kinds</SelectItem>
              {kinds.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {kind.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.coverage ?? "all"}
            onValueChange={(value) => update({
              coverage: value && value !== "all" ? value : null,
            })}
          >
            <SelectTrigger aria-label="Filter by coverage" className="w-full">
              <SelectValue>
                {filters.coverage
                  ? filters.coverage.replaceAll("_", " ")
                  : "All coverage"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">All coverage</SelectItem>
              {coverageStates.map((coverage) => (
                <SelectItem key={coverage} value={coverage}>
                  {coverage.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </details>
    </form>
  );
}
