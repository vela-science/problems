import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  formalConjecturesAuditProjection,
  mathSourceRegistryRead,
} from "@vela/projection-data";
import { SourceRecordView } from "@/components/vela/source-registry";
import { PageShell } from "@vela/ui/vela/page-shell";
import { Button } from "@vela/ui/components/button";
import { PageIntro } from "@/components/vela/page-intro";
import { FormalConjecturesAudit } from "@/components/vela/formal-conjectures-audit";

export const dynamic = "force-dynamic";

const formalConjecturesAuditSourceId = "source:formal-conjectures-pr-audit";

const sourceIdPattern = /^source:[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function decodedSourceId(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    return sourceIdPattern.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function selectedCursor(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string" && value.length > 0 && value.length <= 2048) {
    return value;
  }
  return undefined;
}

function selectedFilter(
  value: string | string[] | undefined,
  maximumLength: number,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumLength) {
    return undefined;
  }
  return normalized;
}

export async function generateMetadata({
  params,
}: PageProps<"/sources/[id]">): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = decodedSourceId(rawId);
  if (!id) return {};
  if (id === formalConjecturesAuditSourceId) {
    return {
      title: "Formal Conjectures PR audit",
      description: "Five exact, source-local pull-request audit records projected read-only from the pinned public Math artifact.",
      alternates: { canonical: `/sources/${encodeURIComponent(id)}` },
    };
  }
  const result = await mathSourceRegistryRead({
    sourceId: id,
    includeRecords: false,
  });
  const source = result.sources[0];
  if (!source) return {};
  return {
    title: source.declaration.publisher_or_maintainer,
    description: `Exact observation, source-native records, and Repository bindings for ${source.declaration.native_namespace}.`,
    alternates: { canonical: `/sources/${encodeURIComponent(id)}` },
  };
}

export default async function SourcePage({
  params,
  searchParams,
}: PageProps<"/sources/[id]">) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = decodedSourceId(rawId);
  if (!id) notFound();
  if (id === formalConjecturesAuditSourceId) {
    const source = formalConjecturesAuditProjection.source;
    return <PageShell archetype="data" layout="canvas">
      <PageIntro
        title="Formal Conjectures PR audit"
        description="Five exact source-local records retain upstream pull-request state, scoped checks, semantic findings, and artifact availability without importing authority into Math."
        actions={<Button className="min-h-11" nativeButton={false} variant="outline" render={<a href={formalConjecturesAuditProjection.math_projection.public_locator} />}>Exact Math artifact</Button>}
        signals={[
          { label: "Inventory", value: "5 / 5", detail: "complete closed set", tone: "evidence" },
          { label: "Adapter", value: "9 / 9", detail: "shared conformance contract", tone: "evidence" },
          { label: "Source", value: source.commit.slice(0, 10), detail: "public fork commit", tone: "neutral" },
          { label: "Authority", value: "None", detail: "read-only observation", tone: "neutral" },
          { label: "Standing", value: "Unchanged", detail: "no automatic conversion", tone: "neutral" },
        ]}
      />
      <div className="mt-10 max-w-5xl">
        <FormalConjecturesAudit records={[...formalConjecturesAuditProjection.records]} completeInventory />
      </div>
    </PageShell>;
  }
  const cursor = selectedCursor(query.cursor);
  const bindingCursor = selectedCursor(query.binding);
  const nativeQuery = selectedFilter(query.q, 160);
  const nativeKind = selectedFilter(query.record_kind, 80);
  const result = await mathSourceRegistryRead({
    sourceId: id,
    includeRecords: true,
    query: nativeQuery,
    nativeKind,
    cursor,
    bindingCursor,
    limit: 20,
  });
  if (result.sources.length !== 1) notFound();

  return (
    <PageShell archetype="data" layout="canvas">
      <SourceRecordView
        source={result.sources[0]}
        releaseRoot={result.release_root}
        nativeRecords={result.native_records}
        repositoryBindings={result.repository_bindings}
        cursor={cursor}
        bindingCursor={bindingCursor}
        query={nativeQuery}
        nativeKind={nativeKind}
        nextCursor={result.next_cursor}
        nextBindingCursor={result.next_binding_cursor}
      />
    </PageShell>
  );
}
