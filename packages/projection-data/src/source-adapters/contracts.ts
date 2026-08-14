import { z } from "zod";
import { canonicalJson, sha256, type HashRoot } from "../canonical";

const hashRootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);
const sourceIdSchema = z.string().regex(/^source:[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const semanticVersionSchema = z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/u);
const gitCommitSchema = z.string().regex(/^[0-9a-f]{40}$/u);

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(z.string(), jsonValueSchema),
]));

export const sourceAdapterIdentitySchema = z.object({
  adapter_id: z.string().regex(/^[a-z][a-z0-9]*(?:[./-][a-z0-9]+)*$/u),
  version: semanticVersionSchema,
  contract: z.literal("vela.source-adapter.v1"),
  adapter_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  const { adapter_root: _root, ...body } = value;
  if (value.adapter_root !== sha256(canonicalJson(body))) {
    context.addIssue({
      code: "custom",
      path: ["adapter_root"],
      message: "adapter root does not match its canonical identity",
    });
  }
});

export type SourceAdapterIdentity = z.infer<typeof sourceAdapterIdentitySchema>;

export function createSourceAdapterIdentity(
  adapterId: string,
  version: string,
): SourceAdapterIdentity {
  const body = {
    adapter_id: adapterId,
    version,
    contract: "vela.source-adapter.v1" as const,
  };
  return sourceAdapterIdentitySchema.parse({
    ...body,
    adapter_root: sha256(canonicalJson(body)),
  });
}

export const sourceNativeRecordBodySchema = z.object({
  schema: z.literal("vela.source-native-record.v1"),
  source_id: sourceIdSchema,
  native_id: z.string().min(1),
  native_kind: z.string().min(1),
  native_revision: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1).nullable(),
  source_path: z.string().min(1).nullable(),
  locators: z.array(z.string().url()),
  metadata: z.record(z.string(), jsonValueSchema),
  content_root: hashRootSchema,
}).strict();

export const sourceNativeRecordSchema = sourceNativeRecordBodySchema.extend({
  record_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  const { record_root: _root, ...body } = value;
  if (value.record_root !== sha256(canonicalJson(body))) {
    context.addIssue({
      code: "custom",
      path: ["record_root"],
      message: "source-native record root does not match its canonical bytes",
    });
  }
});

export type SourceNativeRecordInput = z.input<typeof sourceNativeRecordBodySchema>;
export type SourceNativeRecord = z.infer<typeof sourceNativeRecordSchema>;

export function createSourceNativeRecord(
  input: SourceNativeRecordInput,
): SourceNativeRecord {
  const body = sourceNativeRecordBodySchema.parse(input);
  return sourceNativeRecordSchema.parse({
    ...body,
    record_root: sha256(canonicalJson(body)),
  });
}

export const sourceAdapterInputSchema = z.object({
  input_id: z.string().regex(/^[a-z][a-z0-9]*(?:[-_.][a-z0-9]+)*$/u),
  role: z.enum(["repository", "published_dataset", "retained_snapshot"]),
  locator: z.string().min(1),
  media_type: z.string().min(1),
  byte_length: z.number().int().nonnegative(),
  content_root: hashRootSchema,
}).strict();

export const sourceAdapterRevisionSchema = z.object({
  kind: z.enum(["git", "snapshot"]),
  value: z.string().min(1),
  git_commit: gitCommitSchema.nullable(),
  git_tree: gitCommitSchema.nullable(),
  content_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  const hasGitIdentity = value.git_commit !== null && value.git_tree !== null;
  if ((value.kind === "git") !== hasGitIdentity) {
    context.addIssue({
      code: "custom",
      path: ["kind"],
      message: "Git revisions require an exact commit and tree; snapshots cannot claim them",
    });
  }
});

export const sourceAdapterCoverageSchema = z.object({
  status: z.enum(["complete", "partial"]),
  scope: z.string().min(1),
  native_record_count: z.number().int().nonnegative(),
  emitted_record_count: z.number().int().nonnegative(),
  omitted_record_count: z.number().int().nonnegative(),
}).strict().superRefine((value, context) => {
  if (
    value.native_record_count
    !== value.emitted_record_count + value.omitted_record_count
  ) {
    context.addIssue({
      code: "custom",
      path: ["native_record_count"],
      message: "coverage counts do not reconcile",
    });
  }
  if (value.status === "complete" && value.omitted_record_count !== 0) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "complete coverage cannot omit native records",
    });
  }
});

export const sourceAdapterDisclosureSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]*$/u),
  description: z.string().min(1),
}).strict();

export const sourceAdapterChunkSchema = z.object({
  path: z.string().regex(/^chunks\/[0-9]{6}\.ndjson$/u),
  record_count: z.number().int().positive(),
  byte_length: z.number().int().positive(),
  content_root: hashRootSchema,
  first_native_id: z.string().min(1),
  last_native_id: z.string().min(1),
}).strict();

const sourceAdapterBundleBodySchema = z.object({
  schema: z.literal("vela.source-adapter-bundle.v2"),
  source_id: sourceIdSchema,
  declaration_root: hashRootSchema,
  acquisition_mode: z.enum([
    "networked_acquisition",
    "exact_git_checkout",
    "retained_snapshot",
  ]),
  adapter: sourceAdapterIdentitySchema,
  revision: sourceAdapterRevisionSchema,
  inputs: z.array(sourceAdapterInputSchema).min(1),
  output: z.object({
    format: z.literal("application/x-ndjson; schema=vela.source-native-record.v1"),
    chunk_record_limit: z.number().int().positive(),
    record_count: z.number().int().nonnegative(),
    records_root: hashRootSchema,
    chunks_root: hashRootSchema,
    chunks: z.array(sourceAdapterChunkSchema),
  }).strict(),
  coverage: sourceAdapterCoverageSchema,
  omissions: z.array(sourceAdapterDisclosureSchema),
  loss: z.array(sourceAdapterDisclosureSchema),
}).strict();

export const sourceAdapterBundleSchema = sourceAdapterBundleBodySchema.extend({
  bundle_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  if (value.output.record_count !== value.coverage.emitted_record_count) {
    context.addIssue({
      code: "custom",
      path: ["output", "record_count"],
      message: "output and coverage record counts disagree",
    });
  }
  const expectedChunksRoot = sha256(canonicalJson(value.output.chunks));
  if (value.output.chunks_root !== expectedChunksRoot) {
    context.addIssue({
      code: "custom",
      path: ["output", "chunks_root"],
      message: "chunk descriptor root does not match",
    });
  }
  const { bundle_root: _root, ...body } = value;
  if (value.bundle_root !== sha256(canonicalJson(body))) {
    context.addIssue({
      code: "custom",
      path: ["bundle_root"],
      message: "source-adapter bundle root does not match its canonical bytes",
    });
  }
});

export type SourceAdapterInput = z.infer<typeof sourceAdapterInputSchema>;
export type SourceAdapterRevision = z.infer<typeof sourceAdapterRevisionSchema>;
export type SourceAdapterCoverage = z.infer<typeof sourceAdapterCoverageSchema>;
export type SourceAdapterDisclosure = z.infer<typeof sourceAdapterDisclosureSchema>;
export type SourceAdapterChunk = z.infer<typeof sourceAdapterChunkSchema>;
export type SourceAdapterBundle = z.infer<typeof sourceAdapterBundleSchema>;

export function createSourceAdapterBundle(
  input: z.input<typeof sourceAdapterBundleBodySchema>,
): SourceAdapterBundle {
  const body = sourceAdapterBundleBodySchema.parse(input);
  return sourceAdapterBundleSchema.parse({
    ...body,
    bundle_root: sha256(canonicalJson(body)),
  });
}

export function sourceNativeRecordsRoot(
  records: ReadonlyArray<SourceNativeRecord>,
): HashRoot {
  return sha256(canonicalJson(records.map(({ record_root }) => record_root)));
}
