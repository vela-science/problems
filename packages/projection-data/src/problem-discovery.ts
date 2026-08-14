import { z } from "zod";
import discoveryJson from "../config/problem-discovery.v1.json";
import { canonicalJson, sha256, type HashRoot } from "./canonical";

const keySchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const labelSchema = z.object({ key: keySchema, name: z.string().min(1) }).strict();

const problemDiscoveryProfileSchema = z.object({
  source_id: z.string().regex(/^source:[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  native_kind: z.string().min(1),
  area: labelSchema,
  collection: labelSchema,
  hubs: z.array(labelSchema),
  field: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("none") }).strict(),
    z.object({ kind: z.literal("metadata_scalar"), key: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/u) }).strict(),
  ]),
  topics: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("none") }).strict(),
    z.object({ kind: z.literal("metadata_string_array"), key: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/u) }).strict(),
  ]),
}).strict();

export const problemDiscoveryConfigSchema = z.object({
  schema: z.literal("vela.problem-discovery.v1"),
  semantics: z.object({
    authority_effect: z.literal("none"),
    classification_basis: z.literal("explicit_source_profile"),
    unprofiled_sources: z.literal("unclassified"),
    topic_order: z.literal("unordered"),
  }).strict(),
  profiles: z.array(problemDiscoveryProfileSchema).min(1),
}).strict().superRefine((value, context) => {
  const identities = new Set<string>();
  const labels = new Map<string, string>();
  const hubs = new Map<string, { name: string; area: string }>();
  for (const [index, profile] of value.profiles.entries()) {
    const identity = `${profile.source_id}\u0000${profile.native_kind}`;
    if (identities.has(identity)) {
      context.addIssue({ code: "custom", path: ["profiles", index], message: "source discovery identities must be unique" });
    }
    identities.add(identity);
    for (const [kind, label] of [["area", profile.area], ["collection", profile.collection]] as const) {
      const identityKey = `${kind}\u0000${label.key}`;
      const existing = labels.get(identityKey);
      if (existing && existing !== label.name) {
        context.addIssue({ code: "custom", path: ["profiles", index, kind], message: `${kind} keys must have one label` });
      }
      labels.set(identityKey, label.name);
    }
    for (const [hubIndex, hub] of profile.hubs.entries()) {
      const existing = hubs.get(hub.key);
      if (existing && (existing.name !== hub.name || existing.area !== profile.area.key)) {
        context.addIssue({ code: "custom", path: ["profiles", index, "hubs", hubIndex], message: "Hub keys must have one label and one scientific area" });
      }
      hubs.set(hub.key, { name: hub.name, area: profile.area.key });
    }
  }
});

export type ProblemDiscoveryConfig = z.infer<typeof problemDiscoveryConfigSchema>;
export type ProblemDiscoveryClassification = {
  classification: "profiled" | "unclassified";
  area: { key: string; name: string } | null;
  collection: { key: string; name: string } | null;
  field: { key: string; name: string } | null;
  topics: Array<{ key: string; name: string }>;
  hubs: Array<{ key: string; name: string }>;
  authority_effect: "none";
};

export function parseProblemDiscoveryConfig(input: unknown): ProblemDiscoveryConfig {
  return problemDiscoveryConfigSchema.parse(input);
}

export const problemDiscoveryConfig = parseProblemDiscoveryConfig(discoveryJson);
export const problemDiscoveryConfigRoot: HashRoot = sha256(canonicalJson(problemDiscoveryConfig));

function humanize(value: string): string {
  return value.replaceAll(/[-_]/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function metadataScalar(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim()
    : typeof value === "number" || typeof value === "boolean" ? String(value)
    : null;
}

function metadataStringArray(metadata: Record<string, unknown>, key: string): string[] {
  const value = metadata[key];
  const candidate = typeof value === "string" ? (() => {
    try { return JSON.parse(value); } catch { return null; }
  })() : value;
  if (!Array.isArray(candidate) || candidate.some((entry) => typeof entry !== "string")) return [];
  return [...new Set(candidate.map((entry) => entry.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

/**
 * Applies only explicit source-owned discovery semantics. Unknown Source/kind
 * pairs stay visibly unclassified; Repository slugs never become Areas,
 * Collections, Fields or Hubs by inference.
 */
export function classifyProblemDiscovery(
  input: { source_id: string; native_kind: string; metadata?: Record<string, unknown> },
  config: ProblemDiscoveryConfig = problemDiscoveryConfig,
): ProblemDiscoveryClassification {
  const matches = config.profiles.filter((profile) => (
    profile.source_id === input.source_id && profile.native_kind === input.native_kind
  ));
  if (matches.length > 1) throw new Error(`Problem discovery identity ${input.source_id}/${input.native_kind} is ambiguous`);
  const profile = matches[0];
  if (!profile) {
    return { classification: "unclassified", area: null, collection: null, field: null, topics: [], hubs: [], authority_effect: "none" };
  }
  const metadata = input.metadata ?? {};
  const fieldValue = profile.field.kind === "metadata_scalar"
    ? metadataScalar(metadata, profile.field.key)
    : null;
  const topicValues = profile.topics.kind === "metadata_string_array"
    ? metadataStringArray(metadata, profile.topics.key)
    : [];
  return {
    classification: "profiled",
    area: { ...profile.area },
    collection: { ...profile.collection },
    field: fieldValue ? { key: fieldValue.toLocaleLowerCase().replaceAll(/[^a-z0-9]+/gu, "-").replaceAll(/^-|-$/gu, ""), name: fieldValue } : null,
    topics: topicValues.map((key) => ({ key, name: humanize(key) })),
    hubs: profile.hubs.map((hub) => ({ ...hub })),
    authority_effect: "none",
  };
}
