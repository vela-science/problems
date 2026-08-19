import { z } from "zod";
import { canonicalJson, sha256 } from "../canonical";
import { acquireBytes } from "./acquisition";
import {
  createSourceAdapterIdentity,
  createSourceNativeRecord,
} from "./contracts";
import type { SourceAdapterOutput } from "./bundle";

export const palomarRegistryAdapter = createSourceAdapterIdentity(
  "problems-data/palomar-registry",
  "1.0.0",
);

const PALOMAR_DATA_HOST = "https://data.palomar-registry.org/";

/* The pinned first ingestion target. Palomar publishes no digest and no
 * signature over the entry JSON itself, and older entries carry the current
 * schema_version, so entry files may be re-rendered; byte-immutability of the
 * version URL is Palomar's assertion, not provider-anchored. The pin below is
 * therefore consumer-computed over the exact bytes fetched on 2026-08-19, and
 * an acquisition that reads different bytes fails instead of adapting. */
export const palomarRegistryRelease = Object.freeze({
  entry_id: "PALOMAR-2026-08-19-000002",
  entry_version: 1,
  entry_locator:
    "https://data.palomar-registry.org/entries/PALOMAR-2026-08-19-000002-v1.json",
  entry_root:
    "sha256:306220a43c9696396c9f0cbb87ddb3d3352941a4b411988269386911c2492688",
});

const hexDigestSchema = z.string().regex(/^[0-9a-f]{64}$/u);
const gitCommitSchema = z.string().regex(/^[0-9a-f]{40}$/u);
const namedSchema = z.object({ name: z.string().min(1) }).passthrough();

/* Entry schema_version 3, strict on the fields the frozen public-record
 * contract preserves and passthrough for the rest, so a field Palomar adds
 * later does not break acquisition while a field it removes or reshapes does. */
const palomarEntrySchema = z.object({
  id: z.string().regex(/^PALOMAR-\d{4}-\d{2}-\d{2}-\d{6}$/u),
  version: z.number().int().positive(),
  schema_version: z.literal(3),
  status: z.literal("registered"),
  title: z.string().min(1),
  abstract: z.string().min(1),
  first_registered_on: z.string().min(1),
  registered_at: z.string().min(1),
  authors: z.array(namedSchema).min(1),
  classification: z.object({
    arxiv: z.array(z.string().min(1)),
    msc2020: z.array(z.string().min(1)),
  }).passthrough(),
  source: z.object({
    repository: z.string().min(1),
    repository_url: z.string().url(),
    commit: gitCommitSchema,
    tree_url: z.string().url(),
    license: z.object({
      declared_identifier: z.string().min(1),
      detected_identifier: z.string().min(1),
      path: z.string().min(1),
      sha256: hexDigestSchema,
    }).passthrough(),
  }).passthrough(),
  formalization: z.object({
    challenge_path: z.string().min(1),
    solution_path: z.string().min(1),
    lakefile_path: z.string().min(1),
    formalization_metadata_path: z.string().min(1),
    comparator_config_path: z.string().min(1),
    lean_toolchain: z.string().min(1),
    theorem_names: z.array(z.string().min(1)).min(1),
    definition_names: z.array(z.string().min(1)),
    permitted_axioms: z.array(z.string().min(1)),
    project_dependencies: z.array(z.object({
      name: z.string().min(1),
      repository: z.string().min(1),
      revision: gitCommitSchema,
    }).passthrough()),
  }).passthrough(),
  verification: z.object({
    challenge_sha256: hexDigestSchema,
    solution_sha256: hexDigestSchema,
    mechanical_report_sha256: hexDigestSchema,
    comparator_commit: gitCommitSchema,
    lean4export_commit: gitCommitSchema,
    nanoda_commit: gitCommitSchema,
    landrun_commit: gitCommitSchema,
    repository: z.string().min(1),
    workflow_path: z.string().min(1),
    workflow_commit: gitCommitSchema,
    workflow_url: z.string().url(),
    run_id: z.number().int().positive(),
    workflow_run_attempt: z.number().int().positive(),
    verified_at: z.string().min(1),
    evidence_path: z.string().regex(/^evidence\/[A-Za-z0-9/-]+\/$/u),
    evidence_tree_sha256: hexDigestSchema,
  }).passthrough(),
  review: z.object({
    outcome: z.string().min(1),
    policy_commit: gitCommitSchema,
    reviewed_at: z.string().min(1),
    reviewer_models: z.array(z.string().min(1)).min(1),
    warnings: z.array(z.string().min(1)),
    report: z.object({ sha256: hexDigestSchema }).passthrough(),
  }).passthrough(),
  submission: z.object({
    submission_id: z.string().min(1),
    authorization: z.object({
      relationship: z.string().min(1),
    }).passthrough(),
  }).passthrough(),
  preservation: z.object({
    archive_owner: z.string().min(1),
    archived_at: z.string().min(1),
    receipt_sha256: hexDigestSchema,
    repositories: z.array(z.object({
      source_repository: z.string().min(1),
      fork_repository: z.string().min(1),
      commit: gitCommitSchema,
      ref: z.string().min(1),
    }).passthrough()).min(1),
  }).passthrough(),
  provenance: z.object({
    repository_role: z.string().min(1),
    result_origin: z.string().min(1),
    responsible_maintainers: z.array(namedSchema),
    mathematical_sources: z.array(z.object({
      title: z.string().min(1),
      /* Present on the target entry; absent on some observed entries. */
      identifier: z.string().min(1).optional(),
      relationship: z.string().min(1),
    }).passthrough()),
    related_formalizations: z.array(z.object({
      identifier: z.string().min(1),
      relationship: z.string().min(1),
    }).passthrough()),
  }).passthrough(),
  trust: z.object({
    level: z.string().min(1),
    reasons: z.array(z.string().min(1)),
    challenge_bytes: z.number().int().positive(),
    challenge_lines: z.number().int().positive(),
    challenge_imports: z.array(z.string().min(1)),
    challenge_dependencies: z.array(z.object({
      repository: z.string().min(1),
      provenance: z.string().min(1),
    }).passthrough()),
  }).passthrough(),
  challenge_render: z.object({
    artifact_path: z.string().min(1),
    artifact_tree_sha256: hexDigestSchema,
    entrypoint: z.string().min(1),
    format: z.string().min(1),
    renderer_commit: gitCommitSchema,
    verso_commit: gitCommitSchema,
    landrun_commit: gitCommitSchema,
    rendered_at: z.string().min(1),
  }).passthrough(),
}).passthrough();

const mechanicalReportSchema = z.object({
  status: z.string().min(1),
}).passthrough();

export interface PalomarRegistryAcquisitionOptions {
  dataset: string;
  /* The versioned entry URL the retained bytes answer to, recorded even when
     the dataset is a local fixture path. */
  logicalLocator?: string;
  /* Consumer-computed sha256 root the fetched entry bytes must equal. */
  expectedEntryRoot?: string;
  mechanicalReport?: string;
  reviewReport?: string;
}

/**
 * Acquires one exact Palomar registry entry as a single rooted native record.
 *
 * Read-only toward Palomar: three HTTP GETs at most — the versioned entry and
 * its two evidence reports — no submission, no account, no mutation. The entry
 * bytes are held to a consumer-computed pinned root, and both evidence reports
 * are held to the digests inside the entry, so the whole acquisition fails
 * closed on any byte drift instead of adapting silently. Palomar-local
 * `status: "registered"` and `trust.level` remain external standing; nothing
 * here creates a Vela Verification, Decision, or Standing.
 */
export async function acquirePalomarRegistry(
  options: PalomarRegistryAcquisitionOptions,
): Promise<SourceAdapterOutput> {
  const logicalLocator = options.logicalLocator
    ?? palomarRegistryRelease.entry_locator;
  const expectedEntryRoot = options.expectedEntryRoot
    ?? palomarRegistryRelease.entry_root;
  const acquired = await acquireBytes(options.dataset, {
    inputId: "registry-entry",
    role: "published_dataset",
    mediaType: "application/json",
    manifestLocator: logicalLocator,
  });
  if (acquired.input.content_root !== expectedEntryRoot) {
    throw new Error(
      `palomar-registry entry bytes root ${acquired.input.content_root} does not match pinned root ${expectedEntryRoot}`,
    );
  }
  const entry = palomarEntrySchema.parse(
    JSON.parse(Buffer.from(acquired.bytes).toString("utf8")),
  );
  if (!logicalLocator.endsWith(`/entries/${entry.id}-v${entry.version}.json`)) {
    throw new Error(
      `palomar-registry locator ${logicalLocator} does not name entry ${entry.id} v${entry.version}`,
    );
  }

  const evidenceBase = `${PALOMAR_DATA_HOST}${entry.verification.evidence_path}`;
  const mechanicalAcquired = await acquireBytes(
    options.mechanicalReport ?? `${evidenceBase}mechanical-report.json`,
    {
      inputId: "mechanical-report",
      role: "published_dataset",
      mediaType: "application/json",
      manifestLocator: `${evidenceBase}mechanical-report.json`,
    },
  );
  if (
    mechanicalAcquired.input.content_root
    !== `sha256:${entry.verification.mechanical_report_sha256}`
  ) {
    throw new Error(
      `palomar-registry mechanical report bytes ${mechanicalAcquired.input.content_root} do not match the digest declared inside entry ${entry.id} v${entry.version}`,
    );
  }
  const reviewAcquired = await acquireBytes(
    options.reviewReport ?? `${evidenceBase}review.json`,
    {
      inputId: "review-report",
      role: "published_dataset",
      mediaType: "application/json",
      manifestLocator: `${evidenceBase}review.json`,
    },
  );
  if (
    reviewAcquired.input.content_root
    !== `sha256:${entry.review.report.sha256}`
  ) {
    throw new Error(
      `palomar-registry review report bytes ${reviewAcquired.input.content_root} do not match the digest declared inside entry ${entry.id} v${entry.version}`,
    );
  }
  const mechanical = mechanicalReportSchema.parse(
    JSON.parse(Buffer.from(mechanicalAcquired.bytes).toString("utf8")),
  );
  if (mechanical.status !== "pass") {
    throw new Error(
      `palomar-registry entry ${entry.id} v${entry.version} mechanical report status is ${mechanical.status}, not pass`,
    );
  }

  /* Flat scalars and string arrays only, per the nested-metadata rule the
     source-adapter suite enforces: an object nested under a metadata key is
     unreadable in SQL. Publisher object lists are flattened to one line each.
     `source_declared_state` is the projection's name for a state the source
     declares; it carries Palomar's own `status` so the Sources tab labels it
     as the source's, never as Vela Standing. The exact entry bytes stay bound
     by the input and revision roots regardless of this flattening. */
  const normalized = {
    id: entry.id,
    version: entry.version,
    schema_version: entry.schema_version,
    source_declared_state: entry.status,
    first_registered_on: entry.first_registered_on,
    registered_at: entry.registered_at,
    title: entry.title,
    abstract: entry.abstract,
    authors: entry.authors.map(({ name }) => name),
    classification_arxiv: entry.classification.arxiv,
    classification_msc2020: entry.classification.msc2020,
    source_repository: entry.source.repository,
    source_repository_url: entry.source.repository_url,
    source_commit: entry.source.commit,
    source_tree_url: entry.source.tree_url,
    source_license_declared: entry.source.license.declared_identifier,
    source_license_detected: entry.source.license.detected_identifier,
    source_license_path: entry.source.license.path,
    source_license_sha256: entry.source.license.sha256,
    challenge_path: entry.formalization.challenge_path,
    solution_path: entry.formalization.solution_path,
    lakefile_path: entry.formalization.lakefile_path,
    formalization_metadata_path: entry.formalization.formalization_metadata_path,
    comparator_config_path: entry.formalization.comparator_config_path,
    lean_toolchain: entry.formalization.lean_toolchain,
    theorem_names: entry.formalization.theorem_names,
    definition_names: entry.formalization.definition_names,
    permitted_axioms: entry.formalization.permitted_axioms,
    project_dependencies: entry.formalization.project_dependencies.map(
      ({ name, repository, revision }) => `${name}=${repository}@${revision}`,
    ),
    verification_challenge_sha256: entry.verification.challenge_sha256,
    verification_solution_sha256: entry.verification.solution_sha256,
    verification_mechanical_report_sha256:
      entry.verification.mechanical_report_sha256,
    verification_mechanical_status: mechanical.status,
    verification_comparator_commit: entry.verification.comparator_commit,
    verification_lean4export_commit: entry.verification.lean4export_commit,
    verification_nanoda_commit: entry.verification.nanoda_commit,
    verification_landrun_commit: entry.verification.landrun_commit,
    verification_repository: entry.verification.repository,
    verification_workflow_path: entry.verification.workflow_path,
    verification_workflow_commit: entry.verification.workflow_commit,
    verification_workflow_url: entry.verification.workflow_url,
    verification_run_id: entry.verification.run_id,
    verification_workflow_run_attempt: entry.verification.workflow_run_attempt,
    verification_verified_at: entry.verification.verified_at,
    verification_evidence_path: entry.verification.evidence_path,
    verification_evidence_tree_sha256: entry.verification.evidence_tree_sha256,
    review_outcome: entry.review.outcome,
    review_policy_commit: entry.review.policy_commit,
    review_reviewed_at: entry.review.reviewed_at,
    review_reviewer_models: entry.review.reviewer_models,
    review_warnings: entry.review.warnings,
    review_report_sha256: entry.review.report.sha256,
    submission_relationship: entry.submission.authorization.relationship,
    submission_id: entry.submission.submission_id,
    preservation_archive_owner: entry.preservation.archive_owner,
    preservation_archived_at: entry.preservation.archived_at,
    preservation_receipt_sha256: entry.preservation.receipt_sha256,
    preservation_repositories: entry.preservation.repositories.map(
      ({ source_repository, commit, fork_repository, ref }) => (
        `${source_repository}@${commit} ${fork_repository} ${ref}`
      ),
    ),
    provenance_repository_role: entry.provenance.repository_role,
    provenance_result_origin: entry.provenance.result_origin,
    provenance_responsible_maintainers:
      entry.provenance.responsible_maintainers.map(({ name }) => name),
    provenance_mathematical_sources:
      entry.provenance.mathematical_sources.map(
        ({ relationship, title, identifier }) => (identifier === undefined
          ? `${relationship}: ${title}`
          : `${relationship}: ${title} (${identifier})`),
      ),
    provenance_related_formalizations:
      entry.provenance.related_formalizations.map(
        ({ relationship, identifier }) => `${relationship}: ${identifier}`,
      ),
    trust_level: entry.trust.level,
    trust_reasons: entry.trust.reasons,
    trust_challenge_bytes: entry.trust.challenge_bytes,
    trust_challenge_lines: entry.trust.challenge_lines,
    trust_challenge_imports: entry.trust.challenge_imports,
    trust_challenge_dependencies: entry.trust.challenge_dependencies.map(
      ({ repository, provenance }) => `${repository} (${provenance})`,
    ),
    challenge_render_artifact_path: entry.challenge_render.artifact_path,
    challenge_render_artifact_tree_sha256:
      entry.challenge_render.artifact_tree_sha256,
    challenge_render_entrypoint: entry.challenge_render.entrypoint,
    challenge_render_format: entry.challenge_render.format,
    challenge_render_renderer_commit: entry.challenge_render.renderer_commit,
    challenge_render_verso_commit: entry.challenge_render.verso_commit,
    challenge_render_landrun_commit: entry.challenge_render.landrun_commit,
    challenge_render_rendered_at: entry.challenge_render.rendered_at,
  };
  const record = createSourceNativeRecord({
    schema: "vela.source-native-record.v1",
    source_id: "source:palomar-registry",
    native_id: `palomar:${entry.id}-v${entry.version}`,
    native_kind: "registry-entry",
    native_revision: acquired.input.content_root,
    title: `${entry.id} v${entry.version} · ${entry.title}`,
    summary: entry.abstract,
    source_path: null,
    locators: [
      logicalLocator,
      entry.source.tree_url,
      entry.verification.workflow_url,
    ],
    metadata: normalized,
    content_root: sha256(canonicalJson(normalized)),
  });
  return {
    source_id: "source:palomar-registry",
    adapter: palomarRegistryAdapter,
    revision: {
      kind: "snapshot",
      value: acquired.input.content_root,
      git_commit: null,
      git_tree: null,
      content_root: acquired.input.content_root,
    },
    inputs: [acquired.input, mechanicalAcquired.input, reviewAcquired.input],
    records: [record],
    coverage: {
      status: "complete",
      scope: "The one exact Palomar registry entry served at the declared versioned entry URL, with its two evidence reports re-verified against the digests inside the entry.",
      native_record_count: 1,
      emitted_record_count: 1,
      omitted_record_count: 0,
    },
    omissions: [
      {
        code: "palomar_challenge_render_not_archived",
        description: "The challenge render is retained as a locator and provider tree digest only; its bytes are not archived.",
      },
      {
        code: "palomar_evidence_tree_not_archived",
        description: "Beyond the two digest-verified reports, the evidence tree — comparator log tail, resource usage, Mathlib cache and the rest — is pinned by evidence_tree_sha256 and not archived.",
      },
    ],
    loss: [
      {
        code: "palomar_mechanical_pass_is_one_scoped_check",
        description: "Comparator, Lean-kernel, and NanoDa results are folded into Palomar's single mechanical pass and retained as one scoped external check (palomar-mechanical); Vela re-derives none of them and none is a Vela Verification.",
      },
      {
        code: "palomar_status_is_external_standing",
        description: "Palomar's registered status and trust level are Palomar-local external standing; they create no Vela Standing, Verification, acceptance, or admission.",
      },
      {
        code: "palomar_nonclaims_are_registry_level",
        description: "Palomar claims no novelty, no quality assessment, no peer review, no publication status, and no informal-proof verification; these attributed nonclaims are registry-level prose, not per-record data.",
      },
      {
        code: "palomar_review_is_llm_under_policy",
        description: "The semantic review is an LLM review under a pinned policy commit; its outcome and bounded findings are attributed observations, never adjudication.",
      },
      {
        code: "palomar_consent_is_asserted_relationship",
        description: "The submitter relationship is an asserted field; Palomar publishes no signed consent artifact.",
      },
      {
        code: "palomar_admission_process_unobservable",
        description: "Only the admission outcome — status registered with its timestamps — is observable; the registry's admission decision process is internal.",
      },
      {
        code: "palomar_version_relation_reconstructed",
        description: "Version relations are reconstructed from the shared registry ID and integer versions; Palomar publishes no supersedes or corrects field, and the reason for a new version is unobservable.",
      },
      {
        code: "palomar_entry_bytes_not_provider_signed",
        description: "Palomar publishes no digest or signature over the entry JSON; authenticity rests on TLS retrieval plus the consumer-computed retained-bytes root, and version-URL immutability is Palomar's assertion.",
      },
    ],
  };
}
