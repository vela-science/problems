import { z } from "zod";
import mathSourceRegistryInput from "../config/math-sources.v1";
import { canonicalJson, sha256, type HashRoot } from "./canonical";
import { repositorySlugs, repositoryIdSchema } from "./registry";
import {
  projectionSourceAdapterArtifactReferenceSchema,
  type ProjectionSourceAdapterArtifactReference,
} from "./source-adapters/reference";

/* Typed as the root it validates, matching `index.ts`. Left as a bare
   `z.string()`, every root read off a native record came back as `string`, so
   a value this module had already validated could not be handed to anything
   that asks for a root without a cast. */
const hashRootSchema = z.templateLiteral(["sha256:", z.string().regex(/^[0-9a-f]{64}$/u)]);
const sourceIdSchema = z.string().regex(/^source:[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const repositorySlugSchema = z.enum(repositorySlugs);
/* A binding names the repository the protocol names, not the handle a URL
   carries. `coverage.repository_slugs` above stays a list of handles: it declares
   which routes a Source covers, which is a presentation question. */
const locatorIdSchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u);
const semanticVersionSchema = z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/u);
const observationIdSchema = z.string().regex(/^observation:[a-z0-9]+(?:[-:.][a-z0-9]+)*$/u);
const bindingIdSchema = z.string().regex(/^binding:[a-z0-9]+(?:[-:.][a-z0-9]+)*$/u);

const locatorSchema = z.object({
  locator_id: locatorIdSchema,
  kind: z.enum(["homepage", "git", "api", "artifact", "documentation"]),
  url: z.string().url(),
}).strict();

const attributedClaimSchema = z.object({
  role: z.enum(["publisher", "maintainer"]),
  name: z.string().min(1),
  basis_locator_id: locatorIdSchema,
}).strict();

const rightsSchema = z.object({
  status: z.enum(["declared", "not_established", "repository_local"]),
  license_expression: z.string().min(1).nullable(),
  access: z.enum(["public", "local"]),
  redistribution: z.enum([
    "full_under_license",
    "reference_only",
    "existing_repository_only",
  ]),
  basis: z.string().min(1),
}).strict();

const snapshotPolicySchema = z.object({
  mode: z.enum([
    "reference_only",
    "content_root_only",
    "retained_exact_bytes",
    "existing_repository_bytes",
  ]),
  retention: z.enum(["none", "repository_git", "immutable_artifact"]),
  reason: z.string().min(1),
}).strict();

const adapterInputSchema = z.object({
  adapter_id: z.string().regex(/^[a-z][a-z0-9]*(?:[./-][a-z0-9]+)*$/u),
  version: semanticVersionSchema,
  mode: z.enum([
    "networked_acquisition",
    "exact_git_checkout",
    "retained_snapshot",
    "repository_local",
  ]),
  acquisition_contract: z.literal("vela.source-adapter-bundle.v2"),
  observation_contract: z.literal("vela.math-source-observation.v1"),
}).strict();

const adapterSchema = adapterInputSchema.extend({
  adapter_root: hashRootSchema,
}).strict();

const omissionSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]*$/u),
  description: z.string().min(1),
}).strict();

const coverageDeclarationSchema = z.object({
  repository_slugs: z.array(repositorySlugSchema).min(1),
  included: z.array(z.string().min(1)).min(1),
  omissions: z.array(omissionSchema),
}).strict();

const mathSourceDeclarationInputSchema = z.object({
  source_id: sourceIdSchema,
  native_namespace: z.string().min(1),
  publisher_or_maintainer: z.string().min(1),
  locators: z.array(locatorSchema).min(1),
  attributed_claims: z.array(attributedClaimSchema).min(1),
  source_kind: z.enum([
    "problem_collection",
    "formal_library",
    "proof_manifest",
    "frozen_reference",
    "sequence_database",
    "repository_local_artifact",
  ]),
  rights: rightsSchema,
  snapshot_policy: snapshotPolicySchema,
  adapter: adapterInputSchema,
  coverage: coverageDeclarationSchema,
}).strict().superRefine((value, context) => {
  const locatorIds = new Set(value.locators.map(({ locator_id }) => locator_id));
  if (locatorIds.size !== value.locators.length) {
    context.addIssue({
      code: "custom",
      path: ["locators"],
      message: "source locator IDs must be unique",
    });
  }
  for (const [index, claim] of value.attributed_claims.entries()) {
    if (!locatorIds.has(claim.basis_locator_id)) {
      context.addIssue({
        code: "custom",
        path: ["attributed_claims", index, "basis_locator_id"],
        message: "publisher or maintainer claim must cite a declared locator",
      });
    }
  }
  if (value.rights.status === "not_established") {
    if (value.rights.license_expression !== null) {
      context.addIssue({
        code: "custom",
        path: ["rights", "license_expression"],
        message: "unestablished rights cannot assert a license expression",
      });
    }
    if (value.rights.redistribution !== "reference_only") {
      context.addIssue({
        code: "custom",
        path: ["rights", "redistribution"],
        message: "unestablished rights must remain reference-only",
      });
    }
    if (!["reference_only", "content_root_only"].includes(value.snapshot_policy.mode)) {
      context.addIssue({
        code: "custom",
        path: ["snapshot_policy", "mode"],
        message: "unestablished rights cannot authorize retained source bytes",
      });
    }
  }
  if (
    value.snapshot_policy.mode === "retained_exact_bytes"
    && value.rights.redistribution !== "full_under_license"
  ) {
    context.addIssue({
      code: "custom",
      path: ["snapshot_policy", "mode"],
      message: "retained exact bytes require declared redistribution rights",
    });
  }
  if (
    value.snapshot_policy.mode === "existing_repository_bytes"
    && value.rights.status !== "repository_local"
  ) {
    context.addIssue({
      code: "custom",
      path: ["snapshot_policy", "mode"],
      message: "existing Repository bytes are valid only for Repository-local sources",
    });
  }
}).strict();

export type MathSourceDeclarationInput = z.input<typeof mathSourceDeclarationInputSchema>;
export interface MathSourceRegistryInput {
  schema: "vela.math-source-registry-declarations.v1";
  sources: MathSourceDeclarationInput[];
}

export const mathSourceDeclarationSchema = mathSourceDeclarationInputSchema.safeExtend({
  adapter: adapterSchema,
  declaration_root: hashRootSchema,
}).superRefine((value, context) => {
  const { declaration_root: _declarationRoot, ...body } = value;
  const expected = sha256(canonicalJson(body));
  if (value.declaration_root !== expected) {
    context.addIssue({
      code: "custom",
      path: ["declaration_root"],
      message: "source declaration root does not match its canonical bytes",
    });
  }
});

export const mathSourceRegistrySchema = z.object({
  schema: z.literal("vela.math-source-registry.v1"),
  sources: z.array(mathSourceDeclarationSchema).min(1),
  declaration_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  const sourceIds = new Set(value.sources.map(({ source_id }) => source_id));
  if (sourceIds.size !== value.sources.length) {
    context.addIssue({
      code: "custom",
      path: ["sources"],
      message: "Math source IDs must be unique",
    });
  }
  const { declaration_root: _declarationRoot, ...body } = value;
  const expected = sha256(canonicalJson(body));
  if (value.declaration_root !== expected) {
    context.addIssue({
      code: "custom",
      path: ["declaration_root"],
      message: "Math source registry root does not match its canonical bytes",
    });
  }
});

export type MathSourceDeclaration = z.infer<typeof mathSourceDeclarationSchema>;
export type MathSourceRegistry = z.infer<typeof mathSourceRegistrySchema>;

function buildMathSourceRegistry(input: MathSourceRegistryInput): MathSourceRegistry {
  if (input.schema !== "vela.math-source-registry-declarations.v1") {
    throw new Error("unsupported Math source declaration registry");
  }
  const sources = input.sources.map((sourceInput) => {
    const parsed = mathSourceDeclarationInputSchema.parse(sourceInput);
    const adapter = {
      ...parsed.adapter,
      adapter_root: sha256(canonicalJson(parsed.adapter)),
    };
    const body = { ...parsed, adapter };
    return mathSourceDeclarationSchema.parse({
      ...body,
      declaration_root: sha256(canonicalJson(body)),
    });
  });
  const body = { schema: "vela.math-source-registry.v1" as const, sources };
  return mathSourceRegistrySchema.parse({
    ...body,
    declaration_root: sha256(canonicalJson(body)),
  });
}

export const mathSourceRegistry = buildMathSourceRegistry(mathSourceRegistryInput);

export function mathSourceById(sourceId: string): MathSourceDeclaration {
  const source = mathSourceRegistry.sources.find(({ source_id }) => source_id === sourceId);
  if (!source) throw new Error(`unknown Math source ${sourceId}`);
  return source;
}

const nativeRevisionSchema = z.object({
  kind: z.enum(["git", "release", "observation"]),
  value: z.string().min(1),
  content_root: hashRootSchema,
  tree: z.string().regex(/^[0-9a-f]{40}$/u).nullable(),
}).strict().superRefine((value, context) => {
  if (value.kind === "git" && value.tree === null) {
    context.addIssue({
      code: "custom",
      path: ["tree"],
      message: "Git source revisions must bind an exact tree",
    });
  }
  if (value.kind !== "git" && value.tree !== null) {
    context.addIssue({
      code: "custom",
      path: ["tree"],
      message: "only Git source revisions may bind a Git tree",
    });
  }
});

const projectedCoverageSchema = z.object({
  status: z.enum(["complete", "partial", "unobserved"]),
  included: z.array(z.string().min(1)).min(1),
  native_record_count: z.number().int().nonnegative().nullable(),
  projected_record_count: z.number().int().nonnegative(),
}).strict().superRefine((value, context) => {
  if (
    value.native_record_count !== null
    && value.projected_record_count > value.native_record_count
  ) {
    context.addIssue({
      code: "custom",
      path: ["projected_record_count"],
      message: "projected count cannot exceed the declared native source count",
    });
  }
  if (
    value.status === "complete"
    && value.native_record_count !== value.projected_record_count
  ) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "complete coverage requires equal native and projected counts",
    });
  }
  if (
    value.status === "unobserved"
    && (
      value.native_record_count !== null
      || value.projected_record_count !== 0
    )
  ) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "unobserved coverage requires an unknown native count and zero projected rows",
    });
  }
});

const observationBodySchema = z.object({
  schema: z.literal("vela.math-source-observation.v1"),
  source_id: sourceIdSchema,
  observation_id: observationIdSchema,
  declaration_root: hashRootSchema,
  acquisition_root: hashRootSchema,
  observed_at: z.string().datetime({ offset: true }),
  native_revision: nativeRevisionSchema,
  snapshot_root: hashRootSchema.nullable(),
  snapshot_state: z.enum([
    "reference_only",
    "content_root_only",
    "retained_exact_bytes",
    "existing_repository_bytes",
  ]),
  projected_record_count: z.number().int().nonnegative(),
  projected_records_root: hashRootSchema,
  coverage: projectedCoverageSchema,
  omissions: z.array(omissionSchema),
}).strict();

export const mathSourceObservationSchema = observationBodySchema.extend({
  observation_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  const expectsSnapshot = ["retained_exact_bytes", "existing_repository_bytes"].includes(
    value.snapshot_state,
  );
  if (expectsSnapshot !== (value.snapshot_root !== null)) {
    context.addIssue({
      code: "custom",
      path: ["snapshot_root"],
      message: expectsSnapshot
        ? "retained source bytes require a snapshot root"
        : "reference-only observations cannot claim a retained snapshot root",
    });
  }
  if (value.projected_record_count !== value.coverage.projected_record_count) {
    context.addIssue({
      code: "custom",
      path: ["projected_record_count"],
      message: "observation and coverage projected counts disagree",
    });
  }
  const {
    observation_root: _observationRoot,
    ...body
  } = value;
  const expected = sha256(canonicalJson(body));
  if (value.observation_root !== expected) {
    context.addIssue({
      code: "custom",
      path: ["observation_root"],
      message: "observation root does not match its canonical bytes",
    });
  }
});

export type MathSourceObservation = z.infer<typeof mathSourceObservationSchema>;

/**
 * Checks an immutable observation against the declaration retained beside it.
 *
 * This is deliberately separate from the observation's structural schema:
 * older readable releases can bind an earlier declaration root after the
 * checked-in source inventory evolves.
 */
export function bindMathSourceObservationToDeclaration(
  observation: MathSourceObservation,
  declaration: MathSourceDeclaration,
): MathSourceObservation {
  if (observation.source_id !== declaration.source_id) {
    throw new Error("observation source does not match its retained declaration");
  }
  if (observation.declaration_root !== declaration.declaration_root) {
    throw new Error("observation does not bind its retained source declaration");
  }
  if (observation.snapshot_state !== declaration.snapshot_policy.mode) {
    throw new Error("observation snapshot state does not match its retained declaration");
  }
  return observation;
}

export function createMathSourceObservation(
  input: Omit<z.input<typeof observationBodySchema>, "schema" | "declaration_root">,
): MathSourceObservation {
  const source = mathSourceById(input.source_id);
  const scopedBody = observationBodySchema.parse({
    schema: "vela.math-source-observation.v1",
    ...input,
    declaration_root: source.declaration_root,
  });
  const observation = mathSourceObservationSchema.parse({
    ...scopedBody,
    observation_root: sha256(canonicalJson(scopedBody)),
  });
  return bindMathSourceObservationToDeclaration(observation, source);
}

const nativeSourceRecordBodySchema = z.object({
  schema: z.literal("vela.math-native-record.v1"),
  source_id: sourceIdSchema,
  observation_root: hashRootSchema,
  native_id: z.string().min(1),
  native_kind: z.string().min(1),
  native_revision: z.string().min(1).nullable(),
  title: z.string().min(1),
  summary: z.string().min(1).nullable(),
  locators: z.array(locatorSchema),
  metadata: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()]),
  ),
  metadata_root: hashRootSchema,
  content_root: hashRootSchema.nullable(),
  availability: z.enum(["available", "reference_only", "tombstoned", "inaccessible"]),
}).strict();

export const nativeSourceRecordSchema = nativeSourceRecordBodySchema.extend({
  row_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  if (value.availability === "available" && value.content_root === null) {
    context.addIssue({
      code: "custom",
      path: ["content_root"],
      message: "available native source records require an exact content root",
    });
  }
  if (value.metadata_root !== sha256(canonicalJson(value.metadata))) {
    context.addIssue({
      code: "custom",
      path: ["metadata_root"],
      message: "native source metadata root does not match its canonical bytes",
    });
  }
  const { row_root: _rowRoot, observation_root: _observationRoot, ...body } = value;
  const expected = sha256(canonicalJson(body));
  if (value.row_root !== expected) {
    context.addIssue({
      code: "custom",
      path: ["row_root"],
      message: "native source row root does not match its canonical bytes",
    });
  }
});

export type NativeSourceRecord = z.infer<typeof nativeSourceRecordSchema>;

export function createNativeSourceRecord(
  input: z.input<typeof nativeSourceRecordBodySchema>,
): NativeSourceRecord {
  const scopedBody = nativeSourceRecordBodySchema.parse(input);
  const { observation_root: _observationRoot, ...rootBody } = scopedBody;
  return nativeSourceRecordSchema.parse({
    ...scopedBody,
    row_root: sha256(canonicalJson(rootBody)),
  });
}

const repositorySourceBindingBodySchema = z.object({
  schema: z.literal("vela.repository-source-binding.v1"),
  release_root: hashRootSchema,
  repository_id: repositoryIdSchema,
  binding_id: bindingIdSchema,
  source_id: sourceIdSchema,
  observation_root: hashRootSchema,
  native_id: z.string().min(1).nullable(),
  native_record_root: hashRootSchema.nullable(),
  binding_kind: z.enum(["reference", "snapshot", "admission"]),
  repository_object_kind: z.string().min(1),
  repository_object_id: z.string().min(1),
  repository_object_root: hashRootSchema,
  local_standing_effect: z.enum(["none", "pending", "accepted", "rejected", "withdrawn"]),
}).strict();

export const repositorySourceBindingSchema = repositorySourceBindingBodySchema.extend({
  binding_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  if (value.native_record_root !== null && value.native_id === null) {
    context.addIssue({
      code: "custom",
      path: ["native_record_root"],
      message: "a materialized native record root requires a native ID",
    });
  }
  if (value.binding_kind !== "admission" && value.local_standing_effect !== "none") {
    context.addIssue({
      code: "custom",
      path: ["local_standing_effect"],
      message: "reference and snapshot bindings cannot create local Standing",
    });
  }
  /* The third of the table's three CHECKs, and the one that was missing.
     `schema.sql` has carried `CHECK (binding_kind <> 'snapshot' OR native_id IS
     NOT NULL)` while the two rules above had counterparts here and this one had
     none, so a snapshot naming no native record parsed, was minted a valid
     `binding_root`, and failed on INSERT inside the projection transaction —
     the refresh discovering at write time what the constructor could have said.
     A snapshot asserts bytes were retained for something; without a native ID
     there is nothing it retained them for. */
  if (value.binding_kind === "snapshot" && value.native_id === null) {
    context.addIssue({
      code: "custom",
      path: ["native_id"],
      message: "a snapshot binding requires the native ID it snapshots",
    });
  }
  const { binding_root: _bindingRoot, release_root: _releaseRoot, ...body } = value;
  const expected = sha256(canonicalJson(body));
  if (value.binding_root !== expected) {
    context.addIssue({
      code: "custom",
      path: ["binding_root"],
      message: "Repository source binding root does not match its canonical bytes",
    });
  }
});

export type RepositorySourceBinding = z.infer<typeof repositorySourceBindingSchema>;

export function createRepositorySourceBinding(
  input: z.input<typeof repositorySourceBindingBodySchema>,
): RepositorySourceBinding {
  const scopedBody = repositorySourceBindingBodySchema.parse(input);
  const { release_root: _releaseRoot, ...rootBody } = scopedBody;
  return repositorySourceBindingSchema.parse({
    ...scopedBody,
    binding_root: sha256(canonicalJson(rootBody)),
  });
}

const releaseSourceBodySchema = z.object({
  schema: z.literal("vela.math-release-source.v1"),
  release_root: hashRootSchema,
  source_id: sourceIdSchema,
  declaration_root: hashRootSchema,
  observation_root: hashRootSchema,
  native_record_count: z.number().int().nonnegative(),
  repository_binding_count: z.number().int().nonnegative(),
}).strict();

export const releaseSourceSchema = releaseSourceBodySchema.extend({
  release_source_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  const {
    release_source_root: _releaseSourceRoot,
    release_root: _releaseRoot,
    ...body
  } = value;
  const expected = sha256(canonicalJson(body));
  if (value.release_source_root !== expected) {
    context.addIssue({
      code: "custom",
      path: ["release_source_root"],
      message: "release source root does not match its canonical bytes",
    });
  }
});

export type ReleaseSource = z.infer<typeof releaseSourceSchema>;

export function createReleaseSource(
  input: z.input<typeof releaseSourceBodySchema>,
): ReleaseSource {
  const scopedBody = releaseSourceBodySchema.parse(input);
  const { release_root: _releaseRoot, ...rootBody } = scopedBody;
  return releaseSourceSchema.parse({
    ...scopedBody,
    release_source_root: sha256(canonicalJson(rootBody)),
  });
}

const observationBundleBodySchema = z.object({
  schema: z.literal("vela.math-source-observation-bundle.v1"),
  release_root: hashRootSchema,
  observations: z.array(mathSourceObservationSchema),
  native_records: z.array(nativeSourceRecordSchema),
  release_sources: z.array(releaseSourceSchema),
  repository_bindings: z.array(repositorySourceBindingSchema),
}).strict();

export const mathSourceObservationBundleSchema = observationBundleBodySchema.extend({
  observation_bundle_root: hashRootSchema,
}).strict().superRefine((value, context) => {
  const expected = observationBundleRoot(value);
  if (value.observation_bundle_root !== expected) {
    context.addIssue({
      code: "custom",
      path: ["observation_bundle_root"],
      message: "source observation bundle root does not match its canonical bytes",
    });
  }
  for (const [group, rows] of [
    ["release_sources", value.release_sources],
    ["repository_bindings", value.repository_bindings],
  ] as const) {
    for (const [index, row] of rows.entries()) {
      if (row.release_root !== value.release_root) {
        context.addIssue({
          code: "custom",
          path: [group, index, "release_root"],
          message: "source projection row belongs to another release",
        });
      }
    }
  }
  const observations = new Map(
    value.observations.map((observation) => [
      observation.observation_root,
      observation,
    ]),
  );
  if (observations.size !== value.observations.length) {
    context.addIssue({
      code: "custom",
      path: ["observations"],
      message: "source observation identities must be unique within a release",
    });
  }
  const nativeRecords = new Map(
    value.native_records.map((record) => [
      `${record.observation_root}\0${record.native_id}`,
      record,
    ]),
  );
  if (nativeRecords.size !== value.native_records.length) {
    context.addIssue({
      code: "custom",
      path: ["native_records"],
      message: "native source record identities must be unique within a release",
    });
  }
  const releaseSources = new Set(
    value.release_sources.map((source) => source.source_id),
  );
  if (releaseSources.size !== value.release_sources.length) {
    context.addIssue({
      code: "custom",
      path: ["release_sources"],
      message: "a release may bind each source only once",
    });
  }
  const bindingIds = new Set(
    value.repository_bindings.map((binding) => (
      `${binding.repository_id}\0${binding.binding_id}`
    )),
  );
  if (bindingIds.size !== value.repository_bindings.length) {
    context.addIssue({
      code: "custom",
      path: ["repository_bindings"],
      message: "Repository source binding identities must be unique within a release",
    });
  }
  for (const [index, row] of value.native_records.entries()) {
    const observation = observations.get(row.observation_root);
    if (!observation) {
      context.addIssue({
        code: "custom",
        path: ["native_records", index, "observation_root"],
        message: "native record refers to an absent observation",
      });
    } else if (observation.source_id !== row.source_id) {
      context.addIssue({
        code: "custom",
        path: ["native_records", index, "source_id"],
        message: "native record source does not match its observation",
      });
    }
  }
  for (const [group, rows] of [
    ["release_sources", value.release_sources],
    ["repository_bindings", value.repository_bindings],
  ] as const) {
    for (const [index, row] of rows.entries()) {
      if (!observations.has(row.observation_root)) {
        context.addIssue({
          code: "custom",
          path: [group, index, "observation_root"],
          message: "source projection row refers to an absent observation",
        });
      }
    }
  }
  for (const [index, binding] of value.repository_bindings.entries()) {
    if (
      binding.native_id !== null
      && binding.native_record_root !== null
    ) {
      const record = nativeRecords.get(
        `${binding.observation_root}\0${binding.native_id}`,
      );
      if (!record || record.row_root !== binding.native_record_root) {
        context.addIssue({
          code: "custom",
          path: ["repository_bindings", index, "native_record_root"],
          message: "Repository source binding refers to an absent native record",
        });
      }
    }
  }
  for (const [index, releaseSource] of value.release_sources.entries()) {
    const observation = observations.get(releaseSource.observation_root);
    if (observation && observation.source_id !== releaseSource.source_id) {
      context.addIssue({
        code: "custom",
        path: ["release_sources", index, "source_id"],
        message: "release source does not match its observation",
      });
    }
    if (
      observation
      && observation.declaration_root !== releaseSource.declaration_root
    ) {
      context.addIssue({
        code: "custom",
        path: ["release_sources", index, "declaration_root"],
        message: "release source does not match its observed declaration",
      });
    }
    const nativeCount = value.native_records.filter(
      (record) => record.observation_root === releaseSource.observation_root,
    ).length;
    const bindingCount = value.repository_bindings.filter(
      (binding) => binding.source_id === releaseSource.source_id,
    ).length;
    if (nativeCount !== releaseSource.native_record_count) {
      context.addIssue({
        code: "custom",
        path: ["release_sources", index, "native_record_count"],
        message: "release source native-record count disagrees with the bundle",
      });
    }
    if (bindingCount !== releaseSource.repository_binding_count) {
      context.addIssue({
        code: "custom",
        path: ["release_sources", index, "repository_binding_count"],
        message: "release source binding count disagrees with the bundle",
      });
    }
  }
});

export type MathSourceObservationBundle = z.infer<typeof mathSourceObservationBundleSchema>;

function withoutReleaseRoot<T extends { release_root: string }>(
  row: T,
): Omit<T, "release_root"> {
  const { release_root: _releaseRoot, ...body } = row;
  return body;
}

function observationBundleRoot(
  value: z.input<typeof observationBundleBodySchema> & { observation_bundle_root?: string },
): HashRoot {
  const {
    observation_bundle_root: _bundleRoot,
    release_root: _releaseRoot,
    ...body
  } = value;
  return sha256(canonicalJson({
    ...body,
    observations: value.observations,
    native_records: value.native_records,
    release_sources: value.release_sources.map(withoutReleaseRoot),
    repository_bindings: value.repository_bindings.map(withoutReleaseRoot),
  }));
}

export function createMathSourceObservationBundle(
  input: Omit<z.input<typeof observationBundleBodySchema>, "schema">,
): MathSourceObservationBundle {
  const body = observationBundleBodySchema.parse({
    schema: "vela.math-source-observation-bundle.v1",
    ...input,
  });
  return mathSourceObservationBundleSchema.parse({
    ...body,
    observation_bundle_root: observationBundleRoot(body),
  });
}

export const mathSourceRegistryReleaseSchema = z.object({
  schema: z.literal("vela.math-source-registry-release.v1"),
  declaration_root: hashRootSchema,
  observation_bundle_root: hashRootSchema,
  source_adapter_artifact:
    projectionSourceAdapterArtifactReferenceSchema.optional(),
  source_count: z.number().int().nonnegative(),
  observation_count: z.number().int().nonnegative(),
  native_record_count: z.number().int().nonnegative(),
  release_source_count: z.number().int().nonnegative(),
  repository_binding_count: z.number().int().nonnegative(),
}).strict();

export type MathSourceRegistryRelease = z.infer<typeof mathSourceRegistryReleaseSchema>;

export function createMathSourceRegistryRelease(
  bundle: MathSourceObservationBundle,
  sourceAdapterArtifact?: ProjectionSourceAdapterArtifactReference,
): MathSourceRegistryRelease {
  return mathSourceRegistryReleaseSchema.parse({
    schema: "vela.math-source-registry-release.v1",
    declaration_root: mathSourceRegistry.declaration_root,
    observation_bundle_root: bundle.observation_bundle_root,
    ...(sourceAdapterArtifact === undefined
      ? {}
      : { source_adapter_artifact: sourceAdapterArtifact }),
    source_count: mathSourceRegistry.sources.length,
    observation_count: bundle.observations.length,
    native_record_count: bundle.native_records.length,
    release_source_count: bundle.release_sources.length,
    repository_binding_count: bundle.repository_bindings.length,
  });
}

export function sourceDeclarationRows(): Array<{
  source_id: string;
  native_namespace: string;
  publisher_or_maintainer: string;
  locators: MathSourceDeclaration["locators"];
  attributed_claims: MathSourceDeclaration["attributed_claims"];
  source_kind: MathSourceDeclaration["source_kind"];
  license: string | null;
  access: MathSourceDeclaration["rights"]["access"];
  redistribution: MathSourceDeclaration["rights"]["redistribution"];
  snapshot_policy: MathSourceDeclaration["snapshot_policy"];
  adapter_id: string;
  adapter_root: HashRoot;
  declaration_root: HashRoot;
  declaration: MathSourceDeclaration;
}> {
  return mathSourceRegistry.sources.map((source) => ({
    source_id: source.source_id,
    native_namespace: source.native_namespace,
    publisher_or_maintainer: source.publisher_or_maintainer,
    locators: source.locators,
    attributed_claims: source.attributed_claims,
    source_kind: source.source_kind,
    license: source.rights.license_expression,
    access: source.rights.access,
    redistribution: source.rights.redistribution,
    snapshot_policy: source.snapshot_policy,
    adapter_id: source.adapter.adapter_id,
    adapter_root: source.adapter.adapter_root as HashRoot,
    declaration_root: source.declaration_root as HashRoot,
    declaration: source,
  }));
}
