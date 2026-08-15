import { z } from "zod";
import resolutionJson from "../config/problem-resolution.v1.json";
import { canonicalJson, sha256, type HashRoot } from "./canonical";
import type { NativeSourceRecord } from "./math-sources";

const sourceIdSchema = z.string().regex(/^source:[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const resolutionNamespaceSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const hashRootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u) as z.ZodType<HashRoot>;
const occurrenceIdentitySchema = z.object({
  source_id: sourceIdSchema,
  native_id: z.string().min(1),
  native_kind: z.string().min(1),
  content_root: hashRootSchema,
}).strict();
const relationKindSchema = z.enum([
  "formal_statement_reference",
  "proof_manifest_reference",
  "attributed_activity_reference",
  "attributed_classification_reference",
]);

const candidateSourceSchema = z.object({
  source_id: sourceIdSchema,
  resolution_namespace: resolutionNamespaceSchema,
  label: z.string().min(1),
  source_role: z.enum([
    "problem_catalog",
    "formal_statement_library",
    "proof_manifest",
    "attributed_activity_catalog",
    "attributed_classification_catalog",
  ]),
  native_kinds: z.array(z.string().min(1)).min(1),
  number_extraction: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("metadata_integer"), key: z.literal("problem_number") }).strict(),
    z.object({ kind: z.literal("erdos_formal_native_id") }).strict(),
  ]),
  statement_retention: z.enum(["summary", "locator_only", "none"]),
}).strict();

const reviewedOccurrenceSchema = occurrenceIdentitySchema.extend({ relation_kind: relationKindSchema }).strict();
const entitySchema = z.object({
  entity_id: z.string().regex(/^problem:[a-z0-9]+(?::[a-z0-9]+)+$/u),
  resolution_namespace: resolutionNamespaceSchema,
  label: z.string().min(1),
  problem_number: z.number().int().positive(),
  canonical_occurrence: occurrenceIdentitySchema,
  reviewed_occurrences: z.array(reviewedOccurrenceSchema).min(1),
}).strict();

export const problemResolutionConfigSchema = z.object({
  schema: z.literal("vela.problem-resolution.v1"),
  semantics: z.object({
    authority_effect: z.literal("none"),
    entity_effect: z.literal("navigation_group_only"),
    candidate_effect: z.literal("shared_namespace_and_source_number_only"),
    statement_identity: z.literal("not_established"),
    equivalence: z.literal("not_established"),
  }).strict(),
  candidate_sources: z.array(candidateSourceSchema).min(1),
  entities: z.array(entitySchema).min(1),
}).strict().superRefine((value, context) => {
  const sources = new Map<string, z.infer<typeof candidateSourceSchema>>();
  for (const [index, source] of value.candidate_sources.entries()) {
    if (sources.has(source.source_id)) {
      context.addIssue({ code: "custom", path: ["candidate_sources", index, "source_id"], message: "candidate Source IDs must be unique" });
    }
    if (new Set(source.native_kinds).size !== source.native_kinds.length) {
      context.addIssue({ code: "custom", path: ["candidate_sources", index, "native_kinds"], message: "candidate native kinds must be unique" });
    }
    sources.set(source.source_id, source);
  }

  const entityIds = new Set<string>();
  const canonicalKeys = new Set<string>();
  const reviewedKeys = new Set<string>();
  const resolutionKeys = new Set<string>();
  const expectedRelation = new Map([
    ["formal_statement_library", "formal_statement_reference"],
    ["proof_manifest", "proof_manifest_reference"],
    ["attributed_activity_catalog", "attributed_activity_reference"],
    ["attributed_classification_catalog", "attributed_classification_reference"],
  ]);
  for (const [entityIndex, entity] of value.entities.entries()) {
    const resolutionKey = problemResolutionKey(entity.resolution_namespace, entity.problem_number);
    if (entityIds.has(entity.entity_id) || resolutionKeys.has(resolutionKey)) {
      context.addIssue({ code: "custom", path: ["entities", entityIndex], message: "resolver entity IDs and namespace/number pairs must be unique" });
    }
    entityIds.add(entity.entity_id);
    resolutionKeys.add(resolutionKey);
    const canonicalKey = occurrenceKey(entity.canonical_occurrence);
    if (canonicalKeys.has(canonicalKey) || reviewedKeys.has(canonicalKey)) {
      context.addIssue({ code: "custom", path: ["entities", entityIndex, "canonical_occurrence"], message: "canonical occurrences must be globally unique" });
    }
    canonicalKeys.add(canonicalKey);
    const canonicalSource = sources.get(entity.canonical_occurrence.source_id);
    if (!canonicalSource || !canonicalSource.native_kinds.includes(entity.canonical_occurrence.native_kind)) {
      context.addIssue({ code: "custom", path: ["entities", entityIndex, "canonical_occurrence"], message: "canonical occurrence must match one candidate Source profile" });
    } else if (canonicalSource.resolution_namespace !== entity.resolution_namespace) {
      context.addIssue({ code: "custom", path: ["entities", entityIndex, "canonical_occurrence"], message: "canonical occurrence Source must share the entity resolution namespace" });
    }
    for (const [occurrenceIndex, occurrence] of entity.reviewed_occurrences.entries()) {
      const key = occurrenceKey(occurrence);
      if (reviewedKeys.has(key) || canonicalKeys.has(key)) {
        context.addIssue({ code: "custom", path: ["entities", entityIndex, "reviewed_occurrences", occurrenceIndex], message: "reviewed occurrences must be globally unique" });
      }
      reviewedKeys.add(key);
      const source = sources.get(occurrence.source_id);
      if (!source || !source.native_kinds.includes(occurrence.native_kind)) {
        context.addIssue({ code: "custom", path: ["entities", entityIndex, "reviewed_occurrences", occurrenceIndex], message: "reviewed occurrence must match one candidate Source profile" });
      } else if (source.resolution_namespace !== entity.resolution_namespace) {
        context.addIssue({ code: "custom", path: ["entities", entityIndex, "reviewed_occurrences", occurrenceIndex], message: "reviewed occurrence Source must share the entity resolution namespace" });
      } else if (expectedRelation.get(source.source_role) !== occurrence.relation_kind) {
        context.addIssue({ code: "custom", path: ["entities", entityIndex, "reviewed_occurrences", occurrenceIndex, "relation_kind"], message: "reviewed relation must match the Source role" });
      }
    }
  }
});

export type ProblemResolutionConfig = z.infer<typeof problemResolutionConfigSchema>;
export type ProblemResolutionEntity = ProblemResolutionConfig["entities"][number];
export type ProblemResolutionCandidateSource = ProblemResolutionConfig["candidate_sources"][number];
export type ProblemRelationKind = z.infer<typeof relationKindSchema>;

export function parseProblemResolutionConfig(input: unknown): ProblemResolutionConfig {
  return problemResolutionConfigSchema.parse(input);
}

export const problemResolutionConfig = parseProblemResolutionConfig(resolutionJson);
export const problemResolutionConfigRoot: HashRoot = sha256(canonicalJson(problemResolutionConfig));

/* The root of one reviewed entity, which is what a Claim's occurrence packet
 * pins.
 *
 * The packet used to pin `problemResolutionConfigRoot`, the root of the whole
 * file. That made every entity a hash preimage of every other: adding a
 * reviewed grouping for one Problem changed the root, and every previously
 * signed packet stopped validating — including one whose Claim quotes the root
 * in its assertion text, so the coupling reached into signed bytes. A pin is
 * meant to say "these are the occurrences I reviewed"; the file's root says
 * "nobody has reviewed anything since", which is a different and much stronger
 * claim than any reviewer made.
 *
 * The entity root says only what the reviewer saw. Adding a grouping for
 * another Problem now leaves existing bindings exactly as valid as they were. */
export function problemResolutionEntityRoot(entity: ProblemResolutionEntity): HashRoot {
  return sha256(canonicalJson(entity));
}

export function occurrenceKey(input: { source_id: string; native_id: string; native_kind: string }): string {
  return `${input.source_id}\u0000${input.native_kind}\u0000${input.native_id}`;
}

export function problemResolutionKey(resolutionNamespace: string, problemNumber: number): string {
  return `${resolutionNamespace}\u0000${problemNumber}`;
}

function metadataInteger(record: NativeSourceRecord, key: string): number | null {
  const value = record.metadata[key];
  const integer = typeof value === "number" ? value
    : typeof value === "string" && /^[1-9][0-9]*$/u.test(value) ? Number(value)
    : Number.NaN;
  return Number.isSafeInteger(integer) && integer > 0 ? integer : null;
}

export type ProblemResolutionIdentity = {
  resolution_namespace: string;
  problem_number: number;
};

export function candidateProblemIdentity(
  record: NativeSourceRecord,
  config: ProblemResolutionConfig = problemResolutionConfig,
): ProblemResolutionIdentity | null {
  const source = config.candidate_sources.find(({ source_id }) => source_id === record.source_id);
  if (!source || !source.native_kinds.includes(record.native_kind)) return null;
  let problemNumber: number | null;
  if (source.number_extraction.kind === "metadata_integer") {
    problemNumber = metadataInteger(record, source.number_extraction.key);
  } else {
    const match = /^Erdos([1-9][0-9]*)(?:\.|$)/u.exec(record.native_id);
    problemNumber = match ? Number(match[1]) : null;
  }
  return problemNumber === null ? null : {
    resolution_namespace: source.resolution_namespace,
    problem_number: problemNumber,
  };
}

export function problemResolutionSourcesForNamespace(
  resolutionNamespace: string,
  config: ProblemResolutionConfig = problemResolutionConfig,
): ProblemResolutionCandidateSource[] {
  return config.candidate_sources.filter(({ resolution_namespace }) => resolution_namespace === resolutionNamespace);
}

export function problemResolutionEntityForCanonical(
  canonical: Pick<NativeSourceRecord, "source_id" | "native_id" | "native_kind">,
  config: ProblemResolutionConfig = problemResolutionConfig,
): ProblemResolutionEntity | null {
  const key = occurrenceKey(canonical);
  const matches = config.entities.filter((entity) => (
    occurrenceKey(entity.canonical_occurrence) === key
    || entity.reviewed_occurrences.some((occurrence) => occurrenceKey(occurrence) === key)
  ));
  if (matches.length > 1) throw new Error(`occurrence ${canonical.source_id}/${canonical.native_id} resolves to multiple entities`);
  return matches[0] ?? null;
}

export type ReviewedProblemBindingOccurrence = {
  source_id: string;
  native_id: string;
  native_kind: string;
  content_root: HashRoot;
  relation_kind: ProblemRelationKind | null;
};

/**
 * Returns the exact source occurrences through which a Repository object may
 * reach one canonical Problem occurrence. The canonical occurrence is always
 * included. Cross-source occurrences are included only when the reviewed,
 * rooted resolver names them; a shared number is never enough.
 */
export function reviewedProblemBindingOccurrences(
  canonical: Pick<NativeSourceRecord, "source_id" | "native_id" | "native_kind" | "content_root">,
  config: ProblemResolutionConfig = problemResolutionConfig,
): ReviewedProblemBindingOccurrence[] {
  if (canonical.content_root === null) {
    throw new Error(`canonical occurrence ${canonical.source_id}/${canonical.native_id} has no exact content root`);
  }
  const entity = problemResolutionEntityForCanonical(canonical, config);
  if (!entity) {
    return [{
      source_id: canonical.source_id,
      native_id: canonical.native_id,
      native_kind: canonical.native_kind,
      content_root: canonical.content_root as HashRoot,
      relation_kind: null,
    }];
  }
  if (
    occurrenceKey(entity.canonical_occurrence) !== occurrenceKey(canonical)
    || entity.canonical_occurrence.content_root !== canonical.content_root
  ) {
    throw new Error(`canonical occurrence ${canonical.source_id}/${canonical.native_id} drifted from reviewed resolver bytes`);
  }
  return [
    {
      ...entity.canonical_occurrence,
      content_root: entity.canonical_occurrence.content_root as HashRoot,
      relation_kind: null,
    },
    ...entity.reviewed_occurrences.map((occurrence) => ({
      ...occurrence,
      content_root: occurrence.content_root as HashRoot,
    })),
  ];
}

export type ProblemSourceOccurrence = {
  occurrence_key: string;
  source_id: string;
  source_label: string;
  source_role: ProblemResolutionCandidateSource["source_role"];
  native_id: string;
  native_kind: string;
  title: string;
  summary: string | null;
  locators: NativeSourceRecord["locators"];
  row_root: NativeSourceRecord["row_root"];
  occurrence_status: "canonical_anchor" | "reviewed_reference" | "candidate_number_link";
  relation_kind: ProblemRelationKind | null;
  statement_identity: "not_established";
  authority_effect: "none";
};

export type ProblemSourceStatement = {
  statement_id: string;
  occurrence_key: string;
  source_id: string;
  text: string;
  locator_url: string | null;
  row_root: NativeSourceRecord["row_root"];
  statement_identity: "not_established";
  authority_effect: "none";
};

export type ProblemSourceRelation = {
  relation_id: string;
  entity_id: string;
  occurrence_key: string;
  kind: ProblemRelationKind;
  statement_identity: "not_established";
  equivalence: "not_established";
  authority_effect: "none";
};

export type ProblemSourceResolution = {
  resolver_root: HashRoot;
  resolution_namespace: string;
  semantics: ProblemResolutionConfig["semantics"];
  entity: null | {
    entity_id: string;
    resolution_namespace: string;
    label: string;
    problem_number: number;
    canonical_occurrence: ProblemResolutionEntity["canonical_occurrence"];
    authority_effect: "none";
    identity_claim: "navigation_group_only";
  };
  occurrences: ProblemSourceOccurrence[];
  statements: ProblemSourceStatement[];
  relations: ProblemSourceRelation[];
  identity_events: Array<{
    kind: "reviewed_resolver_config";
    resolver_root: HashRoot;
    reviewed_occurrence_count: number;
    identity_claim: "navigation_group_only";
    authority_effect: "none";
  }>;
};

/**
 * Resolves a bounded set of exact current Source occurrences. A shared number
 * within one configured resolution namespace creates only a candidate
 * navigation link. Relations exist only for
 * exact identities frozen in the reviewed config, and none asserts statement
 * identity, equivalence, Verification, Decision, or Standing.
 */
export function resolveProblemSources(
  canonical: NativeSourceRecord,
  records: NativeSourceRecord[],
  config: ProblemResolutionConfig = problemResolutionConfig,
): ProblemSourceResolution {
  const resolverRoot = sha256(canonicalJson(config));
  const entity = problemResolutionEntityForCanonical(canonical, config);
  const identity = candidateProblemIdentity(canonical, config);
  if (identity === null) throw new Error(`canonical occurrence ${canonical.source_id}/${canonical.native_id} has no configured problem identity`);
  const number = identity.problem_number;
  if (entity && problemResolutionKey(entity.resolution_namespace, entity.problem_number) !== problemResolutionKey(identity.resolution_namespace, number)) {
    throw new Error(`canonical occurrence ${canonical.source_id}/${canonical.native_id} conflicts with its reviewed namespace/number identity`);
  }

  const recordsByKey = new Map<string, NativeSourceRecord>();
  for (const record of records) {
    const source = config.candidate_sources.find(({ source_id }) => source_id === record.source_id);
    if (!source || !source.native_kinds.includes(record.native_kind)) {
      throw new Error(`Problem source record ${record.source_id}/${record.native_id} has no configured candidate Source profile`);
    }
    const recordIdentity = candidateProblemIdentity(record, config);
    if (!recordIdentity || problemResolutionKey(recordIdentity.resolution_namespace, recordIdentity.problem_number) !== problemResolutionKey(identity.resolution_namespace, number)) {
      throw new Error(`Problem source record ${record.source_id}/${record.native_id} conflicts with resolution identity ${identity.resolution_namespace}/${number}`);
    }
    const key = occurrenceKey(record);
    if (recordsByKey.has(key)) throw new Error(`Problem source set contains duplicate occurrence ${record.source_id}/${record.native_id}`);
    recordsByKey.set(key, record);
  }
  const canonicalKey = occurrenceKey(canonical);
  const exactCanonical = recordsByKey.get(canonicalKey);
  if (!exactCanonical || exactCanonical.row_root !== canonical.row_root) {
    throw new Error(`Problem source set is missing the exact canonical occurrence ${canonical.source_id}/${canonical.native_id}`);
  }

  const reviewed = new Map<string, ProblemRelationKind>();
  if (entity) {
    const configuredCanonical = recordsByKey.get(occurrenceKey(entity.canonical_occurrence));
    if (!configuredCanonical) throw new Error(`Problem source set is missing reviewed occurrence ${entity.canonical_occurrence.source_id}/${entity.canonical_occurrence.native_id}`);
    if (configuredCanonical.content_root !== entity.canonical_occurrence.content_root) {
      throw new Error(`Problem source reviewed occurrence ${entity.canonical_occurrence.source_id}/${entity.canonical_occurrence.native_id} content root drifted`);
    }
    for (const occurrence of entity.reviewed_occurrences) {
      const key = occurrenceKey(occurrence);
      const record = recordsByKey.get(key);
      if (!record) throw new Error(`Problem source set is missing reviewed occurrence ${occurrence.source_id}/${occurrence.native_id}`);
      if (record.content_root !== occurrence.content_root) {
        throw new Error(`Problem source reviewed occurrence ${occurrence.source_id}/${occurrence.native_id} content root drifted`);
      }
      reviewed.set(key, occurrence.relation_kind);
    }
  }

  const occurrences = [...recordsByKey.values()].sort((left, right) => (
    left.source_id.localeCompare(right.source_id)
    || left.native_kind.localeCompare(right.native_kind)
    || left.native_id.localeCompare(right.native_id)
  )).map((record): ProblemSourceOccurrence => {
    const profile = config.candidate_sources.find(({ source_id }) => source_id === record.source_id)!;
    const key = occurrenceKey(record);
    const relationKind = reviewed.get(key) ?? null;
    return {
      occurrence_key: key,
      source_id: record.source_id,
      source_label: profile.label,
      source_role: profile.source_role,
      native_id: record.native_id,
      native_kind: record.native_kind,
      title: record.title,
      summary: record.summary,
      locators: record.locators.map((locator) => ({ ...locator })),
      row_root: record.row_root,
      occurrence_status: key === canonicalKey
        ? "canonical_anchor"
        : entity && (key === occurrenceKey(entity.canonical_occurrence) || relationKind)
          ? "reviewed_reference"
          : "candidate_number_link",
      relation_kind: relationKind,
      statement_identity: "not_established",
      authority_effect: "none",
    };
  });
  const statements = occurrences.flatMap((occurrence): ProblemSourceStatement[] => {
    const source = config.candidate_sources.find(({ source_id }) => source_id === occurrence.source_id)!;
    if (source.statement_retention !== "summary" || !occurrence.summary?.trim()) return [];
    const body = {
      occurrence_key: occurrence.occurrence_key,
      row_root: occurrence.row_root,
      text: occurrence.summary,
      statement_identity: "not_established" as const,
      authority_effect: "none" as const,
    };
    return [{
      statement_id: sha256(canonicalJson(body)),
      occurrence_key: occurrence.occurrence_key,
      source_id: occurrence.source_id,
      text: occurrence.summary,
      locator_url: occurrence.locators.find(({ url }) => url)?.url ?? null,
      row_root: occurrence.row_root,
      statement_identity: body.statement_identity,
      authority_effect: body.authority_effect,
    }];
  });
  const relations = entity ? occurrences.flatMap((occurrence): ProblemSourceRelation[] => occurrence.relation_kind ? [{
    relation_id: sha256(canonicalJson({ entity_id: entity.entity_id, occurrence_key: occurrence.occurrence_key, kind: occurrence.relation_kind })),
    entity_id: entity.entity_id,
    occurrence_key: occurrence.occurrence_key,
    kind: occurrence.relation_kind,
    statement_identity: "not_established",
    equivalence: "not_established",
    authority_effect: "none",
  }] : []) : [];
  return {
    resolver_root: resolverRoot,
    resolution_namespace: identity.resolution_namespace,
    semantics: { ...config.semantics },
    entity: entity ? {
      entity_id: entity.entity_id,
      resolution_namespace: entity.resolution_namespace,
      label: entity.label,
      problem_number: entity.problem_number,
      canonical_occurrence: { ...entity.canonical_occurrence },
      authority_effect: "none",
      identity_claim: "navigation_group_only",
    } : null,
    occurrences,
    statements,
    relations,
    identity_events: entity ? [{
      kind: "reviewed_resolver_config",
      resolver_root: resolverRoot,
      reviewed_occurrence_count: entity.reviewed_occurrences.length + 1,
      identity_claim: "navigation_group_only",
      authority_effect: "none",
    }] : [],
  };
}
