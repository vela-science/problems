import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import {
  projectSemanticCorrection,
  semanticCorrectionPackages,
  verifySemanticCorrection,
} from "./support/semantic-correction";

const ECOSYSTEM = resolve(
  process.env.VELA_ECOSYSTEM_REPO
    ?? join(import.meta.dir, "../../../..", "vela"),
);
const PACKAGES = join(ECOSYSTEM, "research", "semantic-packages", "packages");
const PACKAGE_ROOT_DOMAIN = Buffer.from("vela.semantic-package-root.v1\0");
const exactSourcesAvailable = existsSync(
  join(PACKAGES, "core", "package.lock.json"),
);
const exactSourceTest = exactSourcesAvailable ? test : test.skip;

function conformanceInput() {
  const fixture = {
    case_id: "erdos-1056-bounded-search-rejection",
    frontier_id: "vfr_0a25edabc16db143",
    post: {
      git_commit: "55fc6fedbfe0aaad4b20225bc2ca4b5ba172adf2",
      git_tree: "ba5e221942c68087720e40984e89cbf31048ff77",
    },
    pre: {
      git_commit: "c7da9e601c2adc9b7eadd274885c7dc9af2d4c21",
      git_tree: "5e4fa9869cd32b9ffe92813d6908fc5639c4fee6",
    },
    relations: [
      {
        consequence_tier: "organization",
        evidence_roots: [
          "sha256:517c16cc9c59d7f91aeaea4287e0ce49000c7545199e86ea632c0a2e91faf30b",
          "sha256:6ba51c79bf2b64d42ac44a13539478daf2b5d8b84ea04b0a43c989dafbf3e72b",
        ],
        kind: "claim_scoped_to_problem",
        source_id:
          "vcl_9a6227f8cb047cf3a52864115f6fd5d4e855910f803e4b413dabb5ce05be8488",
        target_id: "erdos:1056",
      },
      {
        consequence_tier: "organization",
        evidence_roots: [
          "sha256:a299a860c77d8bd9fd923dacda569606c00f8a4736ee35cbce4a560f829cb643",
          "sha256:f7cc30f6415fd8bf43590d381eb0fd3f2ea73d43a6450c7df5007b493b378de0",
        ],
        kind: "verification_checks_submission",
        source_id: "vvr_13c9380d1182d804",
        target_id: "vsb_ce7f0f4d4b6a4c40",
      },
      {
        consequence_tier: "organization",
        evidence_roots: [
          "sha256:26214fd73268b7cece402f8cf62b2bf63d104d45d2c2c86bf99d6d7c71599b88",
          "sha256:6ba51c79bf2b64d42ac44a13539478daf2b5d8b84ea04b0a43c989dafbf3e72b",
        ],
        kind: "proposal_requests_claim",
        source_id: "vpr_533385002e7c3ac9",
        target_id:
          "vcl_9a6227f8cb047cf3a52864115f6fd5d4e855910f803e4b413dabb5ce05be8488",
      },
      {
        consequence_tier: "organization",
        evidence_roots: [
          "sha256:684f1ef228aef4178ac2dbf1cd8b766937ac2a87e1f56cd5cae96a6e2bc88c28",
          "sha256:9a15f981ddbe7f9c0aab410582b1db3c126cf559cfc44f6faac610d0d63a88fe",
        ],
        kind: "decision_changes_proposal_standing",
        source_id: "vev_697a0eab7e201725",
        target_id: "vpr_533385002e7c3ac9",
      },
    ],
    schema: "vela.erdos-correction-vector.v2",
    source_objects: [
      "problem_packet",
      "claim",
      "proposal",
      "submission",
      "verification",
      "bounded_result",
      "repository_before",
      "repository_after",
      "decision_event",
      "authority_record",
    ].map((role) => ({ role })),
    standing: {
      claim: "rejected",
      independence: "disclosed_shared_dependencies",
      method_integrity: "frozen_replay_passed",
      scientific_acceptance: "not_accepted",
      scope_fidelity: "bounded",
      verification: "passed",
    },
  };
  const rule = (
    source_relation_kind: string,
    target_relation_kind: string,
    projected_observation: string,
    required_evidence_roles: string[],
    does_not_establish: string[],
    standing_effect: "none" | "observe_repository_decision" = "none",
  ) => ({
    consequence_tier: "organization",
    does_not_establish,
    frontier_algebra_atom: null,
    projected_observation,
    required_evidence_roles,
    source_relation_kind,
    standing_effect,
    target_relation_kind,
  });
  const mapping = {
    correction_projection: {
      accepted_claim_delta: 0,
      after: "rejected",
      before: "pending_review",
      repair_requirements: [
        "corrected_bounded_claim_wording",
        "retained_verification_scope",
        "explicit_non_acceptance_caveat",
      ],
      retains_rejected_evidence: true,
    },
    rules: [
      rule(
        "claim_scoped_to_problem",
        "vela.erdos:bounded-claim-for-problem",
        "bounded_claim_scope",
        ["problem_packet", "claim"],
        ["problem_solution", "scientific_acceptance"],
      ),
      rule(
        "verification_checks_submission",
        "vela.erdos:verification-checks-submission",
        "authenticated_verification_scope",
        ["submission", "verification"],
        [
          "full_independence",
          "logical_transport",
          "scientific_acceptance",
        ],
      ),
      rule(
        "proposal_requests_claim",
        "vela.erdos:proposal-requests-claim",
        "proposal_subject_binding",
        ["claim", "proposal"],
        ["claim_truth", "scientific_acceptance"],
      ),
      rule(
        "decision_changes_proposal_standing",
        "vela.erdos:decision-records-proposal-standing",
        "repository_authority_standing_transition",
        [
          "authority_record",
          "decision_event",
          "repository_after",
          "repository_before",
        ],
        ["claim_truth", "scientific_acceptance"],
        "observe_repository_decision",
      ),
    ],
    schema: "vela.semantic-mapping.v1",
    source_package: {
      package_id: "vela.erdos",
      package_root: semanticCorrectionPackages.erdos_root,
      package_version: "0.0.2",
    },
    target_contract: "vela.erdos-correction-projection.v2",
  };
  return { fixture, mapping };
}

async function files(directory: string, current = directory): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) result.push(...await files(directory, absolute));
    else if (entry.isFile() && entry.name !== "package.lock.json") {
      result.push(relative(directory, absolute).split("\\").join("/"));
    }
  }
  return result.sort();
}

function canonicalJson(value: unknown): string {
  if (
    value === null
    || typeof value === "boolean"
    || typeof value === "string"
    || typeof value === "number"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`,
  ).join(",")}}`;
}

async function verifyPackage(
  name: string,
  expectedRoot: string,
): Promise<Record<string, unknown>> {
  const directory = join(PACKAGES, name);
  const lock = await Bun.file(join(directory, "package.lock.json")).json();
  const inventory = await files(directory);
  expect(inventory).toEqual(lock.files.map(({ path }: { path: string }) => path));
  for (const entry of lock.files as {
    bytes: number;
    path: string;
    sha256: string;
  }[]) {
    const bytes = await readFile(join(directory, entry.path));
    expect(bytes.byteLength).toBe(entry.bytes);
    expect(`sha256:${createHash("sha256").update(bytes).digest("hex")}`).toBe(
      entry.sha256,
    );
  }
  const preimage = {
    canonicalization: "vela.canonical-json.v1",
    files: lock.files,
    schema: "vela.semantic-package-root.v1",
  };
  const hash = createHash("sha256");
  hash.update(PACKAGE_ROOT_DOMAIN);
  hash.update(canonicalJson(preimage));
  expect(`sha256:${hash.digest("hex")}`).toBe(expectedRoot);
  expect(lock.package_root).toBe(expectedRoot);
  return lock;
}

async function git(...args: string[]): Promise<string> {
  const process = Bun.spawn(["git", "-C", ECOSYSTEM, ...args], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exit !== 0) throw new Error(`git ${args.join(" ")}: ${stderr}`);
  return stdout.trim();
}

describe("package-backed Problems correction projection", () => {
  test("agrees with Frontier Algebra on the typed conformance vector", () => {
    const { fixture, mapping } = conformanceInput();
    const projection = projectSemanticCorrection(fixture, mapping);
    verifySemanticCorrection(projection);

    expect(projection.projection_root).toBe(
      "sha256:2276fbe1ffaaa56a9cf547aa7201effedd6833c7462191a3079a9c3c7b568eb6",
    );
    expect(projection.package_identity).toEqual(semanticCorrectionPackages);
    expect(projection.frontier_algebra.atom_count).toBe(0);
    expect(projection.authority_effect).toBe("none");
    expect(projection.correction).toEqual({
      accepted_claim_delta: 0,
      after: "rejected",
      before: "pending_review",
      retains_rejected_evidence: true,
    });
    expect(
      projection.relations.every(
        (relation) =>
          relation.consequence_tier === "organization"
          && relation.frontier_algebra_atom === null,
      ),
    ).toBe(true);
  });

  exactSourceTest(
    "rederives exact source package roots when the ecosystem checkout is available",
    async () => {
      await verifyPackage("core", semanticCorrectionPackages.core_root);
      await verifyPackage("erdos", semanticCorrectionPackages.erdos_root);
      await verifyPackage(
        "erdos-correction-mapping",
        semanticCorrectionPackages.mapping_root,
      );
      expect(
        await git(
          "rev-parse",
          `${semanticCorrectionPackages.mapping_commit}:research/semantic-packages/packages/erdos-correction-mapping`,
        ),
      ).toBe(semanticCorrectionPackages.mapping_tree);

      const fixture = await Bun.file(
        join(PACKAGES, "erdos", "fixtures", "erdos-1056-rejection.json"),
      ).json();
      const mapping = await Bun.file(
        join(
          PACKAGES,
          "erdos-correction-mapping",
          "mapping",
          "erdos-1056.mapping.json",
        ),
      ).json();
      const projection = projectSemanticCorrection(fixture, mapping);
      verifySemanticCorrection(projection);

      expect(projection.projection_root).toBe(
        "sha256:2276fbe1ffaaa56a9cf547aa7201effedd6833c7462191a3079a9c3c7b568eb6",
      );
    },
  );

  test("fails closed on assurance or standing promotion", () => {
    const { fixture, mapping } = conformanceInput();

    mapping.rules[1].consequence_tier = "logical_transport";
    expect(() => projectSemanticCorrection(fixture, mapping)).toThrow(
      "attempted assurance or standing transport",
    );

    mapping.rules[1].consequence_tier = "organization";
    const projection = projectSemanticCorrection(fixture, mapping);
    const tampered = {
      ...projection,
      authority_effect: "accept",
    };
    expect(() =>
      verifySemanticCorrection(
        tampered as unknown as typeof projection,
      )).toThrow("projection root mismatch");
  });
});
