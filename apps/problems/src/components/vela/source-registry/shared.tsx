import type { ReactNode } from "react";
import type {
  RepositorySourceBinding,
  MathSourceRegistryReadResult,
  MathSourceRegistryRelease,
  NativeSourceRecord,
  ProjectedMathSource,
} from "@vela/projection-data";
import { slugForRepositoryId } from "@vela/projection-data";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@vela/ui/components/item";
import { RootFact } from "@/components/vela/root-fact";
import {
  type SourceRegistryFilterState,
} from "@/app/sources/source-registry-filters";

export type SourceRegistryViewModel = MathSourceRegistryReadResult & {
  source_registry: MathSourceRegistryRelease;
};

export const number = new Intl.NumberFormat("en-US");

/* A binding names a repository by its protocol identity. A reader navigates by
   the handle, so that is what a link and a label carry; the raw UUID shows only
   for a repository the registry does not know, where there is nothing better
   to say. */
export function repositoryHandle(repositoryId: string) {
  return slugForRepositoryId(repositoryId) ?? repositoryId;
}

export function words(value: string) {
  return value.replaceAll("_", " ");
}

export function attributedNativeState(record: NativeSourceRecord): string | null {
  const state = record.metadata.source_declared_state;
  if (typeof state === "string") return `source: ${words(state)}`;
  const done = record.metadata.source_declared_done;
  if (typeof done === "boolean") return done ? "source: implemented" : "source: planned";
  return null;
}

export function latestObservation(source: ProjectedMathSource) {
  return source.observation;
}

export function sourceHref(
  sourceId: string,
) {
  return `/sources/${encodeURIComponent(sourceId)}`;
}

export function recordSearchActive(filters: SourceRegistryFilterState) {
  return Boolean(
    filters.query
      || filters.sourceId
      || filters.nativeId
      || filters.nativeKind
      || filters.repositorySlug,
  );
}

export function sourceRegistryJsonHref(
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

export function sourceRegistryPageHref(
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

export function sourcePageHref({
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
export function bindingHref(binding: RepositorySourceBinding): string | null {
  if (binding.repository_object_kind === "claim") {
    return `/repositories/${repositoryHandle(binding.repository_id)}/claims/${binding.repository_object_id}`;
  }
  return null;
}

export function FactItem({ title, description }: { title: string; description: ReactNode }) {
  return (
    <Item className="items-start rounded-md bg-background/60 px-3 py-3">
      <ItemContent>
        <ItemTitle className="capitalize">{title}</ItemTitle>
        <ItemDescription className="line-clamp-none">{description}</ItemDescription>
      </ItemContent>
    </Item>
  );
}

export function SourceRootList({
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

