import type { Metadata } from "next";
import {
  mathSourceRegistryRead,
} from "@vela/projection-data";
import {
  SourceRegistryView,
} from "@/components/vela/source-registry";
import { PageShell } from "@vela/ui/vela/page-shell";

export const metadata: Metadata = {
  title: "Sources",
  description:
    "Exact source declarations, observations, projected source-native object rows, and Repository bindings in the current Vela Problems release.",
  alternates: { canonical: "/sources" },
};

const sourceIdPattern = /^source:[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function selectedFilter(
  value: string | string[] | undefined,
  maximumLength = 160,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumLength) {
    return undefined;
  }
  return normalized;
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    source?: string | string[];
    kind?: string | string[];
    coverage?: string | string[];
    native_id?: string | string[];
    record_kind?: string | string[];
    repository?: string | string[];
    cursor?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const query = selectedFilter(params.q);
  const selectedSource = selectedFilter(params.source, 80);
  const sourceId = selectedSource && sourceIdPattern.test(selectedSource)
    ? selectedSource
    : undefined;
  const kind = selectedFilter(params.kind, 80);
  const coverage = selectedFilter(params.coverage, 80);
  const nativeId = selectedFilter(params.native_id, 512);
  const nativeKind = selectedFilter(params.record_kind, 80);
  const repositorySlug = selectedFilter(params.repository, 80);
  const cursor = selectedFilter(params.cursor, 2_048);
  const includeRecords = Boolean(
    query || sourceId || nativeId || nativeKind || repositorySlug,
  );
  const result = await mathSourceRegistryRead({
    includeRecords,
    recordSourceId: sourceId,
    nativeId,
    nativeKind,
    query,
    repositorySlug,
    cursor,
    limit: 50,
  });

  return (
    <PageShell archetype="data" layout="canvas">
      <SourceRegistryView
        registry={result}
        filters={{
          query,
          sourceId,
          kind,
          coverage,
          nativeId,
          nativeKind,
          repositorySlug,
          cursor,
        }}
      />
    </PageShell>
  );
}
