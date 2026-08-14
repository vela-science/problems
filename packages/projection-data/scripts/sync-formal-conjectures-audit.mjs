#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUTPUT_PATH = new URL("../config/formal-conjectures-audit.v1.json", import.meta.url);
const PROJECTION_PATH = "evidence/formal-conjectures/source-adapter/projection.v1.json";
const REQUIRED_CONFORMANCE = [
  "complete_bounded_reads",
  "copied_or_referenced_custody",
  "deletion_tombstone_and_mutability",
  "exact_source_revision_and_drift",
  "field_and_schema_typed_roots",
  "interpreting_implementation_identity",
  "license_access_and_public_redaction",
  "reconstructibility_and_loss",
  "unsupported_schema_and_version_refusal",
];
const PROBLEM_REFS = new Map([
  ["conditional-erdos-427-4884", { namespace: "erdos-problems", problem_number: "427" }],
  ["fidelity-erdos-887-1237", { namespace: "erdos-problems", problem_number: "887" }],
  ["vacuity-erdos-80-4830", { namespace: "erdos-problems", problem_number: "80" }],
]);

function fail(message) {
  throw new Error(message);
}

function git(repository, ...args) {
  return execFileSync("git", ["-C", repository, ...args], {
    encoding: args[0] === "show" ? "buffer" : "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function withoutField(value, field) {
  const result = structuredClone(value);
  delete result[field];
  return result;
}

function parseCanonical(raw, label) {
  const value = JSON.parse(raw.toString("utf8"));
  if (raw.toString("utf8") !== `${canonicalJson(value)}\n`) fail(`${label} canonical framing drift`);
  return value;
}

function exactKeys(value, expected, label) {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    fail(`${label} field inventory drift`);
  }
}

function projectCheck(check) {
  if (!Array.isArray(check.evidence) || check.evidence.length !== 1) {
    fail(`source check ${check.id} must expose exactly one Web evidence statement`);
  }
  const evidence = check.evidence[0];
  if (check.protocol_conversion?.automatic !== false || check.protocol_conversion?.outcome !== null) {
    fail(`source check ${check.id} attempts protocol conversion`);
  }
  return {
    id: check.id,
    kind: check.kind,
    property: check.property,
    outcome: check.outcome,
    severity: check.severity,
    statement: evidence.statement,
    witness: evidence.witness,
    conditions: check.conditions.map((condition) => (
      typeof condition === "string" ? condition : condition.statement
    )),
    limitations: check.limitations,
    automatic_protocol_conversion: false,
  };
}

function projectRecord(record) {
  if (record.authority_effect !== "none" || record.standing_effect !== "none" || record.automatic_verification !== false) {
    fail(`source record ${record.fixture_id} carries authority`);
  }
  const problemRef = PROBLEM_REFS.get(record.fixture_id) ?? null;
  return {
    fixture_id: record.fixture_id,
    problem_ref: problemRef,
    root: record.root.value,
    pull_request: record.native_identity.pull_request,
    head: record.native_identity.head,
    changed_paths: record.native_identity.changes.map(({ path }) => path),
    advisory_disposition: record.source_axis.advisory_disposition,
    observed_pull_request_state: record.source_axis.observed_pull_request_state,
    checks: record.source_axis.checks.map(projectCheck),
    core_root: record.source_records.core.record_root.value,
    observation_root: record.source_records.observation.record_root.value,
    authority_effect: "none",
    standing_effect: "none",
    automatic_verification: false,
  };
}

function build(repository) {
  const status = git(repository, "status", "--porcelain=v1").trim();
  if (status) fail("Math worktree must be clean before Web projection sync");
  execFileSync("python3", ["-B", "evidence/formal-conjectures/source-adapter/build.py", "--check"], {
    cwd: repository,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const commit = git(repository, "rev-parse", "HEAD").trim();
  const tree = git(repository, "rev-parse", "HEAD^{tree}").trim();
  const projectionRaw = git(repository, "show", `${commit}:${PROJECTION_PATH}`);
  const projection = parseCanonical(projectionRaw, "Math FC projection");
  if (projection.schema !== "vela.math.fc-pr-audit-projection.v1") fail("unsupported Math FC projection schema");
  if (projection.authority_effect !== "none") fail("Math FC projection cannot carry authority");
  if (projection.root?.domain !== "projection"
    || projection.root.value !== sha256(canonicalJson(withoutField(projection, "root")))) {
    fail("Math FC projection root drift");
  }

  exactKeys(projection.conformance, [
    "schema", "profile_path", "profile_root", "contract_path", "contract_root", "authority_effect",
  ], "Math FC conformance descriptor");
  if (projection.conformance.authority_effect !== "none") fail("adapter conformance cannot carry authority");
  const profileRaw = git(repository, "show", `${commit}:${projection.conformance.profile_path}`);
  const profile = parseCanonical(profileRaw, "source-adapter conformance profile");
  if (profile.schema !== "vela.source-adapter-conformance-profile.v1" || profile.authority_effect !== "none") {
    fail("unsupported or authoritative source-adapter conformance profile");
  }
  if (profile.profile_root !== sha256(canonicalJson(withoutField(profile, "profile_root")))) {
    fail("source-adapter conformance profile root drift");
  }
  if (projection.conformance.profile_root?.domain !== "artifact"
    || projection.conformance.profile_root.value !== profile.profile_root) {
    fail("Math projection conformance profile binding drift");
  }
  const requirements = Object.keys(profile.requirement_evidence).sort();
  if (JSON.stringify(requirements) !== JSON.stringify(REQUIRED_CONFORMANCE)) {
    fail("source-adapter conformance requirement inventory drift");
  }
  const contractRaw = git(repository, "show", `${commit}:${projection.conformance.contract_path}`);
  if (projection.conformance.contract_root?.domain !== "artifact"
    || projection.conformance.contract_root.value !== sha256(contractRaw)) {
    fail("Math projection conformance contract binding drift");
  }
  const implementationRaw = git(repository, "show", `${commit}:${profile.adapter.implementation_path}`);
  if (profile.adapter.implementation_root !== sha256(implementationRaw)) {
    fail("Math adapter implementation binding drift");
  }

  const gitBlobOid = git(repository, "rev-parse", `${commit}:${PROJECTION_PATH}`).trim();
  return {
    schema: "vela.web.fc-pr-audit-read-projection.v1",
    authority_effect: "none",
    standing_effect: "none",
    source: {
      source_id: projection.source.source_id,
      repository: projection.source.repository,
      commit: projection.source.commit,
      tree: projection.source.tree,
      license: projection.source.license,
      access: projection.source.access,
    },
    math_projection: {
      repository: "https://github.com/vela-science/math",
      commit,
      tree,
      path: PROJECTION_PATH,
      git_blob_oid: gitBlobOid,
      byte_length: projectionRaw.byteLength,
      raw_sha256: sha256(projectionRaw),
      projection_root: projection.root.value,
      public_locator: `https://github.com/vela-science/math/blob/${commit}/${PROJECTION_PATH}`,
    },
    interpreter: {
      name: projection.interpreter.name,
      version: projection.interpreter.version,
      root: projection.interpreter.root.value,
      method_root: projection.interpreter.method_root.value,
    },
    conformance: {
      schema: profile.schema,
      profile_path: projection.conformance.profile_path,
      profile_root: profile.profile_root,
      contract_path: projection.conformance.contract_path,
      contract_root: projection.conformance.contract_root.value,
      adapter_implementation_root: profile.adapter.implementation_root,
      requirement_ids: requirements,
      authority_effect: "none",
    },
    read_contract: projection.read_contract,
    does_not_establish: projection.does_not_establish,
    records: projection.records.map(projectRecord),
  };
}

const argumentsList = process.argv.slice(2);
const repositoryIndex = argumentsList.indexOf("--math-repository");
if (repositoryIndex < 0 || !argumentsList[repositoryIndex + 1]) {
  fail("usage: sync-formal-conjectures-audit.mjs --math-repository PATH [--check]");
}
const repository = resolve(argumentsList[repositoryIndex + 1]);
const output = `${canonicalJson(build(repository))}\n`;
if (argumentsList.includes("--check")) {
  if (readFileSync(OUTPUT_PATH, "utf8") !== output) fail("Formal Conjectures Web projection is stale");
} else {
  writeFileSync(OUTPUT_PATH, output);
}
