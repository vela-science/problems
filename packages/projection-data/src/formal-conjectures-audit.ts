import { z } from "zod";
import formalConjecturesAuditInput from "../config/formal-conjectures-audit.v1.json";
import { canonicalJson, sha256, type HashRoot } from "./canonical";

const hashRootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u) as z.ZodType<HashRoot>;
const gitOidSchema = z.string().regex(/^[0-9a-f]{40}$/u);
const httpsUrlSchema = z.string().url().refine((value) => new URL(value).protocol === "https:", "audit locators must use HTTPS");

const checkSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["mechanical", "semantic", "proof", "metadata"]),
  property: z.string().min(1),
  outcome: z.enum(["pass", "fail", "inconclusive", "error", "unavailable"]),
  severity: z.enum(["none", "nit", "meaning"]),
  statement: z.string().min(1),
  witness: z.string(),
  conditions: z.array(z.string().min(1)),
  limitations: z.array(z.string().min(1)).min(1),
  automatic_protocol_conversion: z.literal(false),
}).strict().superRefine((check, context) => {
  if (check.outcome === "fail" && check.severity === "none") {
    context.addIssue({ code: "custom", path: ["severity"], message: "failed source checks require a stated source severity" });
  }
});

const recordSchema = z.object({
  fixture_id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  problem_ref: z.object({
    namespace: z.literal("erdos-problems"),
    problem_number: z.string().regex(/^[1-9][0-9]*$/u),
  }).strict().nullable(),
  root: hashRootSchema,
  pull_request: z.object({ number: z.number().int().positive(), url: httpsUrlSchema }).strict(),
  head: z.object({ commit_oid: gitOidSchema, tree_oid: gitOidSchema }).strict(),
  changed_paths: z.array(z.string().min(1)).min(1),
  advisory_disposition: z.enum(["clean", "nits_found", "needs_revision", "inconclusive", "unavailable"]),
  observed_pull_request_state: z.object({
    is_draft: z.boolean(),
    merge_state_status: z.string().min(1),
    review_count: z.number().int().nonnegative(),
    review_decision: z.string().min(1),
    state: z.enum(["OPEN", "CLOSED", "MERGED"]),
    updated_at: z.string().datetime({ offset: true }),
  }).strict(),
  checks: z.array(checkSchema).min(1),
  core_root: hashRootSchema,
  observation_root: hashRootSchema,
  authority_effect: z.literal("none"),
  standing_effect: z.literal("none"),
  automatic_verification: z.literal(false),
}).strict().superRefine((record, context) => {
  if (!record.pull_request.url.endsWith(`/pull/${record.pull_request.number}`)) {
    context.addIssue({ code: "custom", path: ["pull_request", "url"], message: "pull-request URL and number disagree" });
  }
  if (!record.changed_paths.every((path) => !path.startsWith("/") && !path.split("/").includes(".."))) {
    context.addIssue({ code: "custom", path: ["changed_paths"], message: "changed paths must be normalized repository-relative paths" });
  }
});

export const formalConjecturesAuditProjectionSchema = z.object({
  schema: z.literal("vela.web.fc-pr-audit-read-projection.v1"),
  authority_effect: z.literal("none"),
  standing_effect: z.literal("none"),
  source: z.object({
    source_id: z.literal("source:formal-conjectures-pr-audit"),
    repository: httpsUrlSchema,
    commit: gitOidSchema,
    tree: gitOidSchema,
    license: z.literal("Apache-2.0"),
    access: z.literal("public"),
  }).strict(),
  math_projection: z.object({
    repository: z.literal("https://github.com/vela-science/math"),
    commit: gitOidSchema,
    tree: gitOidSchema,
    path: z.literal("evidence/formal-conjectures/source-adapter/projection.v1.json"),
    git_blob_oid: gitOidSchema,
    byte_length: z.number().int().positive(),
    raw_sha256: hashRootSchema,
    projection_root: hashRootSchema,
    public_locator: httpsUrlSchema,
  }).strict(),
  interpreter: z.object({
    name: z.literal("math-fc-pr-audit-source-adapter"),
    version: z.literal("0.1.0"),
    root: hashRootSchema,
    method_root: hashRootSchema,
  }).strict(),
  conformance: z.object({
    schema: z.literal("vela.source-adapter-conformance-profile.v1"),
    profile_path: z.literal("evidence/formal-conjectures/source-adapter/conformance-profile.v1.json"),
    profile_root: hashRootSchema,
    contract_path: z.literal("methods/source-adapters/conformance.py"),
    contract_root: hashRootSchema,
    adapter_implementation_root: hashRootSchema,
    requirement_ids: z.array(z.enum([
      "complete_bounded_reads",
      "copied_or_referenced_custody",
      "deletion_tombstone_and_mutability",
      "exact_source_revision_and_drift",
      "field_and_schema_typed_roots",
      "interpreting_implementation_identity",
      "license_access_and_public_redaction",
      "reconstructibility_and_loss",
      "unsupported_schema_and_version_refusal",
    ])).length(9),
    authority_effect: z.literal("none"),
  }).strict().superRefine((conformance, context) => {
    if (new Set(conformance.requirement_ids).size !== conformance.requirement_ids.length) {
      context.addIssue({ code: "custom", path: ["requirement_ids"], message: "adapter conformance requirements must be unique" });
    }
  }),
  read_contract: z.object({
    complete: z.literal(true),
    fixture_count: z.literal(5),
    max_fixture_count: z.literal(5),
    pagination: z.literal("none_complete_closed_inventory"),
    update_detection: z.string().min(1),
  }).passthrough(),
  does_not_establish: z.array(z.string().min(1)).min(5),
  records: z.array(recordSchema).length(5),
}).strict().superRefine((projection, context) => {
  const fixtureIds = new Set(projection.records.map(({ fixture_id }) => fixture_id));
  const recordRoots = new Set(projection.records.map(({ root }) => root));
  const pullRequests = new Set(projection.records.map(({ pull_request }) => pull_request.number));
  if (fixtureIds.size !== projection.records.length || recordRoots.size !== projection.records.length || pullRequests.size !== projection.records.length) {
    context.addIssue({ code: "custom", path: ["records"], message: "audit records require unique fixture, projection-root, and pull-request identities" });
  }
  if (!projection.does_not_establish.some((value) => /Verification/u.test(value))
    || !projection.does_not_establish.some((value) => /Decision/u.test(value))
    || !projection.does_not_establish.some((value) => /Standing/u.test(value))) {
    context.addIssue({ code: "custom", path: ["does_not_establish"], message: "Verification, Decision, and Standing nonclaims are required" });
  }
});

export type FormalConjecturesAuditProjection = z.infer<typeof formalConjecturesAuditProjectionSchema>;
export type FormalConjecturesAuditRecord = FormalConjecturesAuditProjection["records"][number];

export function parseFormalConjecturesAuditProjection(input: unknown): FormalConjecturesAuditProjection {
  return formalConjecturesAuditProjectionSchema.parse(input);
}

const input: unknown = formalConjecturesAuditInput;

export const formalConjecturesAuditProjection = parseFormalConjecturesAuditProjection(input);
export const formalConjecturesAuditProjectionRoot: HashRoot = sha256(canonicalJson(formalConjecturesAuditProjection));

export function formalConjecturesAuditRecordsForProblem(input: {
  resolution_namespace: string;
  problem_number: number | string;
}): FormalConjecturesAuditRecord[] {
  const problemNumber = String(input.problem_number);
  return formalConjecturesAuditProjection.records.filter((record) => (
    record.problem_ref?.namespace === input.resolution_namespace
    && record.problem_ref.problem_number === problemNumber
  ));
}
