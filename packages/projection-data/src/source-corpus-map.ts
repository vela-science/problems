import { z } from "zod";
import sourceCorpusProfilesJson from "../config/source-corpus-profiles.v1.json";
import { canonicalJson, sha256, type HashRoot } from "./canonical";
import type {
  MathSourceDeclaration,
  MathSourceRegistryRelease,
} from "./math-sources";

const sourceIdSchema = z.string().regex(/^source:[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const metadataKeySchema = z.string().regex(/^[a-z][a-z0-9_]{0,63}$/u);

const sourceCorpusProfileSchema = z.object({
  source_id: sourceIdSchema,
  source_label: z.string().trim().min(1),
  native_kind: z.string().trim().min(1),
  corpus_role: z.enum([
    "problem_catalog",
    "formal_statement_library",
    "attributed_activity_catalog",
  ]),
  role_label: z.string().trim().min(1),
  facet: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("metadata_scalar"),
      key: metadataKeySchema,
      label: z.string().trim().min(1),
    }).strict(),
    z.object({
      kind: z.literal("metadata_string_array"),
      key: metadataKeySchema,
      label: z.string().trim().min(1),
    }).strict(),
  ]),
}).strict();

export const sourceCorpusProfilesConfigSchema = z.object({
  schema: z.literal("vela.source-corpus-profiles.v1"),
  semantics: z.object({
    authority_effect: z.literal("none"),
    identity_effect: z.literal("none"),
    equivalence: z.literal("not_established"),
    standing_effect: z.literal("none"),
    classification_basis: z.literal("explicit_source_profile"),
    record_count_effect: z.literal("inventory_only"),
    source_values: z.literal("source_authored"),
    unprofiled_sources: z.literal("inventory_only"),
  }).strict(),
  profiles: z.array(sourceCorpusProfileSchema).min(1),
}).strict().superRefine((value, context) => {
  const identities = new Set<string>();
  const sourceIds = new Set<string>();
  for (const [index, profile] of value.profiles.entries()) {
    const identity = `${profile.source_id}\u0000${profile.native_kind}`;
    if (identities.has(identity)) {
      context.addIssue({
        code: "custom",
        path: ["profiles", index],
        message: "Source corpus profile identities must be unique",
      });
    }
    if (sourceIds.has(profile.source_id)) {
      context.addIssue({
        code: "custom",
        path: ["profiles", index, "source_id"],
        message: "Source corpus v1 supports one faceted profile per Source",
      });
    }
    identities.add(identity);
    sourceIds.add(profile.source_id);
  }
});

export type SourceCorpusProfilesConfig = z.infer<typeof sourceCorpusProfilesConfigSchema>;
export type SourceCorpusProfile = SourceCorpusProfilesConfig["profiles"][number];

export function parseSourceCorpusProfilesConfig(input: unknown): SourceCorpusProfilesConfig {
  return sourceCorpusProfilesConfigSchema.parse(input);
}

export const sourceCorpusProfilesConfig = parseSourceCorpusProfilesConfig(sourceCorpusProfilesJson);
export const sourceCorpusProfilesRoot: HashRoot = sha256(canonicalJson(sourceCorpusProfilesConfig));

export const MAX_SOURCE_CORPUS_SOURCES = 128;
export const MAX_SOURCE_CORPUS_PROFILES = 24;
export const MAX_SOURCE_CORPUS_RECORDS_PER_PROFILE = 10_000;
export const MAX_SOURCE_CORPUS_PROFILE_RECORDS = 25_000;
export const MAX_SOURCE_CORPUS_VALUES_PER_PROFILE = 128;

export function assertSourceCorpusProfileBounds(
  config: SourceCorpusProfilesConfig = sourceCorpusProfilesConfig,
): void {
  if (config.profiles.length > MAX_SOURCE_CORPUS_PROFILES) {
    throw new Error(`Source corpus map exceeds the reviewed ${MAX_SOURCE_CORPUS_PROFILES}-profile bound`);
  }
}

export type SourceCorpusInventoryInput = {
  source_id: string;
  source_kind: MathSourceDeclaration["source_kind"];
  declaration_root: HashRoot;
  observation_root: HashRoot;
  coverage_status: "complete" | "partial" | "unobserved";
  native_record_count: number;
  repository_binding_count: number;
};

export type SourceCorpusProfileInput = {
  source_id: string;
  native_kind: string;
  facet_values: unknown[];
};

export type SourceCorpusMapSummaryInput = {
  release_root: HashRoot;
  source_registry: MathSourceRegistryRelease;
  sources: SourceCorpusInventoryInput[];
  profiles: SourceCorpusProfileInput[];
};

export type SourceCorpusMapRead = {
  schema: "vela.source-corpus-map-read.v1";
  release_root: HashRoot;
  profile_root: HashRoot;
  semantics: SourceCorpusProfilesConfig["semantics"];
  coverage_complete: true;
  inventory: {
    source_count: number;
    observation_count: number;
    observed_source_count: number;
    unobserved_source_count: number;
    native_record_count: number;
    repository_binding_count: number;
    source_kinds: Array<{
      source_kind: MathSourceDeclaration["source_kind"];
      source_count: number;
      native_record_count: number;
    }>;
    sources: SourceCorpusInventoryInput[];
  };
  corpora: Array<{
    source_id: string;
    source_label: string;
    source_kind: MathSourceDeclaration["source_kind"];
    native_kind: string;
    corpus_role: SourceCorpusProfile["corpus_role"];
    role_label: string;
    declaration_root: HashRoot;
    observation_root: HashRoot;
    source_record_count: number;
    record_count: number;
    facet: {
      kind: SourceCorpusProfile["facet"]["kind"];
      key: string;
      label: string;
      multi_valued: boolean;
      records_with_value: number;
      missing_records: number;
      assignment_count: number;
      values: Array<{ value: string; record_count: number }>;
    };
  }>;
};

function assertCount(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative safe integer`);
  }
}

function normalizedScalar(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a nonempty source-authored string or null`);
  }
  return value.trim();
}

function normalizedArray(value: unknown, label: string): string[] {
  if (value === null || value === undefined) return [];
  const candidate = typeof value === "string" ? (() => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      throw new Error(`${label} must be a canonical JSON string array or null`);
    }
  })() : value;
  if (!Array.isArray(candidate)) throw new Error(`${label} must be a source-authored string array or null`);
  const normalized = candidate.map((entry, index) => normalizedScalar(entry, `${label}[${index}]`));
  if (normalized.some((entry) => entry === null)) {
    throw new Error(`${label} cannot contain null values`);
  }
  return [...new Set(normalized as string[])].sort((left, right) => left.localeCompare(right));
}

function summarizeFacet(
  profile: SourceCorpusProfile,
  values: unknown[],
): SourceCorpusMapRead["corpora"][number]["facet"] {
  if (values.length > MAX_SOURCE_CORPUS_RECORDS_PER_PROFILE) {
    throw new Error(`${profile.source_id}/${profile.native_kind} exceeds the reviewed ${MAX_SOURCE_CORPUS_RECORDS_PER_PROFILE}-record profile bound`);
  }
  const counts = new Map<string, number>();
  let recordsWithValue = 0;
  let assignmentCount = 0;
  for (const [index, value] of values.entries()) {
    const label = `${profile.source_id}/${profile.facet.key} record ${index}`;
    const scalar = profile.facet.kind === "metadata_scalar"
      ? normalizedScalar(value, label)
      : null;
    const entries = profile.facet.kind === "metadata_scalar"
      ? (scalar === null ? [] : [scalar])
      : normalizedArray(value, label);
    if (entries.length === 0) continue;
    recordsWithValue += 1;
    assignmentCount += entries.length;
    for (const entry of entries) {
      counts.set(entry, (counts.get(entry) ?? 0) + 1);
      if (counts.size > MAX_SOURCE_CORPUS_VALUES_PER_PROFILE) {
        throw new Error(`${profile.source_id}/${profile.facet.key} exceeds the reviewed ${MAX_SOURCE_CORPUS_VALUES_PER_PROFILE}-value bound`);
      }
    }
  }
  const missingRecords = values.length - recordsWithValue;
  const buckets = [...counts.entries()]
    .map(([value, record_count]) => ({ value, record_count }))
    .sort((left, right) => left.value.localeCompare(right.value));
  if (profile.facet.kind === "metadata_scalar") {
    const bucketTotal = buckets.reduce((sum, bucket) => sum + bucket.record_count, 0);
    if (bucketTotal + missingRecords !== values.length || assignmentCount !== recordsWithValue) {
      throw new Error(`${profile.source_id}/${profile.facet.key} scalar facet does not reconcile to its exact records`);
    }
  } else if (recordsWithValue + missingRecords !== values.length) {
    throw new Error(`${profile.source_id}/${profile.facet.key} multi-value facet does not reconcile to its exact records`);
  }
  return {
    kind: profile.facet.kind,
    key: profile.facet.key,
    label: profile.facet.label,
    multi_valued: profile.facet.kind === "metadata_string_array",
    records_with_value: recordsWithValue,
    missing_records: missingRecords,
    assignment_count: assignmentCount,
    values: buckets,
  };
}

/**
 * Summarizes one immutable release as source inventory plus explicitly profiled
 * source-authored facets. It never groups source records into Problems or
 * derives identity, equivalence, Verification, Decision, or Standing.
 */
export function summarizeSourceCorpusMap(
  input: SourceCorpusMapSummaryInput,
  config: SourceCorpusProfilesConfig = sourceCorpusProfilesConfig,
): SourceCorpusMapRead {
  assertSourceCorpusProfileBounds(config);
  if (input.sources.length > MAX_SOURCE_CORPUS_SOURCES) {
    throw new Error(`Source corpus map exceeds the reviewed ${MAX_SOURCE_CORPUS_SOURCES}-Source inventory bound`);
  }
  if (
    input.sources.length !== input.source_registry.source_count
    || input.sources.length !== input.source_registry.release_source_count
    || input.sources.length !== input.source_registry.observation_count
  ) {
    throw new Error("Source corpus inventory does not cover every declared, released, observed Source");
  }
  if (input.profiles.length !== config.profiles.length) {
    throw new Error(`Source corpus map requires exactly ${config.profiles.length} profiled reads`);
  }

  const sourcesById = new Map<string, SourceCorpusInventoryInput>();
  for (const source of input.sources) {
    if (sourcesById.has(source.source_id)) throw new Error(`Source corpus inventory repeats ${source.source_id}`);
    assertCount(source.native_record_count, `${source.source_id} native record count`);
    assertCount(source.repository_binding_count, `${source.source_id} Repository-binding count`);
    if (source.coverage_status === "unobserved" && source.native_record_count !== 0) {
      throw new Error(`Unobserved Source ${source.source_id} cannot carry source-native records`);
    }
    sourcesById.set(source.source_id, source);
  }
  const nativeRecordCount = input.sources.reduce((sum, source) => sum + source.native_record_count, 0);
  const repositoryBindingCount = input.sources.reduce((sum, source) => sum + source.repository_binding_count, 0);
  if (
    nativeRecordCount !== input.source_registry.native_record_count
    || repositoryBindingCount !== input.source_registry.repository_binding_count
  ) {
    throw new Error("Source corpus inventory counts do not reconcile to the exact release registry");
  }

  const profileInputs = new Map<string, SourceCorpusProfileInput>();
  for (const profileInput of input.profiles) {
    const identity = `${profileInput.source_id}\u0000${profileInput.native_kind}`;
    if (profileInputs.has(identity)) throw new Error(`Source corpus map repeats profiled read ${profileInput.source_id}/${profileInput.native_kind}`);
    profileInputs.set(identity, profileInput);
  }
  const totalProfileRecords = input.profiles.reduce((sum, profile) => sum + profile.facet_values.length, 0);
  if (totalProfileRecords > MAX_SOURCE_CORPUS_PROFILE_RECORDS) {
    throw new Error(`Source corpus map exceeds the reviewed ${MAX_SOURCE_CORPUS_PROFILE_RECORDS}-record total profile bound`);
  }

  const corpora = config.profiles.map((profile) => {
    const source = sourcesById.get(profile.source_id);
    if (!source) throw new Error(`Source corpus profile names unknown Source ${profile.source_id}`);
    const identity = `${profile.source_id}\u0000${profile.native_kind}`;
    const read = profileInputs.get(identity);
    if (!read) throw new Error(`Source corpus map is missing profiled read ${profile.source_id}/${profile.native_kind}`);
    if (read.facet_values.length > source.native_record_count) {
      throw new Error(`${profile.source_id}/${profile.native_kind} records exceed the Source inventory`);
    }
    return {
      source_id: profile.source_id,
      source_label: profile.source_label,
      source_kind: source.source_kind,
      native_kind: profile.native_kind,
      corpus_role: profile.corpus_role,
      role_label: profile.role_label,
      declaration_root: source.declaration_root,
      observation_root: source.observation_root,
      source_record_count: source.native_record_count,
      record_count: read.facet_values.length,
      facet: summarizeFacet(profile, read.facet_values),
    };
  });
  if ([...profileInputs].some(([identity]) => !config.profiles.some((profile) => `${profile.source_id}\u0000${profile.native_kind}` === identity))) {
    throw new Error("Source corpus map includes an unprofiled Source/native-kind read");
  }

  const sourceKinds = new Map<MathSourceDeclaration["source_kind"], { source_count: number; native_record_count: number }>();
  for (const source of input.sources) {
    const current = sourceKinds.get(source.source_kind) ?? { source_count: 0, native_record_count: 0 };
    sourceKinds.set(source.source_kind, {
      source_count: current.source_count + 1,
      native_record_count: current.native_record_count + source.native_record_count,
    });
  }

  return {
    schema: "vela.source-corpus-map-read.v1",
    release_root: input.release_root,
    profile_root: sha256(canonicalJson(config)),
    semantics: { ...config.semantics },
    coverage_complete: true,
    inventory: {
      source_count: input.source_registry.source_count,
      observation_count: input.source_registry.observation_count,
      observed_source_count: input.sources.filter(({ coverage_status }) => coverage_status !== "unobserved").length,
      unobserved_source_count: input.sources.filter(({ coverage_status }) => coverage_status === "unobserved").length,
      native_record_count: nativeRecordCount,
      repository_binding_count: repositoryBindingCount,
      source_kinds: [...sourceKinds.entries()]
        .map(([source_kind, counts]) => ({ source_kind, ...counts }))
        .sort((left, right) => left.source_kind.localeCompare(right.source_kind)),
      sources: input.sources.map((source) => ({ ...source })),
    },
    corpora,
  };
}
