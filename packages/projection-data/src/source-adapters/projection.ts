import { canonicalJson, sha256 } from "../canonical";
import {
  createMathSourceObservation,
  createNativeSourceRecord,
  mathSourceById,
  type MathSourceObservation,
  type NativeSourceRecord,
} from "../math-sources";
import {
  sourceAdapterBundleSchema,
  type SourceAdapterBundle,
  type SourceNativeRecord,
} from "./contracts";

const UNSCOPED_OBSERVATION_ROOT = `sha256:${"0".repeat(64)}` as const;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function scalar(value: unknown): string | number | boolean | null {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
  ) {
    return value;
  }
  return canonicalJson(value);
}

function projectedLocators(record: SourceNativeRecord) {
  return record.locators.map((url, index) => ({
    locator_id: `native-${index + 1}`,
    kind: "artifact" as const,
    url,
  }));
}

function projectedRecord(
  record: SourceNativeRecord,
  observationRoot: `sha256:${string}`,
): NativeSourceRecord {
  const metadata = Object.fromEntries(
    Object.entries(record.metadata).map(([key, value]) => [key, scalar(value)]),
  );
  return createNativeSourceRecord({
    schema: "vela.math-native-record.v1",
    source_id: record.source_id,
    observation_root: observationRoot,
    native_id: record.native_id,
    native_kind: record.native_kind,
    native_revision: record.native_revision,
    title: record.title,
    summary: record.summary,
    locators: projectedLocators(record),
    metadata,
    metadata_root: sha256(canonicalJson(metadata)),
    content_root: record.content_root,
    availability: "reference_only",
  });
}

export interface MaterializedSourceAdapterBundle {
  observation: MathSourceObservation;
  native_records: NativeSourceRecord[];
}

/**
 * The sole bridge from verified source-adapter output into the existing
 * immutable Math Source Registry rows. Adapters never write releases or
 * Repositories directly.
 */
export function materializeVerifiedSourceAdapterBundle(
  uncheckedBundle: SourceAdapterBundle,
  adapterRecords: ReadonlyArray<SourceNativeRecord>,
  observedAt: string,
): MaterializedSourceAdapterBundle {
  const bundle = sourceAdapterBundleSchema.parse(uncheckedBundle);
  const source = mathSourceById(bundle.source_id);
  if (
    source.declaration_root !== bundle.declaration_root
    || source.adapter.mode !== bundle.acquisition_mode
    || source.adapter.acquisition_contract !== bundle.schema
    || source.adapter.adapter_id !== bundle.adapter.adapter_id
    || source.adapter.version !== bundle.adapter.version
  ) {
    throw new Error(
      `${bundle.source_id}: source-adapter identity does not match its checked declaration`,
    );
  }
  if (
    adapterRecords.length !== bundle.output.record_count
    || adapterRecords.some(({ source_id }) => source_id !== bundle.source_id)
  ) {
    throw new Error(`${bundle.source_id}: verified adapter records do not match the bundle`);
  }
  const provisional = adapterRecords.map((record) => (
    projectedRecord(record, UNSCOPED_OBSERVATION_ROOT)
  )).sort((left, right) => compareText(left.native_id, right.native_id));
  const projectedRecordsRoot = sha256(canonicalJson(
    provisional.map(({ row_root }) => row_root),
  ));
  const snapshotRoot = [
    "retained_exact_bytes",
    "existing_repository_bytes",
  ].includes(source.snapshot_policy.mode)
    ? bundle.revision.content_root
    : null;
  const observation = createMathSourceObservation({
    source_id: bundle.source_id,
    observation_id: `observation:${bundle.source_id.slice(7)}:${bundle.bundle_root.slice(7, 23)}`,
    acquisition_root: bundle.bundle_root,
    observed_at: observedAt,
    native_revision: bundle.revision.kind === "git"
      ? {
        kind: "git",
        value: bundle.revision.value,
        content_root: bundle.revision.content_root,
        tree: bundle.revision.git_tree,
      }
      : {
        kind: "observation",
        value: bundle.revision.value,
        content_root: bundle.revision.content_root,
        tree: null,
      },
    snapshot_root: snapshotRoot,
    snapshot_state: source.snapshot_policy.mode,
    projected_record_count: provisional.length,
    projected_records_root: projectedRecordsRoot,
    coverage: {
      status: bundle.coverage.status,
      included: [bundle.coverage.scope],
      native_record_count: bundle.coverage.native_record_count,
      projected_record_count: provisional.length,
    },
    omissions: [...bundle.omissions, ...bundle.loss],
  });
  const nativeRecords = provisional.map((record) => {
    const adapterRecord = adapterRecords.find(
      ({ native_id }) => native_id === record.native_id,
    );
    if (!adapterRecord) {
      throw new Error(`${bundle.source_id}: missing adapter record ${record.native_id}`);
    }
    const projected = projectedRecord(
      adapterRecord,
      observation.observation_root as `sha256:${string}`,
    );
    if (projected.row_root !== record.row_root) {
      throw new Error(`${bundle.source_id}: observation scoping changed a native record root`);
    }
    return projected;
  });
  return { observation, native_records: nativeRecords };
}
