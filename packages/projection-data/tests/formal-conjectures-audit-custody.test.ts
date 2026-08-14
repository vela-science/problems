import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { formalConjecturesAuditProjection } from "../src/formal-conjectures-audit";
import { canonicalJson, sha256 } from "../src/canonical";

const repositoriesRoot = process.env.VELA_REPOSITORIES_ROOT ?? resolve(import.meta.dirname, "../../../..");
const mathRepository = join(repositoriesRoot, "math");
const hasMathRepository = existsSync(join(mathRepository, ".git"));

if (process.env.VELA_REQUIRE_PROJECTION_TESTS === "1" && !hasMathRepository) {
  throw new Error(`Formal Conjectures audit custody test requires Math at ${mathRepository}`);
}

const describeCustody = hasMathRepository ? describe : describe.skip;

function git(...args: string[]): Buffer {
  return execFileSync("git", ["-C", mathRepository, ...args], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
}

describeCustody("Formal Conjectures audit exact Math custody", () => {
  test("re-reads the exact public Math projection and matches every displayed source axis", () => {
    const custody = formalConjecturesAuditProjection.math_projection;
    expect(git("rev-parse", `${custody.commit}^{tree}`).toString().trim()).toBe(custody.tree);
    expect(git("ls-tree", custody.commit, "--", custody.path).toString())
      .toBe(`100644 blob ${custody.git_blob_oid}\t${custody.path}\n`);
    const bytes = git("show", `${custody.commit}:${custody.path}`);
    expect(bytes.byteLength).toBe(custody.byte_length);
    expect(`sha256:${createHash("sha256").update(bytes).digest("hex")}`).toBe(custody.raw_sha256);

    const source = JSON.parse(bytes.toString("utf8"));
    expect(source.root).toEqual({ domain: "projection", value: custody.projection_root });
    expect(source.source).toMatchObject(formalConjecturesAuditProjection.source);
    expect(source.interpreter).toMatchObject({
      name: formalConjecturesAuditProjection.interpreter.name,
      version: formalConjecturesAuditProjection.interpreter.version,
      root: { domain: "artifact", value: formalConjecturesAuditProjection.interpreter.root },
      method_root: { domain: "artifact", value: formalConjecturesAuditProjection.interpreter.method_root },
    });
    expect(source.conformance).toEqual({
      schema: formalConjecturesAuditProjection.conformance.schema,
      profile_path: formalConjecturesAuditProjection.conformance.profile_path,
      profile_root: { domain: "artifact", value: formalConjecturesAuditProjection.conformance.profile_root },
      contract_path: formalConjecturesAuditProjection.conformance.contract_path,
      contract_root: { domain: "artifact", value: formalConjecturesAuditProjection.conformance.contract_root },
      authority_effect: "none",
    });
    const profileBytes = git("show", `${custody.commit}:${formalConjecturesAuditProjection.conformance.profile_path}`);
    const profile = JSON.parse(profileBytes.toString("utf8"));
    const { profile_root: _profileRoot, ...profileBody } = profile;
    expect(profile.profile_root).toBe(sha256(canonicalJson(profileBody)));
    expect(profile.profile_root).toBe(formalConjecturesAuditProjection.conformance.profile_root);
    expect(profile.authority_effect).toBe("none");
    expect(Object.keys(profile.requirement_evidence).sort())
      .toEqual(formalConjecturesAuditProjection.conformance.requirement_ids);
    const contractBytes = git("show", `${custody.commit}:${formalConjecturesAuditProjection.conformance.contract_path}`);
    expect(`sha256:${createHash("sha256").update(contractBytes).digest("hex")}`)
      .toBe(formalConjecturesAuditProjection.conformance.contract_root);
    const implementationBytes = git("show", `${custody.commit}:${profile.adapter.implementation_path}`);
    expect(`sha256:${createHash("sha256").update(implementationBytes).digest("hex")}`)
      .toBe(formalConjecturesAuditProjection.conformance.adapter_implementation_root);
    expect(source.records).toHaveLength(5);

    for (const projected of formalConjecturesAuditProjection.records) {
      const retained = source.records.find((record: any) => record.fixture_id === projected.fixture_id);
      expect(retained).toBeDefined();
      expect(retained.root).toEqual({ domain: "projection", value: projected.root });
      expect(retained.native_identity.pull_request).toEqual(projected.pull_request);
      expect(retained.native_identity.head).toEqual(projected.head);
      expect(retained.native_identity.changes.map(({ path }: { path: string }) => path)).toEqual(projected.changed_paths);
      expect(retained.source_axis.advisory_disposition).toBe(projected.advisory_disposition);
      expect(retained.source_axis.observed_pull_request_state).toEqual(projected.observed_pull_request_state);
      expect(retained.source_axis.checks.map((check: any) => ({
        id: check.id,
        kind: check.kind,
        property: check.property,
        outcome: check.outcome,
        severity: check.severity,
        statement: check.evidence[0].statement,
        witness: check.evidence[0].witness,
        conditions: check.conditions.map(({ statement }: { statement: string }) => statement),
        limitations: check.limitations,
        automatic_protocol_conversion: check.protocol_conversion.automatic,
      }))).toEqual(projected.checks);
      expect(retained.source_records.core.record_root.value).toBe(projected.core_root);
      expect(retained.source_records.observation.record_root.value).toBe(projected.observation_root);
      expect(retained).toMatchObject({ authority_effect: "none", standing_effect: "none", automatic_verification: false });
    }
  });
});
